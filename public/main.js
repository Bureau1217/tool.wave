// ---------- état ----------
const S = {
  density:60, bpm:120, amp:40, turb:25, weight:2,
  sources:1, genre:'sound',
  bgc:'#0c0c0c', accent:'#c6ff3a', invited:'#ff2d8b', scheme:'acid',
  format:'poster', scale:2,
  title:'SAISON 26—27', sub:'FRÉQUENCES COMMUNES',
  tags:'LIVE · SOUND SYSTEM · ARTS VIVANTS', date:'LE GROOVE — GENÈVE / JONCTION',
  place:'source', treat:'duo', imgscale:100, imgy:0, imgopacity:90,
  wave:'lines', typesize:1.3, typefx:'plein', dither:'none', ditherpx:3,
  gridc:1, gridr:1, cellshape:'rect', cells:[]
};

// image de l'artiste (1 image = 1 event)
const ART = { raw:null, processed:null, dirty:true };

const PRESETS = [
  'images/2021-Press-Shot-3-1536x1024.jpg',
  'images/Capture-decran-2024-08-12-a-15.26.57.png',
  'images/Capture-decran-2024-08-12-a-15.43.04.png'
];

const FORMATS = {
  poster:{w:595, h:842},   // A3 ratio
  insta :{w:720, h:720},
  story :{w:540, h:960}
};

// palettes colorimétriques — { fond, couleur A, couleur B }
const SCHEMES = {
  acid:   {bg:'#0c0c0c', a:'#c6ff3a', b:'#ff2d8b'},
  cyber:  {bg:'#04060f', a:'#19b3ff', b:'#9d4dff'},
  sunset: {bg:'#1a0a24', a:'#ff5e3a', b:'#ffd400'},
  rave:   {bg:'#0a0a0a', a:'#39ff14', b:'#ff00a0'},
  pop:    {bg:'#fff0d6', a:'#ff2d8b', b:'#1956ff'},
  solar:  {bg:'#fffbe6', a:'#ff6a00', b:'#d10070'},
  ink:    {bg:'#f3efe7', a:'#161616', b:'#a8462f'},
};
// fond sombre ou clair ? (luminance perçue)
function isDark(hex){ const c = color(hex); return (0.299*red(c) + 0.587*green(c) + 0.114*blue(c)) < 128; }
// couleur le long du dégradé A → B  (f : 0..1)
function colAt(f){ return lerpColor(color(S.accent), color(S.invited), f<0?0:f>1?1:f); }

// ---------- sketch p5 ----------
let cnv;
function setup(){
  const f = FORMATS[S.format];
  cnv = createCanvas(f.w, f.h);
  cnv.parent('canvas-wrap');
  pixelDensity(1);
  frameRate(48);
}

function rebuildCanvas(){
  const f = FORMATS[S.format];
  resizeCanvas(f.w, f.h);
}

function draw(){
  background(S.bgc);

  if(ART.dirty){ processArt(); buildLum(); }
  const grid = (S.gridc > 1 || S.gridr > 1);

  if(S.wave === 'rings'){
    // anneaux concentriques + placement photo (comportement d'origine)
    const hasImg = !!ART.processed && S.place !== 'none';
    if(hasImg && S.place === 'full'){
      drawArt(); drawField(true); drawScrim();
    } else if(hasImg && S.place === 'band'){
      drawArtBand(); drawField(false);
    } else if(hasImg && S.place === 'source'){
      drawField(false); drawArtSource();
    } else {
      drawField(false);
    }
  } else {
    // styles génératifs : on dessine le motif, puis la photo lisible par-dessus
    if(S.wave === 'warp')        drawWarp();
    else if(S.wave === 'dots')   drawDotsField();
    else if(S.wave === 'radial') drawRadial();
    else if(S.wave === 'text')   drawText();
    else                         drawLines();
    if(!grid && ART.processed && S.place !== 'none') drawPhoto();
  }

  if(grid) applyGrid();   // découpe l'affiche en cases (motif / photo / aplat)

  drawType();

  if(S.dither !== 'none') applyDither();   // tramage rétro de l'affiche entière
}

