// Rendert Video 1 (1080x1920, 30 fps) aus Text-Slides: node video-01/render.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = __dirname;
const row = (home, score, away, hl) =>
  `<div class="row${hl ? ' hl' : ''}"><span>${home}</span><b>${score}</b><span>${away}</span></div>`;

// [Sekunden, Kicker, Inhalt, Untertitel (= Sprechtext)]
const slides = [
  [3.0, 'CHAMPIONS LEAGUE', '<div class="huge">LENS<br><em>1:9</em><br>COMO 🤯</div>',
    'Como gewinnt in der Champions League 9:1. Und das ist kein Witz.'],
  [3.0, '4. SPIELTAG', '<div class="big">Komplett<br>verrückt.</div>',
    'Der 4. Spieltag war komplett verrückt. Fangen wir mit den Deutschen an:'],
  [6.0, '🇩🇪 DIE DEUTSCHEN', row('Atlético', '0:2', 'Bayern', 1) + row('Galatasaray', '2:0', 'VfB') +
    '<div class="note">Laimer macht den Deckel drauf</div>',
    'Bayern gewinnt 2:0 bei Atlético Madrid, der VfB verliert 0:2 bei Galatasaray.'],
  [6.0, '🇩🇪 DIE DEUTSCHEN', row('Dortmund', '2:1', 'Betis', 1) + row('Leipzig', '2:3', 'Man City'),
    'Dortmund schlägt Betis 2:1, Leipzig verliert knapp 2:3 gegen Manchester City.'],
  [7.0, '😱 DIE SCHOCKER', row('Villarreal', '0:6', 'Paris') + row('Porto', '4:1', 'Napoli') +
    row('Fenerbahçe', '3:2', 'Liverpool'),
    'Paris gewinnt 6:0 in Villarreal, Porto zerlegt Napoli 4:1, Liverpool verliert 2:3 bei Fenerbahçe.'],
  [4.5, '🏆 GEWINNER DER WOCHE', '<div class="huge"><em>BAYERN</em></div>',
    'Ein Auswärtssieg bei Atlético ist eine echte Ansage.'],
  [5.0, '💬 EURE MEINUNG', '<div class="big">Welches Ergebnis hat euch überrascht?</div>' +
    '<div class="note">Donnerstag: Europa-League-Rückblick → Folgen!</div>',
    'Schreibt\'s in die Kommentare. Folgen nicht vergessen!'],
];

const css = `
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;background:radial-gradient(circle at 50% 30%,#1b2a6b,#070b1f 70%);
 color:#fff;font-family:'Inter Display','Noto Color Emoji';display:flex;flex-direction:column;
 justify-content:center;align-items:center;padding:0 72px;text-align:center}
.kicker{font-weight:800;font-size:46px;letter-spacing:6px;color:#7fb2ff;margin-bottom:60px}
.huge{font-weight:900;font-size:190px;line-height:1.05}
.big{font-weight:900;font-size:120px;line-height:1.1}
em{font-style:normal;color:#ffd23f}
.row{display:flex;width:100%;align-items:center;justify-content:space-between;background:#ffffff14;
 border-radius:28px;padding:44px 40px;margin:18px 0;font-size:54px;font-weight:700}
.row span{flex:1 1 0;min-width:0}.row span:first-child{text-align:left}.row span:last-child{text-align:right}
.row b{font-size:86px;font-weight:900;padding:0 30px;color:#ffd23f}
.row.hl{outline:6px solid #ffd23f}
.note{margin-top:50px;font-size:54px;font-weight:700;color:#ffd23f}
.sub{position:absolute;bottom:260px;left:72px;right:72px;font-size:46px;font-weight:600;
 background:#000a;padding:24px 30px;border-radius:18px;line-height:1.3}
.handle{position:absolute;top:120px;font-size:36px;font-weight:600;opacity:.6}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const args = [];
  const filters = [];
  for (const [i, [dur, kicker, body, sub]] of slides.entries()) {
    await page.setContent(`<style>${css}</style><div class="handle">CL-Rückblick</div>
      <div class="kicker">${kicker}</div>${body}<div class="sub">${sub}</div>`);
    await page.evaluate(() => document.fonts.ready);
    const png = path.join(out, `slide${i}.png`);
    await page.screenshot({ path: png });
    args.push('-i', png); // zoompan erzeugt die Frames selbst, daher kein -loop
    // leichter Zoom-in pro Slide
    filters.push(`[${i}:v]scale=1188:2112,zoompan=z='min(zoom+0.0006,1.05)':d=${Math.round(dur * 30)}` +
      `:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1[v${i}]`);
  }
  await browser.close();

  // Übergänge: 0.3 s Crossfade zwischen allen Slides
  const fade = 0.3;
  let last = 'v0', t = 0;
  for (let i = 1; i < slides.length; i++) {
    t += slides[i - 1][0] - fade;
    filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${fade}:offset=${t.toFixed(2)}[x${i}]`);
    last = `x${i}`;
  }
  const mp4 = path.join(path.dirname(out), 'video-01-champions-league-rueckblick.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-filter_complex', filters.join(';'),
    '-map', `[${last}]`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4], { stdio: 'inherit' });
  slides.forEach((_, i) => fs.unlinkSync(path.join(out, `slide${i}.png`)));
  console.log('fertig:', mp4);
})();
