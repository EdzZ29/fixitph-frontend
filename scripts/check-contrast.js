/**
 * Audits the design tokens in app/globals.css directly: parses every
 * oklch(...) value, converts to sRGB, and checks the pairs that carry a WCAG
 * requirement. No browser involved, so nothing can be mis-sampled.
 */
const fs = require('fs');

const path = require('path');
const CSS = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

function oklchToRgb(Lc, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = Lc + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = Lc - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = Lc - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const enc = (c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(v * 255)));
  };
  return [enc(r), enc(g), enc(bl)];
}

function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = ([r, g, b]) => '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
/** Flattens `fg` at `alpha` over `bg`. */
const mix = (fg, bg, alpha) => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

/** Pulls a token out of the :root block or the .dark block. */
function token(name, dark) {
  const blockStart = dark ? CSS.indexOf('.dark {') : CSS.indexOf(':root {');
  const blockEnd = CSS.indexOf('\n}', blockStart);
  const block = CSS.slice(blockStart, blockEnd);
  const m = new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(block);
  if (!m) throw new Error(`token --${name} not found in ${dark ? '.dark' : ':root'}`);
  return oklchToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
}

const rows = [];
function check(theme, name, fg, bg, min) {
  const r = ratio(fg, bg);
  rows.push({ theme, name, r, min, ok: r >= min, fg: hex(fg), bg: hex(bg) });
}

for (const dark of [false, true]) {
  const t = (n) => token(n, dark);
  const theme = dark ? 'dark' : 'light';

  const bg = t('background');
  const card = t('card');

  check(theme, 'body text', t('foreground'), bg, 4.5);
  check(theme, 'muted text', t('muted-foreground'), bg, 4.5);
  check(theme, 'primary button text', t('primary-foreground'), t('primary'), 4.5);
  check(theme, 'accent button text', t('accent-foreground'), t('accent'), 4.5);
  check(theme, 'lime-ink text', t('brand-lime-ink'), bg, 4.5);
  check(theme, 'panel text', t('brand-panel-foreground'), t('brand-panel'), 4.5);
  check(theme, 'focus ring', t('ring'), bg, 3);

  // Non-text contrast: the boundary that identifies a control.
  check(theme, 'input border', t('input'), bg, 3);
  check(theme, 'input border on card', t('input'), card, 3);
  check(theme, 'divider (decorative)', t('border'), bg, 1);

  // Destructive text sits on a 5% tint of itself over the page.
  const destructive = t('destructive');
  check(theme, 'destructive text', destructive, mix(destructive, bg, 0.05), 4.5);
  check(theme, 'alert border (70%)', mix(destructive, bg, 0.7), bg, 3);
}

let theme = '';
let failed = 0;
for (const r of rows) {
  if (r.theme !== theme) { theme = r.theme; console.log(`\n=== ${theme} ===`); }
  if (!r.ok) failed++;
  console.log(
    `  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(26)} ${r.r.toFixed(2).padStart(6)}:1  (needs ${String(r.min).padEnd(3)})  ${r.fg} on ${r.bg}`,
  );
}
console.log(`\n${failed} of ${rows.length} below target.`);