// ---------- champ d'ondes ----------
function genreParams(){
  switch(S.genre){
    case 'sound':  return {spacing:1.6, speed:.35, wobble:1.0, jitter:.4};
    case 'techno': return {spacing:0.55, speed:1.4, wobble:0.4, jitter:.15};
    case 'live':   return {spacing:1.0, speed:.7,  wobble:1.4, jitter:.9};
    case 'scene':  return {spacing:2.0, speed:.5,  wobble:1.2, jitter:.6};
  }
}

function drawField(overlay){
  if(overlay) blendMode(SCREEN);   // sur une photo, les traits deviennent lumineux
  const t = millis()/1000;
  const gp = genreParams();
  const beat = S.bpm/60;                 // pulsations/sec
  const pulse = (Math.sin(t * beat * gp.speed * Math.PI) + 1)/2; // 0..1

  // sources de propagation
  const srcs = [];
  if(S.sources === 1){
    srcs.push({x:width/2, y:height*0.46});
  } else {
    srcs.push({x:width*0.30, y:height*0.40});
    srcs.push({x:width*0.70, y:height*0.56});
  }

  const ringCount = S.density;
  const baseStep = (Math.max(width,height) / ringCount) * gp.spacing;

  noFill();
  for(let s=0; s<srcs.length; s++){
    const c = srcs[s];
    for(let i=1; i<=ringCount; i++){
      const r = i * baseStep + pulse * S.amp * 0.4;
      if(r > Math.max(width,height)*1.4) break;
      // dégradé couleur A → B le long du rayon (inversé pour la 2e source)
      const f = i / ringCount;
      stroke(colAt(s === 0 ? f : 1 - f));
      strokeWeight(S.weight * (i % 7 === 0 ? 1.6 : 1));

      beginShape();
      const segs = 80;
      for(let a=0; a<=segs; a++){
        const ang = (a/segs) * TWO_PI;
        const n = noise(
          Math.cos(ang)*0.9 + s*10,
          Math.sin(ang)*0.9 + i*0.05,
          t*0.15*gp.speed
        );
        const def = (n - 0.5) * S.turb * gp.wobble
                  + Math.sin(ang*3 + t*beat*gp.speed) * S.amp * 0.15 * gp.wobble
                  + (Math.random()-0.5) * gp.jitter * 0;  // jitter géré par noise
        const rr = r + def;
        vertex(c.x + Math.cos(ang)*rr, c.y + Math.sin(ang)*rr);
      }
      endShape(CLOSE);
    }
  }
  if(overlay) blendMode(BLEND);
}

// ---------- lignes-fréquence : l'image module des lignes d'onde ----------
// carte de luminance basse-déf de l'image (indépendante de la taille du canvas)
let LUM = null;
function buildLum(){
  if(!ART.raw){ LUM = null; return; }
  const src = ART.raw;
  const lw = 180, lh = Math.max(1, Math.round(lw * src.height / src.width));
  const g = createGraphics(lw, lh);
  g.image(src, 0, 0, lw, lh);
  g.loadPixels();
  const data = new Float32Array(lw*lh);
  for(let i=0, p=0; i<lw*lh; i++, p+=4){
    data[i] = (0.299*g.pixels[p] + 0.587*g.pixels[p+1] + 0.114*g.pixels[p+2]) / 255;
  }
  g.remove();
  LUM = { data, w:lw, h:lh };
}

// luminance (0..1) à un point du canvas ; image en "cover" + cadrage utilisateur.
// renvoie -1 hors image / sans image
function sampleLum(x, y){
  if(!LUM) return -1;
  const z = S.imgscale/100;
  const ir = LUM.w/LUM.h, tr = width/height;
  let dw, dh;
  if(ir > tr){ dh = height*z; dw = dh*ir; } else { dw = width*z; dh = dw/ir; }
  const dx = (width-dw)/2;
  const dy = (height-dh)/2 + (S.imgy/100)*height;
  const u = (x-dx)/dw, v = (y-dy)/dh;
  if(u<0 || u>1 || v<0 || v>1) return -1;
  const ix = Math.min(LUM.w-1, (u*LUM.w)|0);
  const iy = Math.min(LUM.h-1, (v*LUM.h)|0);
  return LUM.data[iy*LUM.w + ix];
}

