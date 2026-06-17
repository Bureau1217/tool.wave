import { join, extname, basename } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";

const mdFile = Deno.args[0];
if (!mdFile) {
  console.error("Usage: deno run --allow-net --allow-read --allow-write scrape-event.ts <file.md> [output-dir]");
  Deno.exit(1);
}

const outputDir = Deno.args[1] ?? "output";
await ensureDir(outputDir);

// --- Extract all URLs with a file extension from the markdown ---
const mdContent = await Deno.readTextFile(mdFile);

const URL_RE = /(https?:\/\/[^\s)\]"']+\.[a-zA-Z0-9]{1,8})/g;

// Collect unique URLs and the first line index where each appears
const urlLines = new Map<string, number>(); // url -> line index
const lines = mdContent.split("\n");

for (let i = 0; i < lines.length; i++) {
  for (const match of lines[i].matchAll(URL_RE)) {
    const cleaned = match[1].replace(/[)\]"'>]+$/, "");
    try {
      const u = new URL(cleaned);
      if (extname(u.pathname) && !urlLines.has(cleaned)) {
        urlLines.set(cleaned, i);
      }
    } catch {
      // not a valid URL
    }
  }
}

if (urlLines.size === 0) {
  console.log("No file URLs found in the markdown.");
  Deno.exit(0);
}

console.log(`Found ${urlLines.size} file URL(s) in ${mdFile}\n`);

// --- Download each file and collect results ---
const insertions = new Map<number, string>(); // line index -> local link to insert after
const results: { url: string; file: string; status: string }[] = [];

for (const [url, lineIdx] of urlLines) {
  const u = new URL(url);
  const name = basename(u.pathname);
  const dest = join(outputDir, name);

  process: {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Deno/2.8)" },
      });
    } catch (e) {
      console.warn(`  FAIL  ${url}\n        ${e}`);
      results.push({ url, file: dest, status: `error: ${e}` });
      break process;
    }

    if (!res.ok) {
      console.warn(`  SKIP  ${url} (HTTP ${res.status})`);
      results.push({ url, file: dest, status: `http-${res.status}` });
      break process;
    }

    const data = new Uint8Array(await res.arrayBuffer());
    await Deno.writeFile(dest, data);
    console.log(`  OK    ${dest}  (${(data.byteLength / 1024).toFixed(1)} KB)`);
    results.push({ url, file: dest, status: "ok" });

    // Queue the local link insertion after the source line
    insertions.set(lineIdx, `[${name}](./${join(outputDir, name)})`);
  }
}

// --- Patch the markdown: insert local links after their source lines ---
// Process from bottom to top so line indices stay valid
const sortedInsertions = [...insertions.entries()].sort((a, b) => b[0] - a[0]);
for (const [lineIdx, link] of sortedInsertions) {
  lines.splice(lineIdx + 1, 0, link);
}
await Deno.writeTextFile(mdFile, lines.join("\n"));
console.log(`\nMarkdown updated: ${insertions.size} link(s) inserted → ${mdFile}`);

// --- Summary ---
const ok = results.filter(r => r.status === "ok").length;
const summary = {
  source: mdFile,
  downloadedAt: new Date().toISOString(),
  total: results.length,
  succeeded: ok,
  failed: results.length - ok,
  files: results,
};
const summaryPath = join(outputDir, "summary.json");
await Deno.writeTextFile(summaryPath, JSON.stringify(summary, null, 2));
console.log(`Done. ${ok}/${results.length} file(s) downloaded → ${outputDir}`);
console.log(`Summary → ${summaryPath}`);