// des lignes parallèles qui ondulent : amplitude pilotée par la noirceur de l'image
function drawLines(){
  const n = Math.max(6, Math.round(S.density));
  const spacing = height / n;
  const t = millis()/1000;
  const beat = S.bpm/60;
  const gp = genreParams();
  const freq = 0.05 * (S.bpm/120) / gp.spacing;   // fréquence spatiale du porteur
  const step = 3;

  noFill();
  for(let i=0; i<n; i++){
    const baseY = (i+0.5)*spacing;
    const accent = (i % 7 === 0);
    stroke(colAt(i / Math.max(1, n-1)));       // dégradé couleur A → B sur la hauteur
    strokeWeight(S.weight * (accent ? 1.4 : 1));
    beginShape();
    for(let x=0; x<=width; x+=step){
      const l = sampleLum(x, baseY);
      // enveloppe : sombre = grande amplitude ; sans image = ondes uniformes
      const env = l < 0 ? 0.45 : (1 - l);
      const ampLocal = env * (S.amp/60) * spacing * 2.4;
      const carrier = Math.sin(x*freq + i*0.5 + t*beat*gp.speed*1.5);
      const nz = noise(x*0.012, i*0.25, t*0.18*gp.speed);
      const wob = (nz-0.5)*2 * (S.turb/100) * spacing * 1.3 * gp.wobble * env;
      vertex(x, baseY + carrier*ampLocal + wob);
    }
    endShape();
  }
}

// LIQUIFY — colonnes verticales qui ondulent (lignes transposées)
function drawWarp(){
  const n = Math.max(6, Math.round(S.density));
  const spacing = width / n;
  const t = millis()/1000, beat = S.bpm/60, gp = genreParams();
  const freq = 0.05 * (S.bpm/120) / gp.spacing;
  const step = 3;
  noFill();
  for(let i=0; i<n; i++){
    const baseX = (i+0.5)*spacing;
    stroke(colAt(i / Math.max(1, n-1)));
    strokeWeight(S.weight * (i % 7 === 0 ? 1.4 : 1));
    beginShape();
    for(let y=0; y<=height; y+=step){
      const l = sampleLum(baseX, y);
      const env = l < 0 ? 0.45 : (1 - l);
      const amp = env * (S.amp/60) * spacing * 2.4;
      const carrier = Math.sin(y*freq + i*0.5 + t*beat*gp.speed*1.5);
      const nz = noise(y*0.012, i*0.25, t*0.18*gp.speed);
      const wob = (nz-0.5)*2 * (S.turb/100) * spacing * 1.3 * gp.wobble * env;
      vertex(baseX + carrier*amp + wob, y);
    }
    endShape();
  }
}

// POINTS — halftone coloré : grille de disques, taille = noirceur de l'image
function drawDotsField(){
  const t = millis()/1000, beat = S.bpm/60, gp = genreParams();
  const cell = Math.max(5, Math.min(width,height)/S.density);
  const pulseG = 0.9 + 0.1*((Math.sin(t*beat*gp.speed*Math.PI)+1)/2);
  noStroke();
  for(let y=cell/2; y<height; y+=cell){
    fill(colAt(y/height));
    for(let x=cell/2; x<width; x+=cell){
      const l = sampleLum(x, y);
      const env = l < 0 ? 0.5 : (1 - l);
      const nz = noise(x*0.01, y*0.01, t*0.2*gp.speed);
      const jit = 1 + (nz-0.5)*(S.turb/100)*1.2;
      let r = env * cell*0.62 * (0.45 + S.amp/80) * pulseG * jit;
      if(r > 0.4){ if(r > cell*0.72) r = cell*0.72; circle(x, y, r*2); }
    }
  }
}

// ÉCLATEMENT RADIAL — rayons jaillissant d'un centre, longueur = noirceur (vide central)
function drawRadial(){
  const cx = width/2, cy = height*0.46;
  const t = millis()/1000, beat = S.bpm/60, gp = genreParams();
  const rays = Math.max(48, Math.round(S.density*4));
  const innerR = Math.min(width,height)*0.10;
  const maxR = Math.max(width,height)*0.78;
  for(let i=0; i<rays; i++){
    const ang = (i/rays)*TWO_PI + t*0.05*gp.speed;
    const mx = cx + Math.cos(ang)*maxR*0.5, my = cy + Math.sin(ang)*maxR*0.5;
    const l = sampleLum(mx, my);
    const env = l < 0 ? 0.5 : (1 - l);
    const wob = Math.sin(i*0.5 + t*beat*gp.speed*2) * (S.turb/100) * maxR*0.06;
    const r1 = innerR + env*(maxR-innerR) + wob;
    stroke(colAt(i/rays));
    strokeWeight(S.weight * (1 + env*2.2));
    line(cx+Math.cos(ang)*innerR, cy+Math.sin(ang)*innerR,
         cx+Math.cos(ang)*r1,     cy+Math.sin(ang)*r1);
  }
}

// TEXTE-TRAME — un mot répété en petits caractères, taille = noirceur (ASCII art)
function drawText(){
  const word = ((S.sub||'').replace(/[^A-Za-zÀ-ÿ0-9]/g,'').toUpperCase()) || 'GROOVE';
  const cell = Math.max(7, (Math.min(width,height)/S.density)*0.9);
  const t = millis()/1000, gp = genreParams();
  textAlign(CENTER, CENTER); textStyle(BOLD); textSize(cell*1.05); noStroke();
  let k = 0;
  for(let y=cell/2; y<height; y+=cell){
    for(let x=cell/2; x<width; x+=cell){
      const l = sampleLum(x, y);
      const env = l < 0 ? 0.55 : (1 - l);
      if(env < 0.12){ k++; continue; }                 // zones claires = vide
      fill(colAt(y/height));
      push(); translate(x, y);
      scale(0.5 + env*0.95);
      text(word[k % word.length], 0, 0);
      pop();
      k++;
    }
  }
}

// ---------- mise en page : grille modulaire ----------
// répartit un contenu par case (motif / photo / aplat A / aplat B / fond)
function generateCells(){
  const total = Math.max(1, S.gridc * S.gridr);
  const pool = ART.raw ? ['motif','motif','photo','photo','solidA','solidB','bg']
                       : ['motif','motif','solidA','solidB','bg'];
  S.cells = [];
  for(let i=0; i<total; i++) S.cells.push(pool[Math.floor(Math.random()*pool.length)]);
  // garde-fous : au moins une case motif, et une photo si dispo
  if(!S.cells.includes('motif')) S.cells[0] = 'motif';
  if(ART.raw && !S.cells.includes('photo')) S.cells[total>1 ? 1 : 0] = 'photo';
}

// fenêtre le rendu plein-cadre dans une grille de cases (carrés ou cercles)
function applyGrid(){
  const cols = S.gridc, rows = S.gridr;
  const snap = get();                 // capture du motif plein cadre
  background(S.bgc);                   // on repart du fond
  const cw = width/cols, ch = height/rows;
  const ctx = drawingContext;
  let idx = 0;
  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++, idx++){
      const x = c*cw, y = r*ch;
      const content = S.cells[idx] || 'motif';
      if(content === 'bg') continue;  // fond : rien à dessiner
      ctx.save();
      ctx.beginPath();
      if(S.cellshape === 'circle'){
        ctx.arc(x+cw/2, y+ch/2, Math.min(cw,ch)*0.46, 0, TWO_PI);
      } else {
        ctx.rect(x+1.5, y+1.5, cw-3, ch-3);   // léger interstice = filets de fond
      }
      ctx.clip();
      if(content === 'photo' && ART.processed){
        coverRect(this, ART.processed, 0, 0, width, height);
      } else if(content === 'solidA'){
        noStroke(); fill(S.accent);  rect(x, y, cw, ch);
      } else if(content === 'solidB'){
        noStroke(); fill(S.invited); rect(x, y, cw, ch);
      } else {
        image(snap, 0, 0, width, height);      // motif (ou photo sans image)
      }
      ctx.restore();
    }
  }
}

// cadence adaptée : styles/tramages lourds tournent moins vite
function tuneFps(){
  let fps = 48;
  if(S.wave === 'dots' || S.wave === 'text') fps = 30;
  if(S.dither === 'fs' || S.dither === 'dots') fps = Math.min(fps, 14);
  else if(S.dither === 'bayer') fps = Math.min(fps, 24);
  frameRate(fps);
}

// ---------- image de l'artiste ----------
// traitement (duotone / n&b / couleur) — recalculé seulement si besoin
function processArt(){
  if(!ART.raw){ ART.processed = null; ART.dirty = false; return; }
  const src = ART.raw;
  // on borne la taille de travail pour rester fluide
  const maxW = 900;
  const sc = Math.min(1, maxW / src.width);
  const w = Math.max(1, Math.round(src.width * sc));
  const h = Math.max(1, Math.round(src.height * sc));
  const pg = createImage(w, h);
  const tmp = createGraphics(w, h); tmp.image(src, 0, 0, w, h);
  tmp.loadPixels(); pg.loadPixels();

  if(S.treat === 'color'){
    pg.pixels.set(tmp.pixels);
  } else {
    const lo = color(S.accent), hi = color(S.invited);
    const duo = S.treat === 'duo';
    for(let p=0; p<tmp.pixels.length; p+=4){
      const r=tmp.pixels[p], g=tmp.pixels[p+1], b=tmp.pixels[p+2];
      const l = (0.299*r + 0.587*g + 0.114*b)/255;
      if(duo){
        const c = lerpColor(lo, hi, l);
        pg.pixels[p]   = red(c);
        pg.pixels[p+1] = green(c);
        pg.pixels[p+2] = blue(c);
      } else {
        const v = l*255;
        pg.pixels[p]=v; pg.pixels[p+1]=v; pg.pixels[p+2]=v;
      }
      pg.pixels[p+3] = tmp.pixels[p+3];
    }
  }
  pg.updatePixels();
  tmp.remove();
  ART.processed = pg;
  ART.dirty = false;
}

// rectangle "cover" : remplit la zone en rognant, avec zoom + décalage vertical
function coverRect(g, img, x, y, w, h){
  const z = S.imgscale/100;
  const ir = img.width/img.height, tr = w/h;
  let dw, dh;
  if(ir > tr){ dh = h*z; dw = dh*ir; } else { dw = w*z; dh = dw/ir; }
  const dx = x + (w-dw)/2;
  const dy = y + (h-dh)/2 + (S.imgy/100)*h;
  g.image(img, dx, dy, dw, dh);
}

// aiguillage du rendu de la photo selon le placement
function drawPhoto(){
  if(S.place === 'full') drawArt();
  else if(S.place === 'band') drawArtBand();
  else drawArtSource();      // 'source' = disque
}

function drawArt(){           // plein cadre
  tint(255, S.imgopacity*2.55);
  coverRect(this, ART.processed, 0, 0, width, height);
  noTint();
}

function drawArtBand(){       // bandeau haut (~55% de la hauteur)
  const bh = height*0.55;
  push();
  tint(255, S.imgopacity*2.55);
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0,0,width,bh);
  drawingContext.clip();
  coverRect(this, ART.processed, 0, 0, width, bh);
  drawingContext.restore();
  noTint();
  pop();
  // fine ligne accent sous le bandeau
  stroke(S.accent); strokeWeight(2); line(0, bh, width, bh); noStroke();
}

function drawArtSource(){     // l'artiste = la source des ondes (disque)
  const cx = width/2, cy = height*0.42;
  const rad = Math.min(width,height) * 0.30;
  push();
  tint(255, S.imgopacity*2.55);
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(cx, cy, rad, 0, TWO_PI);
  drawingContext.clip();
  coverRect(this, ART.processed, cx-rad, cy-rad, rad*2, rad*2);
  drawingContext.restore();
  noTint();
  pop();
  // anneau de contour
  noFill(); stroke(S.accent); strokeWeight(2.5);
  circle(cx, cy, rad*2);
  noStroke();
}

function drawScrim(){         // dégradé bas pour lisibilité du texte
  const ctx = drawingContext;
  const grd = ctx.createLinearGradient(0, height*0.45, 0, height);
  const bc = color(S.bgc);
  const c = `${red(bc)|0},${green(bc)|0},${blue(bc)|0}`;
  grd.addColorStop(0, `rgba(${c},0)`);
  grd.addColorStop(1, `rgba(${c},0.92)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, height*0.45, width, height*0.55);
}

// ---------- typographie ----------
function drawType(){
  const ink = isDark(S.bgc) ? 245 : 20;
  const f = FORMATS[S.format];
  const k = f.w/595; // échelle relative

  textAlign(LEFT, TOP);
  noStroke();

  // bandeau programmation (haut)
  fill(S.accent);
  textStyle(BOLD);
  textSize(13*k);
  textLeading(16*k);
  text(S.tags, 34*k, 30*k);

  // titre principal (centre/bas)
  textStyle(BOLD);
  const titleSize = (S.format==='story'?72:64)*k*S.typesize;
  textSize(titleSize);
  textLeading(titleSize*0.92);
  const ty = f.h - (S.format==='story'?260:200)*k - (S.typesize-1)*titleSize*0.25;
  drawTitle(S.title.toUpperCase(), 32*k, ty, titleSize, ink);

  // sous-titre
  textStyle(NORMAL);
  textSize(18*k);
  fill(S.accent);
  text(S.sub.toUpperCase(), 34*k, ty + titleSize*0.96);

  // pied : lieu / date
  fill(ink);
  textSize(12*k);
  text(S.date, 34*k, f.h - 40*k);
}

// titre condensé + effet typographique
function drawTitle(str, x, y, size, ink){
  const a = color(S.accent), b = color(S.invited);
  push();
  translate(x, y);
  scale(0.86, 1);            // compression typographique
  textAlign(LEFT, TOP);
  const fx = S.typefx;
  if(fx === 'contour'){                         // lettres évidées
    noFill(); stroke(ink); strokeWeight(Math.max(1.2, size*0.02));
    text(str, 0, 0); noStroke();
  } else if(fx === 'ombre'){                     // ombre portée colorée
    noStroke();
    fill(a); text(str, size*0.06, size*0.07);
    fill(ink); text(str, 0, 0);
  } else if(fx === 'chroma'){                    // décalage RVB façon glitch
    noStroke();
    fill(red(a), green(a), blue(a), 210); text(str, -size*0.035, 0);
    fill(red(b), green(b), blue(b), 210); text(str,  size*0.035, 0);
    fill(ink); text(str, 0, 0);
  } else if(fx === 'shine'){                      // remplissage dégradé chromé (Space Type /shine)
    const ctx = drawingContext;
    ctx.font = `bold ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0.00, S.accent);
    g.addColorStop(0.42, S.accent);
    g.addColorStop(0.50, '#ffffff');
    g.addColorStop(0.58, S.invited);
    g.addColorStop(1.00, S.invited);
    ctx.fillStyle = g;
    ctx.fillText(str, 0, 0);
  } else {                                       // plein
    noStroke(); fill(ink); text(str, 0, 0);
  }
  pop();
}

// ---------- tramage / dither (façon Dither Boy) ----------
// post-traitement 1-bit appliqué à toute l'affiche
const BAYER4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];

function bayerGrid(lum, w, h){
  for(let y=0; y<h; y++) for(let x=0; x<w; x++){
    const t = (BAYER4[(y&3)*4 + (x&3)] + 0.5) / 16 * 255;
    const i = y*w + x;
    lum[i] = lum[i] < t ? 0 : 255;
  }
}

function fsGrid(lum, w, h){          // Floyd–Steinberg : diffusion d'erreur
  for(let y=0; y<h; y++) for(let x=0; x<w; x++){
    const i = y*w + x, old = lum[i], nw = old < 128 ? 0 : 255, err = old - nw;
    lum[i] = nw;
    if(x+1 < w)            lum[i+1]      += err * 7/16;
    if(y+1 < h){
      if(x > 0)            lum[i-1+w]    += err * 3/16;
                           lum[i+w]      += err * 5/16;
      if(x+1 < w)          lum[i+1+w]    += err * 1/16;
    }
  }
}

function applyDither(){
  const mode = S.dither;
  const px = Math.max(1, Math.round(S.ditherpx));
  const dark = isDark(S.bgc);
  // les deux tons : clair (valeur 255) et sombre (valeur 0) — préserve l'image quel que soit le fond
  const hi = dark ? [242,242,242] : [243,239,231];
  const lo = dark ? [12,12,12]    : [22,22,22];

  const W = width, H = height;
  const gw = Math.ceil(W/px), gh = Math.ceil(H/px);

  loadPixels();
  // luminance échantillonnée sur la grille (gros pixels)
  const lum = new Float32Array(gw*gh);
  for(let gy=0; gy<gh; gy++) for(let gx=0; gx<gw; gx++){
    const sx = Math.min(W-1, gx*px), sy = Math.min(H-1, gy*px);
    const idx = 4*(sy*W + sx);
    lum[gy*gw+gx] = 0.299*pixels[idx] + 0.587*pixels[idx+1] + 0.114*pixels[idx+2];
  }

  if(mode === 'dots'){              // halftone : disques d'encre proportionnels
    const bg = dark ? [12,12,12] : [243,239,231];
    const dot = dark ? [242,242,242] : [22,22,22];
    noStroke();
    fill(bg[0],bg[1],bg[2]); rect(0,0,W,H);
    fill(dot[0],dot[1],dot[2]);
    for(let gy=0; gy<gh; gy++) for(let gx=0; gx<gw; gx++){
      const v = lum[gy*gw+gx]/255;
      const amt = dark ? v : 1-v;   // force du premier plan
      const r = amt * px * 0.62;
      if(r > 0.3) circle(gx*px + px/2, gy*px + px/2, r*2);
    }
    return;
  }

  if(mode === 'fs') fsGrid(lum, gw, gh); else bayerGrid(lum, gw, gh);

  // ré-écriture des blocs en 1-bit
  for(let gy=0; gy<gh; gy++) for(let gx=0; gx<gw; gx++){
    const c = lum[gy*gw+gx] >= 128 ? hi : lo;
    const x0 = gx*px, y0 = gy*px, x1 = Math.min(W, x0+px), y1 = Math.min(H, y0+px);
    for(let y=y0; y<y1; y++){
      let p = 4*(y*W + x0);
      for(let x=x0; x<x1; x++){ pixels[p]=c[0]; pixels[p+1]=c[1]; pixels[p+2]=c[2]; pixels[p+3]=255; p+=4; }
    }
  }
  updatePixels();
}

// ---------- UI ----------
function $(id){return document.getElementById(id)}
function bindRange(id, key, fmt){
  const el = $(id), out = $('v-'+id);
  el.addEventListener('input', ()=>{
    S[key] = parseFloat(el.value);
    if(out) out.textContent = fmt ? fmt(el.value) : el.value;
  });
}
bindRange('density','density');
bindRange('bpm','bpm');
bindRange('amp','amp');
bindRange('turb','turb');
bindRange('weight','weight', v=>parseFloat(v).toFixed(1));
$('scale').addEventListener('input',e=>{S.scale=parseInt(e.target.value);$('v-scale').textContent=S.scale+'×'});

function bindSeg(id, key, after){
  document.querySelectorAll('#'+id+' button').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      const v=b.dataset.v;
      S[key]= isNaN(v)?v:parseInt(v);
      if(after) after();
    });
  });
}
bindSeg('seg-sources','sources');
bindSeg('seg-place','place');
bindSeg('seg-treat','treat', ()=>{ ART.dirty = true; });
bindSeg('seg-dither','dither', tuneFps);   // ajuste la cadence selon onde + tramage

bindSeg('seg-typefx','typefx');
// grille : changer la taille régénère la répartition des cases
['gridc','gridr'].forEach(id=>{
  $(id).addEventListener('input', ()=>{
    S[id] = parseInt($(id).value); $('v-'+id).textContent = S[id];
    generateCells();
  });
});
bindSeg('seg-cellshape','cellshape');
$('shuffle-cells').addEventListener('click', generateCells);
generateCells();
bindRange('imgscale','imgscale');
bindRange('imgy','imgy');
bindRange('imgopacity','imgopacity');
bindRange('typesize','typesize', v=>parseFloat(v).toFixed(1));
bindRange('ditherpx','ditherpx');

// ---- chargement / traitement de l'image ----
function setArt(img, label){
  ART.raw = img; ART.dirty = true;
  generateCells();   // recalcule la répartition (intègre/retire les cases photo)
  const t = $('thumb');
  if(img){
    try { $('thumb-img').src = img.canvas ? img.canvas.toDataURL() : ''; }
    catch(e){ $('thumb-img').src = ''; }
    $('thumb-name').textContent = label || 'photo chargée';
    t.style.display = 'flex';
  } else {
    t.style.display = 'none';
    document.querySelectorAll('#presets img').forEach(x=>x.classList.remove('sel'));
  }
}
function loadFromURL(url, label, thumbEl){
  loadImage(url, img=>{
    setArt(img, label);
    document.querySelectorAll('#presets img').forEach(x=>x.classList.remove('sel'));
    if(thumbEl) thumbEl.classList.add('sel');
  }, ()=> $('thumb-name') && ($('thumb-name').textContent='échec du chargement'));
}
function handleFile(file){
  if(!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => loadFromURL(e.target.result, file.name);
  reader.readAsDataURL(file);
}

$('file').addEventListener('change', e=> handleFile(e.target.files[0]));
$('thumb-x').addEventListener('click', ()=> setArt(null));

// drag & drop (sur le panneau d'upload ET la scène)
['drop','stage'].forEach(id=>{
  const el = $(id);
  el.addEventListener('dragover', e=>{ e.preventDefault(); $('drop').classList.add('over'); });
  el.addEventListener('dragleave', ()=> $('drop').classList.remove('over'));
  el.addEventListener('drop', e=>{
    e.preventDefault(); $('drop').classList.remove('over');
    if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
});

// vignettes presets (les 3 photos du dossier images/)
const pres = $('presets');
PRESETS.forEach(url=>{
  const im = document.createElement('img');
  im.src = url; im.alt = '';
  im.addEventListener('click', ()=> loadFromURL(url, url.split('/').pop(), im));
  pres.appendChild(im);
});

$('wave').addEventListener('change',e=>{ S.wave=e.target.value; tuneFps(); });
$('genre').addEventListener('change',e=>S.genre=e.target.value);
$('format').addEventListener('change',e=>{S.format=e.target.value;rebuildCanvas()});
['title','sub','tags','date'].forEach(k=>{
  $('t-'+k).addEventListener('input',e=>S[k]=e.target.value);
});

// ---- couleurs : palette colorimétrique + pickers ----
function syncColorInputs(){
  $('c-bg').value = S.bgc; $('c-a').value = S.accent; $('c-b').value = S.invited;
}
function applyScheme(name){
  const s = SCHEMES[name]; if(!s) return;
  S.bgc = s.bg; S.accent = s.a; S.invited = s.b; S.scheme = name;
  ART.dirty = true;
  syncColorInputs();
  $('scheme').value = name;
}
$('scheme').addEventListener('change', e=>{
  if(e.target.value === 'custom'){ S.scheme='custom'; syncColorInputs(); return; }
  applyScheme(e.target.value);
});
$('c-bg').addEventListener('input', e=>{ S.bgc=e.target.value; S.scheme='custom'; $('scheme').value='custom'; });
$('c-a').addEventListener('input',  e=>{ S.accent=e.target.value; ART.dirty=true; S.scheme='custom'; $('scheme').value='custom'; });
$('c-b').addEventListener('input',  e=>{ S.invited=e.target.value; ART.dirty=true; S.scheme='custom'; $('scheme').value='custom'; });
syncColorInputs();

// export PNG à la résolution choisie
$('export-png').addEventListener('click',()=>{
  const f = FORMATS[S.format];
  const g = createGraphics(f.w*S.scale, f.h*S.scale);
  // on relance un rendu statique sur le buffer haute-déf
  renderTo(g, S.scale);
  const url = g.elt.toDataURL('image/png');
  const a=document.createElement('a');
  a.href=url;
  a.download='legroove_'+S.format+'_'+Date.now()+'.png';
  a.click();
  g.remove();
});

// rendu sur un buffer (pour export net)
function renderTo(g, k){
  g.background(S.bgc);
  g.push(); g.scale(k);
  // réutilise la logique en dessinant directement : on copie le canvas courant
  g.pop();
  // simple : on capture l'état visuel courant en upscalant le canvas affiché
  g.drawingContext.imageSmoothingEnabled = (S.dither === 'none');  // tramage = pixels nets
  g.image(cnv, 0,0, g.width, g.height);
}

$('randomize').addEventListener('click',()=>{
  S.density = Math.floor(20+Math.random()*120); $('density').value=S.density; $('v-density').textContent=S.density;
  S.bpm = Math.floor(70+Math.random()*100); $('bpm').value=S.bpm; $('v-bpm').textContent=S.bpm;
  S.amp = Math.floor(Math.random()*110); $('amp').value=S.amp; $('v-amp').textContent=S.amp;
  S.turb = Math.floor(Math.random()*90); $('turb').value=S.turb; $('v-turb').textContent=S.turb;
  const keys = Object.keys(SCHEMES); applyScheme(keys[Math.floor(Math.random()*keys.length)]);
  const genres=['sound','techno','live','scene']; S.genre=genres[Math.floor(Math.random()*4)]; $('genre').value=S.genre;
});
