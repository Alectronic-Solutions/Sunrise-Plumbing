/* ============================================================
   SUNRISE PLUMBING: 3D ICON BUILDER
   Every icon is drawn in a 64x64 design space from simple shapes,
   then rendered with one shared lighting model: light from the
   top left, an extruded side face, a gloss pass and (for objects)
   a soft ground shadow. Run `npm run icons` after editing.
   Writes assets/icons/*.svg and assets/css/icons.css.
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'icons');

/* Materials: [light, base, dark, side (extrusion)] */
const MAT = {
  orange: ['#FFC08A', '#F7761A', '#D4510B', '#9A3412'],
  deep:   ['#F98F4A', '#DB5A10', '#B8440A', '#7C2D12'],
  amber:  ['#FFEBA8', '#FBBF24', '#E09A0C', '#A16207'],
  brass:  ['#FFE7A8', '#E6AE48', '#B7791F', '#7C4A0E'],
  copper: ['#FFD2AE', '#DE8546', '#A9561F', '#6B3410'],
  steel:  ['#FFFFFF', '#D8DFE8', '#9CA9BA', '#5B6778'],
  slate:  ['#94A3B8', '#526077', '#334155', '#1E293B'],
  cream:  ['#FFFFFF', '#F7F2EA', '#E3D9CB', '#B3A392'],
  paper:  ['#FBF7F0', '#EFE7DA', '#D8CCBA', '#A89883'],
  navy:   ['#5A86B8', '#2A5080', '#1B3A5C', '#0D1B2A'],
  sky:    ['#DDF3FF', '#7CCBF5', '#3B9FD8', '#1D6A9E'],
  water:  ['#C9F0FF', '#38BDF8', '#0284C7', '#075985'],
  glass:  ['#F2FBFF', '#BFE6FA', '#8CCBEB', '#4B8DB3'],
  ice:    ['#E6F7FF', '#7DD3FC', '#38A3E0', '#1E5F9E'],
  green:  ['#B4F5CB', '#34C46A', '#15803D', '#14532D'],
  red:    ['#FFB0A8', '#EF4444', '#C21D1D', '#7F1D1D'],
  dark:   ['#6B7280', '#3A4452', '#1F2937', '#0B1220'],
  soil:   ['#D9B48C', '#A87549', '#7C4F2A', '#4A2C14'],
  grass:  ['#BDF08C', '#6CC24A', '#3F8F2A', '#285C1A'],
  wood:   ['#E8B887', '#B97A45', '#8A5528', '#5A3414'],
  straw:  ['#FFE9A6', '#E9BC52', '#B8872A', '#7D5A16'],
};

/* ---------- path parsing and affine transforms ---------- */
function parse(d) {
  const t = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  const out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null;
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { out.push(['Z']); x = sx; y = sy; lc = lq = null; continue; }
    if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; lc = lq = null; continue; }
    if (C === 'L') { x = ox + n(); y = oy + n(); out.push(['L', x, y]); lc = lq = null; continue; }
    if (C === 'H') { x = ox + n(); out.push(['L', x, y]); lc = lq = null; continue; }
    if (C === 'V') { y = oy + n(); out.push(['L', x, y]); lc = lq = null; continue; }
    if (C === 'C') { const a = [ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()]; out.push(['C', ...a]); lc = [a[2], a[3]]; x = a[4]; y = a[5]; lq = null; continue; }
    if (C === 'S') { const c1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]; const a = [ox + n(), oy + n(), ox + n(), oy + n()]; out.push(['C', ...c1, ...a]); lc = [a[0], a[1]]; x = a[2]; y = a[3]; lq = null; continue; }
    if (C === 'Q') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; out.push(['Q', ...a]); lq = [a[0], a[1]]; x = a[2]; y = a[3]; lc = null; continue; }
    if (C === 'T') { const c1 = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y]; const a = [ox + n(), oy + n()]; out.push(['Q', ...c1, ...a]); lq = c1; x = a[0]; y = a[1]; lc = null; continue; }
    throw new Error('Unsupported path command ' + cmd);
  }
  return out;
}
const mul = (A, B) => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
];
const T = (dx, dy) => [1, 0, 0, 1, dx, dy];
const S = (s) => [s, 0, 0, s, 0, 0];
const R = (deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const apply = (segs, M) => segs.map((s) => {
  if (s[0] === 'Z') return s;
  const r = [s[0]];
  for (let k = 1; k < s.length; k += 2) r.push(M[0] * s[k] + M[2] * s[k + 1] + M[4], M[1] * s[k] + M[3] * s[k + 1] + M[5]);
  return r;
});
const fmt = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
const ser = (segs) => segs.map((s) => s[0] + s.slice(1).map(fmt).join(' ')).join('');
function bbox(segs, pad = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, px = 0, py = 0, sx = 0, sy = 0;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const s of segs) {
    if (s[0] === 'M') { px = sx = s[1]; py = sy = s[2]; add(px, py); }
    else if (s[0] === 'L') { px = s[1]; py = s[2]; add(px, py); }
    else if (s[0] === 'C') {
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        add(u * u * u * px + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5],
            u * u * u * py + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6]);
      }
      px = s[5]; py = s[6];
    } else if (s[0] === 'Q') {
      for (let k = 1; k <= 12; k++) {
        const t = k / 12, u = 1 - t;
        add(u * u * px + 2 * u * t * s[1] + t * t * s[3], u * u * py + 2 * u * t * s[2] + t * t * s[4]);
      }
      px = s[3]; py = s[4];
    } else { px = sx; py = sy; }
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
/* Move a design path: rotate and scale around `at`, then move `at` to `to`. */
function place(d, { at = [32, 32], to = at, s = 1, rot = 0 } = {}) {
  const M = mul(T(to[0], to[1]), mul(S(s), mul(R(rot), T(-at[0], -at[1]))));
  return ser(apply(parse(d), M));
}

/* ---------- shape helpers (bezier only, so transforms stay exact) ---------- */
const K = 0.5523;
const ellipse = (cx, cy, rx, ry) =>
  `M${cx - rx} ${cy}C${cx - rx} ${cy - K * ry} ${cx - K * rx} ${cy - ry} ${cx} ${cy - ry}C${cx + K * rx} ${cy - ry} ${cx + rx} ${cy - K * ry} ${cx + rx} ${cy}` +
  `C${cx + rx} ${cy + K * ry} ${cx + K * rx} ${cy + ry} ${cx} ${cy + ry}C${cx - K * rx} ${cy + ry} ${cx - rx} ${cy + K * ry} ${cx - rx} ${cy}Z`;
const circle = (cx, cy, r) => ellipse(cx, cy, r, r);
const rrect = (x, y, w, h, r = 0) => {
  r = Math.min(r, w / 2, h / 2);
  const k = K * r;
  return `M${x + r} ${y}L${x + w - r} ${y}C${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r}L${x + w} ${y + h - r}` +
    `C${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h}L${x + r} ${y + h}C${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r}` +
    `L${x} ${y + r}C${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y}Z`;
};
const poly = (pts) => 'M' + pts.map((p) => p.join(' ')).join('L') + 'Z';
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
function arcC(cx, cy, r, a0, a1) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90)), da = (a1 - a0) / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    const t0 = (a0 + da * i) * Math.PI / 180, t1 = (a0 + da * (i + 1)) * Math.PI / 180;
    const k = 4 / 3 * Math.tan((t1 - t0) / 4);
    const x0 = cx + r * Math.cos(t0), y0 = cy + r * Math.sin(t0), x3 = cx + r * Math.cos(t1), y3 = cy + r * Math.sin(t1);
    s += `C${x0 - k * r * Math.sin(t0)} ${y0 + k * r * Math.cos(t0)} ${x3 + k * r * Math.sin(t1)} ${y3 - k * r * Math.cos(t1)} ${x3} ${y3}`;
  }
  return s;
}
const arc = (cx, cy, r, a0, a1) => { const [x, y] = pt(cx, cy, r, a0); return `M${x} ${y}` + arcC(cx, cy, r, a0, a1); };
const sector = (cx, cy, r0, r1, a0, a1) => {
  const [x, y] = pt(cx, cy, r1, a0), [xi, yi] = pt(cx, cy, r0, a1);
  return `M${x} ${y}${arcC(cx, cy, r1, a0, a1)}L${xi} ${yi}${arcC(cx, cy, r0, a1, a0)}Z`;
};
const starPts = (cx, cy, R1, r1, n = 5, rot = -90) =>
  Array.from({ length: n * 2 }, (_, i) => pt(cx, cy, i % 2 ? r1 : R1, rot + i * 180 / n));
const drop = (cx, cy, r) =>
  `M${cx} ${cy - 2.1 * r}C${cx + 0.4 * r} ${cy - 1.4 * r} ${cx + r} ${cy - 0.8 * r} ${cx + r} ${cy}C${cx + r} ${cy + 0.55 * r} ${cx + 0.55 * r} ${cy + r} ${cx} ${cy + r}` +
  `C${cx - 0.55 * r} ${cy + r} ${cx - r} ${cy + 0.55 * r} ${cx - r} ${cy}C${cx - r} ${cy - 0.8 * r} ${cx - 0.4 * r} ${cy - 1.4 * r} ${cx} ${cy - 2.1 * r}Z`;
const flame = (cx, base, h, w) =>
  `M${cx} ${base}C${cx - w} ${base} ${cx - w} ${base - h * 0.45} ${cx - w * 0.45} ${base - h * 0.72}C${cx - w * 0.3} ${base - h * 0.52} ${cx - w * 0.05} ${base - h * 0.6} ${cx + w * 0.05} ${base - h}` +
  `C${cx + w * 0.75} ${base - h * 0.62} ${cx + w} ${base - h * 0.35} ${cx + w} ${base - h * 0.2}C${cx + w} ${base - h * 0.05} ${cx + w * 0.5} ${base} ${cx} ${base}Z`;
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hexToRgb(a).map((v, i) => Math.round(v + (hexToRgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

/* ---------- renderer ---------- */
const GRAD = {
  lin:    (id, [l, b, d]) => `<linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`,
  in:     (id, [l, b, d]) => `<linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${d}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${l}"/></linearGradient>`,
  radial: (id, [l, b, d]) => `<radialGradient id="${id}" cx=".36" cy=".3" r=".85" fx=".3" fy=".22"><stop offset="0" stop-color="${l}"/><stop offset=".48" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></radialGradient>`,
  cylH:   (id, [l, b, d]) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset=".28" stop-color="${l}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`,
  cylV:   (id, [l, b, d]) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b}"/><stop offset=".3" stop-color="${l}"/><stop offset=".66" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`,
};
const GLOSS = '<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".4" stop-color="#fff" stop-opacity=".14"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/></linearGradient>';
const SHADOW = '<radialGradient id="gs"><stop offset="0" stop-color="#0D1B2A" stop-opacity=".3"/><stop offset="1" stop-color="#0D1B2A" stop-opacity="0"/></radialGradient>';

function render(parts, opts = {}) {
  let P = parts.map((p) => ({ ...p, segs: parse(p.d) }));
  // Optional whole-icon rotation in design space (lighting is applied after, so it stays top-left).
  if (opts.rot) { const M = mul(T(32, 32), mul(R(opts.rot), T(-32, -32))); P.forEach((p) => { p.segs = apply(p.segs, M); }); }

  const depthOf = (p) => (p.depth ?? ((p.m || p.sm) ? 3 : 0));
  const maxDepth = Math.max(0, ...P.map(depthOf));
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of P) {
    const b = bbox(p.segs, (p.w || 0) / 2 + (p.soft || 0) / 2);
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  // Fit into the 64 box, leaving room for the extrusion and ground shadow.
  const pad = opts.pad ?? 3;
  const bx0 = pad, by0 = pad, bx1 = 64 - pad - maxDepth * 0.35, by1 = 64 - pad - maxDepth - (opts.shadow ? 3 : 0);
  const s = Math.min((bx1 - bx0) / (x1 - x0), (by1 - by0) / (y1 - y0));
  const M = mul(T(bx0 + ((bx1 - bx0) - (x1 - x0) * s) / 2, by0 + ((by1 - by0) - (y1 - y0) * s) / 2), mul(S(s), T(-x0, -y0)));
  P.forEach((p) => { p.segs = apply(p.segs, M); p.w = p.w && p.w * s; p.soft = p.soft && p.soft * s; });

  const defs = new Map();
  const body = [];
  let uid = 0;
  if (opts.shadow) {
    defs.set('gs', SHADOW);
    const fb = P.reduce((a, p) => { const b = bbox(p.segs); return [Math.min(a[0], b[0]), Math.max(a[1], b[2]), Math.max(a[2], b[3])]; }, [Infinity, -Infinity, -Infinity]);
    const cx = (fb[0] + fb[1]) / 2 + 1.2, w = (fb[1] - fb[0]);
    body.push(`<ellipse cx="${fmt(cx)}" cy="${fmt(fb[2] + maxDepth + 0.6)}" rx="${fmt(w * 0.46)}" ry="3.2" fill="url(#gs)"/>`);
  }

  for (const p of P) {
    const d = ser(p.segs);
    const depth = depthOf(p);
    const op = p.op != null ? ` opacity="${p.op}"` : '';
    const fr = p.evenodd ? ' fill-rule="evenodd"' : '';
    const steps = depth > 0 ? Math.max(1, Math.ceil(depth / 1.1)) : 0;
    const offs = Array.from({ length: steps }, (_, i) => depth * (steps - i) / steps);
    const tr = (dy) => ` transform="translate(${fmt(dy * 0.35)} ${fmt(dy)})"`;

    if (p.m) {
      const mat = MAT[p.m], shade = p.shade || 'lin', gid = `${p.m}-${shade}`;
      if (!defs.has(gid)) defs.set(gid, GRAD[shade](gid, mat));
      const id = 'p' + uid++;
      const soft = p.soft ? ` stroke-width="${fmt(p.soft)}" stroke-linejoin="round"` : '';
      defs.set(id, `<path id="${id}" d="${d}"${fr}/>`);
      for (const o of offs) body.push(`<use href="#${id}" fill="${mat[3]}"${p.soft ? ` stroke="${mat[3]}"${soft}` : ''}${tr(o)}/>`);
      const edge = p.soft ? ` stroke="url(#${gid})"${soft}` : (p.edge === false ? '' : ` stroke="${mat[3]}" stroke-opacity=".4" stroke-width=".7"`);
      body.push(`<use href="#${id}" fill="url(#${gid})"${edge}${op}/>`);
      if (p.gloss !== 0) { defs.set('gl', GLOSS); body.push(`<use href="#${id}" fill="url(#gl)" opacity="${p.gloss ?? 0.9}"/>`); }
    } else if (p.sm) {
      // Stroked tube: gradient in user space so straight lines still get shading.
      const mat = MAT[p.sm], [a, b, c, e] = bbox(p.segs, p.w / 2), gid = 'g' + uid++, id = 'p' + uid++;
      defs.set(gid, `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${fmt(a)}" y1="${fmt(b)}" x2="${fmt(a + (c - a) * 0.35)}" y2="${fmt(e)}"><stop offset="0" stop-color="${mat[0]}"/><stop offset=".5" stop-color="${mat[1]}"/><stop offset="1" stop-color="${mat[2]}"/></linearGradient>`);
      defs.set(id, `<path id="${id}" d="${d}" fill="none" stroke-linecap="${p.cap || 'round'}" stroke-linejoin="${p.join || 'round'}"/>`);
      for (const o of offs) body.push(`<use href="#${id}" stroke="${mat[3]}" stroke-width="${fmt(p.w)}"${tr(o)}/>`);
      body.push(`<use href="#${id}" stroke="url(#${gid})" stroke-width="${fmt(p.w)}"${op}/>`);
      if (p.gloss !== 0) body.push(`<use href="#${id}" stroke="#fff" stroke-opacity=".5" stroke-width="${fmt(p.w * 0.3)}" transform="translate(${fmt(-p.w * 0.12)} ${fmt(-p.w * 0.2)})"/>`);
    } else if (p.line) {
      const dash = p.dash ? ` stroke-dasharray="${p.dash.split(' ').map((v) => fmt(v * s)).join(' ')}"` : '';
      body.push(`<path d="${d}" fill="none" stroke="${p.line}" stroke-width="${fmt((p.lw ?? 1.5) * s)}" stroke-linecap="${p.cap || 'round'}" stroke-linejoin="round"${dash}${op}/>`);
    } else {
      if (p.fill === 'url(#gl)') defs.set('gl', GLOSS);
      body.push(`<path d="${d}" fill="${p.fill}"${fr}${op}/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${[...defs.values()].join('')}</defs>${body.join('')}</svg>\n`;
}

/* ---------- shared pieces ---------- */
const HANDSET = 'M9 40L8 31C8 22 18 17 32 17C46 17 56 22 56 31L55 40C55 42 53 43 51 43L45 43C43 43 42 42 42 40L42 33C42 28 38 26 32 26C26 26 22 28 22 33L22 40C22 42 21 43 19 43L13 43C11 43 9 42 9 40Z';
const PIN = 'M32 60C28 51 14 41 14 25C14 14.5 22 7 32 7C42 7 50 14.5 50 25C50 41 36 51 32 60Z';
const ARROW = poly([[6, 25], [31, 25], [31, 12], [58, 32], [31, 52], [31, 39], [6, 39]]);
const CHEVRON = poly([[18, 8], [31, 8], [50, 32], [31, 56], [18, 56], [37, 32]]);
const bead = [
  { d: circle(32, 32, 28), m: 'cream', shade: 'radial', depth: 3 },
  { d: circle(32, 32, 23), m: 'cream', shade: 'in', depth: 0, gloss: 0, edge: false },
];
const sphere = (m) => ({ d: circle(32, 32, 27), m, shade: 'radial', depth: 3 });
const inset = (d, dark, light) => [{ d: place(d, { to: [32, 32.8] }), fill: light, op: 0.7 }, { d, fill: dark }];
const arrowHead = (cx, cy, r, a, dir, size) => {
  const [x, y] = pt(cx, cy, r, a), rad = a * Math.PI / 180;
  const tx = -Math.sin(rad) * dir, ty = Math.cos(rad) * dir, nx = Math.cos(rad), ny = Math.sin(rad);
  return poly([[x + tx * size * 1.1, y + ty * size * 1.1], [x + nx * size - tx * 0.6, y + ny * size - ty * 0.6], [x - nx * size - tx * 0.6, y - ny * size - ty * 0.6]]);
};
const house = (extra) => [
  ...(extra.chimney ? [{ d: rrect(41, 9, 8, 18, 1.2), m: 'deep', depth: 3 }] : []),
  { d: poly([[12, 31], [32, 15], [52, 31], [52, 56], [12, 56]]), m: 'cream', depth: 3 },
  { d: 'M26 56L26 42C26 40 27.5 38.5 29.5 38.5L34.5 38.5C36.5 38.5 38 40 38 42L38 56Z', m: 'navy', depth: 0, gloss: 0.5 },
  { d: circle(35.2, 48, 1.1), fill: '#FBBF24' },
  ...extra.parts,
  { d: 'M3 32L32 8L61 32C62 33 61.5 35 60 35L57 35C56 35 55.5 34.8 55 34.4L32 16L9 34.4C8.5 34.8 8 35 7 35L4 35C2.5 35 2 33 3 32Z', m: 'orange', depth: 3 },
];

/* ---------- the icon set ---------- */
const I = {};

I.phone = () => [...bead, { d: place(HANDSET, { at: [32, 30], to: [32, 32], s: 0.74, rot: -135 }), m: 'orange', depth: 2.5 }];
I['phone-ring'] = () => [
  ...bead,
  { d: place(HANDSET, { at: [32, 30], to: [25, 39], s: 0.5, rot: -135 }), m: 'orange', depth: 2 },
  { d: arc(22, 42, 21.5, -80, -10), sm: 'orange', w: 3, depth: 1.2 },
  { d: arc(22, 42, 28, -78, -12), sm: 'orange', w: 3, depth: 1.2 },
];

I.envelope = () => [
  { d: rrect(6, 14, 52, 38, 5), m: 'cream', depth: 3 },
  { d: 'M10 48L28 34', line: '#B3A392', lw: 1.6, op: 0.7 },
  { d: 'M54 48L36 34', line: '#B3A392', lw: 1.6, op: 0.7 },
  { d: 'M7.5 17.5C7.5 15.5 9 14 11 14L53 14C55 14 56.5 15.5 56.5 17.5L35.5 36.5C33.5 38.2 30.5 38.2 28.5 36.5Z', m: 'orange', depth: 1.5 },
  { d: circle(32, 35, 5.5), m: 'red', shade: 'radial', depth: 1.2 },
  { d: circle(32, 35, 3), m: 'red', shade: 'in', depth: 0, gloss: 0, edge: false },
];

I.pin = () => [
  { d: PIN, m: 'orange', depth: 3 },
  { d: circle(32, 25, 7.5), m: 'cream', shade: 'in', depth: 0, gloss: 0 },
];

I.map = () => [
  { d: poly([[4, 16], [22, 10], [22, 50], [4, 56]]), m: 'cream', depth: 3 },
  { d: poly([[22, 10], [42, 16], [42, 56], [22, 50]]), m: 'paper', depth: 3 },
  { d: poly([[42, 16], [60, 10], [60, 50], [42, 56]]), m: 'cream', depth: 3 },
  { d: 'M4.5 44C10 40 16 47 22 42C28 37 34 46 42 42C48 39 54 43 59.5 38', line: '#38BDF8', lw: 3 },
  { d: 'M9 27C15 33 22 23 28 28C33 32 37 30 41 25', line: '#EA6C0A', lw: 2, dash: '2.5 2.8' },
  { d: place(PIN, { at: [32, 60], to: [45, 30], s: 0.44 }), m: 'orange', depth: 2 },
  { d: circle(45, 30 - 35 * 0.44, 3.3), m: 'cream', shade: 'in', depth: 0, gloss: 0 },
];

I.star = () => {
  const cx = 32, cy = 33.5, pts = starPts(cx, cy, 29, 12.5);
  const L = [-0.6, -0.8];
  const parts = [{ d: poly(pts), m: 'amber', depth: 2.5, gloss: 0, edge: false }];
  for (let i = 0; i < 5; i++) {
    const tip = pts[2 * i];
    for (const inner of [pts[(2 * i + 9) % 10], pts[2 * i + 1]]) {
      const ux = tip[0] - cx, uy = tip[1] - cy, ul = Math.hypot(ux, uy);
      const vx = inner[0] - cx, vy = inner[1] - cy, dp = (vx * ux + vy * uy) / (ul * ul);
      let nx = vx - dp * ux, ny = vy - dp * uy; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
      const b = 0.5 + 0.5 * (nx * L[0] + ny * L[1]);
      parts.push({ d: poly([[cx, cy], tip, inner]), fill: mix('#C98206', '#FFF1B8', b) });
    }
  }
  parts.push({ d: poly(pts), fill: 'url(#gl)', op: 0.35 });
  return parts;
};

I.wrench = () => [
  { d: rrect(12, 28, 38, 8, 4), m: 'steel', depth: 3 },
  { d: circle(11, 32, 10) + circle(11, 32, 5.2), evenodd: true, m: 'steel', depth: 3 },
  { d: `M${pt(52, 32, 12, 28).join(' ')}${arcC(52, 32, 12, 28, 332)}L48.5 26.4C44.5 26.4 44.5 37.6 48.5 37.6Z`, m: 'steel', depth: 3 },
  { d: rrect(20, 26.5, 20, 11, 5.5), m: 'orange', depth: 3 },
  ...[25, 30, 35].map((x) => ({ d: `M${x} 28.5L${x} 35.5`, line: '#9A3412', lw: 1, op: 0.45 })),
];

I.clock = () => [
  { d: rrect(28, 52, 8, 6, 1.5), m: 'brass', shade: 'cylV', depth: 2 },
  { d: rrect(23, 56.5, 18, 5, 1.5), m: 'brass', depth: 2 },
  { d: circle(32, 30, 26), m: 'brass', shade: 'radial', depth: 3 },
  { d: circle(32, 30, 21), m: 'cream', shade: 'in', depth: 0, gloss: 0 },
  ...Array.from({ length: 12 }, (_, k) => {
    const a = k * 30 - 90, [xa, ya] = pt(32, 30, k % 3 ? 16.5 : 14.5, a), [xb, yb] = pt(32, 30, 18.5, a);
    return { d: `M${xa} ${ya}L${xb} ${yb}`, line: '#1B3A5C', lw: k % 3 ? 1.1 : 2 };
  }),
  { d: `M32 30L${pt(32, 30, 9.5, -150).join(' ')}`, line: '#1B3A5C', lw: 2.8 },
  { d: `M32 30L${pt(32, 30, 14, -30).join(' ')}`, line: '#1B3A5C', lw: 2 },
  { d: `M${pt(32, 30, 4, -60).join(' ')}L${pt(32, 30, 15.5, 120).join(' ')}`, line: '#EA6C0A', lw: 1.1 },
  { d: circle(32, 30, 2.5), m: 'orange', shade: 'radial', depth: 0.8 },
  { d: sector(32, 30, 15.5, 19.2, 196, 252), fill: '#fff', op: 0.6 },
];

I.house = () => house({ parts: [
  { d: rrect(15.5, 36, 8, 8, 1.5), m: 'glass', shade: 'in', depth: 0, gloss: 0 },
  { d: rrect(40.5, 36, 8, 8, 1.5), m: 'glass', shade: 'in', depth: 0, gloss: 0 },
  { d: 'M19.5 36.5L19.5 43.5M16 40L23 40M44.5 36.5L44.5 43.5M41 40L48 40', line: '#F7F2EA', lw: 1.1 },
] });
I['home-local'] = () => house({ chimney: true, parts: [
  { d: poly(starPts(32, 29, 5.6, 2.3)), m: 'amber', depth: 1 },
  { d: rrect(15.5, 38, 8, 8, 1.5), m: 'glass', shade: 'in', depth: 0, gloss: 0 },
  { d: rrect(40.5, 38, 8, 8, 1.5), m: 'glass', shade: 'in', depth: 0, gloss: 0 },
] });

I.team = () => [
  { d: 'M3 54C3 43 8.5 37.5 15.5 37.5C22.5 37.5 28 43 28 54Z', m: 'sky', depth: 2.5 },
  { d: circle(15.5, 28, 7), m: 'cream', shade: 'radial', depth: 2 },
  { d: 'M36 54C36 43 41.5 37.5 48.5 37.5C55.5 37.5 61 43 61 54Z', m: 'sky', depth: 2.5 },
  { d: circle(48.5, 28, 7), m: 'cream', shade: 'radial', depth: 2 },
  { d: 'M15 58C15 45 22.5 38 32 38C41.5 38 49 45 49 58Z', m: 'orange', depth: 3 },
  { d: circle(32, 27, 9.5), m: 'cream', shade: 'radial', depth: 2.5 },
  { d: 'M21.5 24.5C21.5 17.5 26 13 32 13C38 13 42.5 17.5 42.5 24.5Z', m: 'amber', depth: 1.5 },
  { d: rrect(19, 23, 26, 3.6, 1.8), m: 'amber', depth: 1.5 },
  { d: 'M32 14L32 22.5', line: '#A16207', lw: 1.3, op: 0.55 },
];

I.lifering = () => [
  { d: circle(32, 32, 27) + circle(32, 32, 12), evenodd: true, m: 'cream', shade: 'radial', depth: 3.5 },
  ...[45, 135, 225, 315].map((a) => ({ d: sector(32, 32, 12, 27, a - 16, a + 16), m: 'red', depth: 0, gloss: 0.7, edge: false })),
  { d: circle(32, 32, 19.5), line: '#8C7B69', lw: 1.3, dash: '2.4 2.4', op: 0.8 },
];

I.question = () => [
  sphere('orange'),
  { d: 'M24 24C24 17.5 28 13.5 32.5 13.5C37.5 13.5 41 17 41 21.5C41 26.5 36.5 28.5 34.5 30.5C33 32 32.5 33.3 32.5 36', sm: 'cream', w: 6.2, depth: 1.8 },
  { d: circle(32.5, 45.5, 3.9), m: 'cream', shade: 'radial', depth: 1.8, edge: false },
];
I.info = () => [
  sphere('water'),
  { d: 'M32 29L32 45', sm: 'cream', w: 6.4, depth: 1.8 },
  { d: circle(32, 19.5, 3.9), m: 'cream', shade: 'radial', depth: 1.8, edge: false },
];
I.alert = () => [
  sphere('red'),
  { d: 'M32 17L32 35', sm: 'cream', w: 6.4, depth: 1.8 },
  { d: circle(32, 45.5, 3.9), m: 'cream', shade: 'radial', depth: 1.8, edge: false },
];

I['arrow-right'] = () => [{ d: ARROW, m: 'orange', depth: 3, soft: 3 }];
I['arrow-left'] = () => [{ d: place(ARROW, { rot: 180 }), m: 'orange', depth: 3, soft: 3 }];
I['arrow-up'] = () => [{ d: place(ARROW, { rot: -90 }), m: 'orange', depth: 3, soft: 3 }];
I['chevron-right'] = () => [{ d: CHEVRON, m: 'orange', depth: 3, soft: 3 }];
I['chevron-down'] = () => [{ d: place(CHEVRON, { rot: 90 }), m: 'orange', depth: 3, soft: 3 }];

I.warning = () => [
  { d: 'M27.7 9.5C29.6 6.2 34.4 6.2 36.3 9.5L59.3 49.5C61.2 52.8 58.8 57 55 57L9 57C5.2 57 2.8 52.8 4.7 49.5Z', m: 'amber', depth: 3 },
  { d: 'M32 23L32 38', sm: 'dark', w: 6, depth: 1.2 },
  { d: circle(32, 47, 3.6), m: 'dark', shade: 'radial', depth: 1.2, edge: false },
];

I['burst-pipe'] = () => [
  { d: ellipse(32, 57, 24, 4), fill: '#38BDF8', op: 0.35 },
  { d: poly([[5, 32], [25, 32], [27.5, 35], [24.5, 38], [28, 41], [25, 44], [26, 47], [5, 47]]), m: 'copper', shade: 'cylH', depth: 2.5 },
  { d: poly([[59, 32], [39, 32], [36.5, 36], [39.5, 39], [36, 42], [38.5, 47], [59, 47]]), m: 'copper', shade: 'cylH', depth: 2.5 },
  { d: rrect(2, 29, 7, 21, 2), m: 'brass', shade: 'cylH', depth: 2.5 },
  { d: rrect(55, 29, 7, 21, 2), m: 'brass', shade: 'cylH', depth: 2.5 },
  { d: 'M30.5 36C28.5 27 24 22 17 19', sm: 'water', w: 3, depth: 1 },
  { d: 'M33.5 36C35.5 27 40 22 47 19', sm: 'water', w: 3, depth: 1 },
  { d: 'M32 35L32 20', sm: 'water', w: 3, depth: 1 },
  { d: drop(32, 11.5, 3.3), m: 'water', shade: 'radial', depth: 1 },
  { d: place(drop(14, 14, 2.7), { at: [14, 14], rot: -40 }), m: 'water', shade: 'radial', depth: 1 },
  { d: place(drop(50, 14, 2.7), { at: [50, 14], rot: 40 }), m: 'water', shade: 'radial', depth: 1 },
];

I['water-heater'] = () => [
  { d: rrect(17, 55, 6, 5, 1), m: 'dark', depth: 1.5 },
  { d: rrect(41, 55, 6, 5, 1), m: 'dark', depth: 1.5 },
  { d: rrect(21, 2, 6, 10, 1.5), m: 'copper', shade: 'cylV', depth: 1.5 },
  { d: rrect(37, 2, 6, 10, 1.5), m: 'copper', shade: 'cylV', depth: 1.5 },
  { d: rrect(14, 8, 36, 50, 9), m: 'cream', shade: 'cylV', depth: 3 },
  { d: 'M14 18L14 17C14 12 18 8 23 8L41 8C46 8 50 12 50 17L50 18Z', m: 'steel', shade: 'cylV', depth: 0 },
  { d: rrect(20, 22, 24, 12, 2.5), m: 'orange', depth: 0.8 },
  { d: 'M24 26.5L40 26.5M24 30.2L34 30.2', line: '#FFE8D6', lw: 1.6, op: 0.95 },
  { d: rrect(23, 39, 18, 12, 3), m: 'dark', shade: 'in', depth: 0, gloss: 0 },
  { d: flame(32, 49.5, 9, 5), m: 'orange', shade: 'radial', depth: 0, edge: false },
  { d: flame(32, 49.5, 5, 2.6), fill: '#FDE68A' },
];

I.drain = () => [
  { d: circle(32, 32, 27), m: 'steel', shade: 'radial', depth: 3 },
  { d: circle(32, 32, 20.5), m: 'steel', shade: 'in', depth: 0, gloss: 0 },
  ...Array.from({ length: 8 }, (_, k) => {
    const a = k * 45 + 22.5, [xa, ya] = pt(32, 32, 8.5, a), [xb, yb] = pt(32, 32, 16, a);
    return [{ d: `M${xa} ${ya + 0.8}L${xb} ${yb + 0.8}`, line: '#FFFFFF', lw: 3.2, op: 0.8 }, { d: `M${xa} ${ya}L${xb} ${yb}`, line: '#334155', lw: 3 }];
  }).flat(),
  ...inset(circle(32, 32, 4), '#334155', '#FFFFFF'),
  { d: arc(32, 32, 23.8, 150, 395), sm: 'water', w: 4, depth: 1.5 },
  { d: arrowHead(32, 32, 23.8, 395, 1, 5.2), m: 'water', depth: 1.5, soft: 1.2 },
];

I.leak = () => [
  { d: place(rrect(4, -4.5, 24, 9, 4.5), { at: [0, 0], to: [40, 40], rot: 45 }), m: 'orange', depth: 3 },
  { d: place(rrect(-1, -5.5, 8, 11, 2), { at: [0, 0], to: [40, 40], rot: 45 }), m: 'steel', depth: 3 },
  { d: circle(26, 26, 13.5), m: 'glass', shade: 'in', depth: 0, gloss: 0 },
  { d: drop(26, 30, 6.5), m: 'water', shade: 'radial', depth: 1.5 },
  { d: circle(26, 26, 19) + circle(26, 26, 13.5), evenodd: true, m: 'steel', depth: 3 },
  { d: sector(26, 26, 9.5, 11.6, 196, 250), fill: '#fff', op: 0.8 },
];

I.sewer = () => [
  { d: rrect(3, 20, 58, 38, 5), m: 'soil', depth: 3 },
  { d: 'M3 25C3 21 5 18.5 8.5 18.5L55.5 18.5C59 18.5 61 21 61 25L61 27L3 27Z', m: 'grass', depth: 0 },
  { d: ellipse(52, 31, 2.2, 1.4) + ellipse(45, 54, 1.8, 1.1) + ellipse(9, 53, 2, 1.2), fill: '#6B4423', op: 0.6 },
  { d: 'M3 36L61 36L61 49L3 49Z', m: 'cream', shade: 'cylH', depth: 0, edge: false },
  { d: 'M3 36L61 36M3 49L61 49', line: '#8C7B69', lw: 1, op: 0.6 },
  ...[30, 38, 46].map((x) => ({ d: `M${x} 39L${x + 3.5} 42.5L${x} 46`, line: '#0284C7', lw: 2.2 })),
  { d: rrect(12, 11, 10, 28, 1), m: 'cream', shade: 'cylV', depth: 2 },
  { d: rrect(10, 7.5, 14, 5.5, 2), m: 'steel', shade: 'cylV', depth: 2 },
];

I.sink = () => [
  { d: 'M12 40L52 40L49 55C48.6 57 47 58 45 58L19 58C17 58 15.4 57 15 55Z', m: 'steel', depth: 2 },
  { d: 'M49 24L49 37', sm: 'water', w: 2.4, depth: 0, gloss: 0 },
  { d: rrect(4, 36, 56, 7, 2.5), m: 'cream', depth: 3 },
  { d: rrect(25, 31, 10, 6, 2), m: 'steel', shade: 'cylV', depth: 2 },
  { d: 'M29 27L21 23', sm: 'steel', w: 3, depth: 1.5 },
  { d: 'M30 32L30 16C30 9 35 6 40 6C45 6 49 9 49 15L49 19', sm: 'steel', w: 5, depth: 2 },
  { d: rrect(45.5, 17.5, 7, 5, 1.5), m: 'steel', depth: 1.5 },
];

I.bathtub = () => [
  { d: 'M13 48L19 48L17 57L12 57Z', m: 'brass', depth: 1.5 },
  { d: 'M45 48L51 48L52 57L47 57Z', m: 'brass', depth: 1.5 },
  { d: 'M11 27L11 14C11 10 14 8 17 8C20 8 22 10 22 12.5', sm: 'steel', w: 3.5, depth: 1.5 },
  ...[[24, 22, 5.5], [33, 19, 6.5], [42, 22, 5], [49.5, 25, 3.5]].map(([x, y, r]) => ({ d: circle(x, y, r), m: 'glass', shade: 'radial', depth: 0 })),
  { d: 'M6 30L58 30C58 43 50 50 40 50L24 50C14 50 6 43 6 30Z', m: 'cream', depth: 3 },
  { d: rrect(3, 26, 58, 6, 3), m: 'cream', depth: 2 },
];

I.shield = () => {
  const SH = 'M32 4L54 11C54 34 46 49 32 60C18 49 10 34 10 11Z';
  return [
    { d: SH, m: 'orange', depth: 3, gloss: 0 },
    { d: 'M32 4L10 11C10 34 18 49 32 60Z', m: 'orange', depth: 0, gloss: 0.8, edge: false },
    { d: 'M32 4L54 11C54 34 46 49 32 60Z', m: 'deep', depth: 0, gloss: 0.5, edge: false },
    { d: place(SH, { at: [32, 31], s: 0.76 }), line: '#FFE0C2', lw: 1.3, op: 0.6 },
    { d: 'M22.5 32L29.5 39L42.5 24.5', sm: 'cream', w: 5.5, depth: 1.8 },
  ];
};

I.scissors = () => [
  { d: poly([[24, 36], [32, 34], [59, 25], [58, 22.5], [29, 28]]), m: 'steel', depth: 2.5 },
  { d: circle(14, 44, 9) + circle(14, 44, 5), evenodd: true, m: 'orange', depth: 2.5 },
  { d: 'M20.5 39.5L28 34', sm: 'orange', w: 5, depth: 2.5 },
  { d: poly([[24, 28], [32, 30], [59, 39], [58, 41.5], [29, 36]]), m: 'steel', depth: 2.5 },
  { d: circle(14, 20, 9) + circle(14, 20, 5), evenodd: true, m: 'orange', depth: 2.5 },
  { d: 'M20.5 24.5L28 30', sm: 'orange', w: 5, depth: 2.5 },
  { d: circle(30, 32, 2.8), m: 'brass', shade: 'radial', depth: 1 },
];

I.warranty = () => [
  { d: arc(32, 32, 22, 45, -215), sm: 'orange', w: 7, depth: 2.5 },
  { d: arrowHead(32, 32, 22, -215, -1, 7.5), m: 'orange', depth: 2.5, soft: 1.5 },
  { d: circle(32, 32, 11.5), m: 'amber', shade: 'radial', depth: 2 },
  { d: 'M26.8 32.5L30.5 36.2L37.5 28.4', sm: 'cream', w: 3.2, depth: 1 },
];

I.tag = () => [
  { d: 'M20 18L55 18C57.8 18 60 20.2 60 23L60 41C60 43.8 57.8 46 55 46L20 46C18.6 46 17.4 45.4 16.5 44.4L5.8 34.1C4.7 33 4.7 31 5.8 29.9L16.5 19.6C17.4 18.6 18.6 18 20 18Z', m: 'amber', depth: 3 },
  { d: circle(17, 32, 4.6), m: 'brass', shade: 'radial', depth: 0.8 },
  { d: circle(17, 32, 2.5), fill: '#6B4A10' },
  { d: 'M16 31C11 26 8 18 13 10C16 6 22 5 26 7', line: '#8B6F47', lw: 1.8 },
  { d: rrect(27, 26, 24, 4, 2), fill: '#FFF6D8', op: 0.9 },
  { d: rrect(27, 34, 15, 4, 2), fill: '#FFF6D8', op: 0.7 },
];

I.certificate = () => [
  { d: poly([[22, 40], [31, 44], [25, 62], [20.5, 56.5], [14, 58.5]]), m: 'orange', depth: 2 },
  { d: poly([[42, 40], [33, 44], [39, 62], [43.5, 56.5], [50, 58.5]]), m: 'deep', depth: 2 },
  { d: poly(Array.from({ length: 28 }, (_, k) => pt(32, 28, k % 2 ? 21.5 : 24.5, k * 360 / 28 - 90))), m: 'amber', depth: 3, soft: 1.5 },
  { d: circle(32, 28, 15), m: 'amber', shade: 'in', depth: 0, gloss: 0 },
  { d: poly(starPts(32, 28.5, 9.5, 4)), m: 'orange', depth: 1.2 },
];

I.trophy = () => [
  { d: 'M17 14C8 14 7 20 8 25C9 31 14 34 20 35', sm: 'amber', w: 3.5, depth: 2 },
  { d: 'M47 14C56 14 57 20 56 25C55 31 50 34 44 35', sm: 'amber', w: 3.5, depth: 2 },
  { d: 'M14 8L50 8L48 26C46.8 35 40 40 32 40C24 40 17.2 35 16 26Z', m: 'amber', depth: 3 },
  { d: rrect(12, 5, 40, 6, 3), m: 'amber', depth: 1.5 },
  { d: 'M28 39L36 39L35 47L29 47Z', m: 'amber', shade: 'cylV', depth: 2 },
  { d: rrect(20, 46, 24, 5, 2), m: 'amber', depth: 2 },
  { d: rrect(15, 50, 34, 9, 2.5), m: 'navy', depth: 3 },
  { d: rrect(25, 53, 14, 3.5, 1), fill: '#FBBF24', op: 0.9 },
  { d: poly(starPts(32, 22, 7.5, 3.2)), m: 'cream', depth: 1 },
];

I.close = () => {
  const bar = rrect(6, 26.5, 52, 11, 5.5);
  return [{ d: place(bar, { rot: 45 }) + place(bar, { rot: -45 }), m: 'slate', depth: 3 }];
};

I.truck = () => [
  { d: 'M4 20C4 16.7 6.7 14 10 14L41 14C43 14 44.8 15 45.8 16.7L52.5 28L57 29.5C59 30.2 60 31.8 60 33.8L60 44C60 45.7 58.7 47 57 47L7 47C5.3 47 4 45.7 4 44Z', m: 'cream', depth: 3 },
  { d: 'M4 33L59.9 33L60 38L4 38Z', m: 'orange', depth: 0, gloss: 0.5, edge: false },
  { d: 'M42 18C42 17.4 42.4 17 43 17L44.6 17C45.3 17 45.9 17.4 46.2 18L51 28L42 28Z', m: 'glass', shade: 'in', depth: 0, gloss: 0 },
  { d: 'M39.5 15.5L39.5 46.5', line: '#B3A392', lw: 1, op: 0.8 },
  { d: 'M14 29' + arcC(21, 29, 7, 180, 360) + 'Z', m: 'amber', depth: 0.8 },
  { d: 'M12 29L30 29', line: '#E09A0C', lw: 1.4 },
  { d: circle(17, 47, 7), m: 'dark', shade: 'radial', depth: 2 },
  { d: circle(17, 47, 3), m: 'steel', shade: 'radial', depth: 0.8 },
  { d: circle(48, 47, 7), m: 'dark', shade: 'radial', depth: 2 },
  { d: circle(48, 47, 3), m: 'steel', shade: 'radial', depth: 0.8 },
];

I.toilet = () => [
  { d: rrect(8, 6, 20, 28, 4), m: 'cream', depth: 3 },
  { d: rrect(6, 3.5, 24, 6, 2.5), m: 'cream', depth: 2 },
  { d: 'M11.5 15L18 15', sm: 'steel', w: 2.6, depth: 1 },
  { d: 'M10 33L56 33C56 43 49 49 40 50L37 50L39 58L19 58L21 48C14 45.5 10 40 10 33Z', m: 'cream', depth: 3 },
  { d: rrect(18, 29, 40, 5.5, 2.75), m: 'cream', depth: 2 },
];

I.snowflake = () => {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = k * 60 - 90, [x, y] = pt(32, 32, 26, a), [bx, by] = pt(32, 32, 15, a);
    d += `M${pt(32, 32, 6, a).join(' ')}L${x} ${y}`;
    for (const s of [-1, 1]) { const [ex, ey] = pt(bx, by, 8, a + s * 45); d += `M${bx} ${by}L${ex} ${ey}`; }
  }
  return [
    { d, sm: 'ice', w: 4.2, depth: 2 },
    { d: poly(Array.from({ length: 6 }, (_, k) => pt(32, 32, 7.5, k * 60 - 90))), m: 'ice', shade: 'radial', depth: 2, soft: 1.5 },
  ];
};

I.print = () => [
  { d: rrect(17, 6, 30, 22, 1.5), m: 'paper', depth: 1 },
  { d: rrect(5, 22, 54, 24, 6), m: 'steel', depth: 3 },
  { d: rrect(13, 37, 38, 3.5, 1.75), fill: '#334155' },
  { d: 'M16 39L48 39L48 57C48 58 47 59 46 59L18 59C17 59 16 58 16 57Z', m: 'cream', depth: 1.2 },
  { d: 'M21 46L43 46M21 51L37 51', line: '#94A3B8', lw: 1.6 },
  { d: circle(51, 29.5, 2.2), m: 'green', shade: 'radial', depth: 0.5, edge: false },
];

I.pause = () => [{ d: rrect(14, 10, 12, 44, 4.5) + rrect(38, 10, 12, 44, 4.5), m: 'cream', depth: 3 }];
I.play = () => [{ d: poly([[18, 9], [55, 32], [18, 55]]), m: 'cream', depth: 3, soft: 5 }];

I.send = () => [
  { d: poly([[4, 30], [60, 6], [26, 41]]), m: 'cream', depth: 1.2 },
  { d: poly([[26, 41], [60, 6], [38, 58]]), m: 'paper', depth: 1.2 },
  { d: poly([[26, 41], [28.5, 55], [36, 49]]), fill: '#BFAF98' },
];

I.moon = () => [
  { d: 'M36 6C22 7 10 18.5 10 33C10 47.9 22.1 60 37 60C46 60 54 55.5 58.5 48.5C55.9 49.5 53 50 50 50C36.2 50 25 38.8 25 25C25 17.3 28.5 10.4 34 6.2Z', m: 'amber', depth: 3 },
  { d: circle(18, 38, 2.6) + circle(27, 50, 1.9) + circle(16, 27, 1.5), m: 'amber', shade: 'in', depth: 0, gloss: 0, edge: false },
  { d: poly(starPts(47, 17, 8, 2.2, 4)), m: 'cream', depth: 1 },
  { d: poly(starPts(56, 31, 4.5, 1.3, 4)), m: 'cream', depth: 0.8 },
];

I.lock = () => [
  { d: 'M20 32L20 20C20 12.3 25.4 7 32 7C38.6 7 44 12.3 44 20L44 32', sm: 'steel', w: 6, depth: 2, cap: 'butt' },
  { d: rrect(10, 28, 44, 31, 8), m: 'brass', depth: 3 },
  ...inset('M32 35.5C34.5 35.5 36.5 37.5 36.5 40C36.5 41.6 35.7 43 34.4 43.8L35.5 51L28.5 51L29.6 43.8C28.3 43 27.5 41.6 27.5 40C27.5 37.5 29.5 35.5 32 35.5Z', '#5B3A0A', '#FFE7A8'),
];

I['id-card'] = () => [
  { d: rrect(25, 4, 14, 9, 3), m: 'steel', depth: 1.5 },
  { d: rrect(4, 10, 56, 42, 6), m: 'cream', depth: 2.5 },
  { d: 'M4 16C4 12.7 6.7 10 10 10L54 10C57.3 10 60 12.7 60 16L60 20L4 20Z', m: 'orange', depth: 0, gloss: 0.6, edge: false },
  { d: rrect(26, 13, 12, 3, 1.5), fill: '#9A3412', op: 0.8 },
  { d: rrect(10, 25, 17, 20, 3), m: 'sky', shade: 'in', depth: 0, gloss: 0 },
  { d: circle(18.5, 32, 3.6) + 'M12 45C12 39.5 14.8 37.5 18.5 37.5C22.2 37.5 25 39.5 25 45Z', fill: '#fff', op: 0.95 },
  { d: rrect(32, 27, 21, 3.6, 1.8), fill: '#1B3A5C', op: 0.85 },
  { d: rrect(32, 34, 16, 3, 1.5) + rrect(32, 40, 19, 3, 1.5), fill: '#A8B4C4' },
  { d: circle(52, 48, 8), m: 'green', shade: 'radial', depth: 2 },
  { d: 'M48.3 48.2L51 51L55.8 45.6', sm: 'cream', w: 2.4, depth: 0.8 },
];

I.headset = () => [
  { d: arc(32, 34, 21, 180, 360), sm: 'slate', w: 5, depth: 2 },
  { d: rrect(5, 29, 13, 20, 5.5), m: 'orange', depth: 3 },
  { d: rrect(46, 29, 13, 20, 5.5), m: 'orange', depth: 3 },
  { d: 'M11 48C11 55 16 58 24 58L27 58', sm: 'slate', w: 3, depth: 1.5 },
  { d: rrect(25.5, 54.5, 9, 7, 3.5), m: 'dark', depth: 1.5 },
];

I.contract = () => {
  const PEN = rrect(0, -3.5, 26, 7, 3.5);
  const pen = (d) => place(d, { at: [34, 0], to: [42, 50], rot: 135 });
  return [
    { d: 'M10 8C10 5.8 11.8 4 14 4L38 4L50 16L50 56C50 58.2 48.2 60 46 60L14 60C11.8 60 10 58.2 10 56Z', m: 'cream', depth: 2.5 },
    { d: 'M38 4L38 13C38 14.7 39.3 16 41 16L50 16Z', m: 'paper', depth: 0.8 },
    { d: 'M17 16L31 16', line: '#1B3A5C', lw: 2.6, op: 0.85 },
    { d: 'M17 24L43 24M17 31L43 31M17 38L36 38', line: '#A8B4C4', lw: 2 },
    { d: 'M16 52L36 52', line: '#C9BBA6', lw: 1.2 },
    { d: 'M16 49C19 43 21 43 21 47C21 51 24 44 26 45C28 46 27 50 30 48', line: '#1B3A5C', lw: 1.8 },
    { d: pen(poly([[26, -3.5], [34, 0], [26, 3.5]])), m: 'brass', depth: 2 },
    { d: pen(PEN), m: 'orange', depth: 2.5 },
    { d: pen(rrect(17, -3.8, 3.2, 7.6, 1)), m: 'steel', depth: 0.8 },
  ];
};

I.valve = () => [
  { d: rrect(2, 38, 60, 12, 1.5), m: 'copper', shade: 'cylH', depth: 2.5 },
  { d: rrect(18, 35, 5, 18, 1.5), m: 'brass', shade: 'cylH', depth: 2.5 },
  { d: rrect(41, 35, 5, 18, 1.5), m: 'brass', shade: 'cylH', depth: 2.5 },
  { d: 'M22 32C22 30 23.5 28.5 25.5 28.5L38.5 28.5C40.5 28.5 42 30 42 32L42 52C42 55 40 57 37 57L27 57C24 57 22 55 22 52Z', m: 'brass', depth: 3 },
  { d: rrect(27, 22, 10, 8, 1.5), m: 'brass', shade: 'cylV', depth: 2 },
  { d: rrect(30, 12, 4, 12, 1), m: 'steel', shade: 'cylV', depth: 1.5 },
  { d: 'M20.5 13L43.5 13M32 8L32 18', sm: 'red', w: 2.4, depth: 1 },
  { d: ellipse(32, 13, 19, 7) + ellipse(32, 13, 12.5, 4.2), evenodd: true, m: 'red', depth: 3.5 },
  { d: ellipse(32, 13, 3.6, 2.2), m: 'red', shade: 'radial', depth: 1 },
];

I['credit-card'] = () => [
  { d: place(rrect(0, 0, 50, 32, 5), { at: [25, 16], to: [35, 24], rot: -12 }), m: 'orange', depth: 2.5 },
  { d: rrect(4, 24, 50, 32, 5), m: 'navy', depth: 2.5 },
  { d: rrect(10, 32, 10, 8, 2), m: 'amber', depth: 0.5 },
  { d: 'M10 36L20 36M15 32L15 40', line: '#A16207', lw: 0.8, op: 0.6 },
  { d: Array.from({ length: 4 }, (_, g) => [0, 1, 2].map((k) => circle(11 + g * 10 + k * 2.6, 48, 1)).join('')).join(''), fill: '#DDE8F5' },
  { d: arc(42, 36, 3, -45, 45) + arc(42, 36, 6, -45, 45) + arc(42, 36, 9, -45, 45), line: '#DDE8F5', lw: 1.5, op: 0.9 },
];

I.broom = () => {
  const at = (d) => place(d, { at: [0, 0], to: [34.5, 34], rot: 30 });
  return [
    { d: 'M50 4L35 31', sm: 'wood', w: 4.2, depth: 2 },
    { d: at('M-7 3L7 3L13 29C6 31 -6 31 -13 29Z'), m: 'straw', depth: 2.5 },
    { d: at('M-3 6L-6.5 28M0 6L0 29M3 6L6.5 28'), line: '#8A6417', lw: 1, op: 0.55 },
    { d: at(rrect(-8, -3, 16, 6.5, 2)), m: 'brass', depth: 2 },
    { d: poly(starPts(52, 46, 5.5, 1.6, 4)), m: 'amber', depth: 1 },
    { d: poly(starPts(45, 56, 3.5, 1.1, 4)), m: 'amber', depth: 0.8 },
  ];
};

I.check = () => [{ d: poly([[5, 33], [14, 24], [25, 35], [50, 10], [59, 19], [25, 53]]), m: 'green', depth: 3, soft: 3 }];
I['check-circle'] = () => [sphere('green'), { d: 'M19 33L28 42L45 23', sm: 'cream', w: 6.5, depth: 2 }];

/* Icons that read as physical objects get a ground shadow. */
const OPTS = {
  pin: { shadow: true }, wrench: { shadow: true, rot: -40 }, house: { shadow: true }, 'home-local': { shadow: true },
  team: { shadow: true }, 'water-heater': { shadow: true }, bathtub: { shadow: true }, toilet: { shadow: true },
  truck: { shadow: true }, trophy: { shadow: true }, send: { shadow: true }, clock: { shadow: true },
  leak: { shadow: true }, valve: { shadow: true }, sink: { shadow: true }, headset: { shadow: true },
  lock: { shadow: true }, print: { shadow: true }, tag: { rot: -30 }, broom: { shadow: true },
};

mkdirSync(OUT, { recursive: true });
const names = Object.keys(I).sort();
for (const name of names) writeFileSync(join(OUT, name + '.svg'), render(I[name](), OPTS[name]));

const css = `/* Generated by scripts/build-icons.mjs. Do not edit by hand. */
.ico {
  display: inline-block;
  flex-shrink: 0;
  width: 1.3em;
  height: 1.3em;
  vertical-align: -0.3em;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  background-origin: content-box;
}
${names.map((n) => `.ico-${n} { background-image: url(../icons/${n}.svg); }`).join('\n')}
`;
writeFileSync(join(ROOT, 'assets', 'css', 'icons.css'), css);
console.log(`Wrote ${names.length} icons to assets/icons and assets/css/icons.css`);

/* Contact sheet for checking the set by eye: node scripts/build-icons.mjs --preview <file> */
const pi = process.argv.indexOf('--preview');
if (pi > -1) {
  const rel = (n) => 'file:///' + join(OUT, n + '.svg').replace(/\\/g, '/');
  const row = (bg, size) => `<div style="background:${bg};padding:10px;display:flex;flex-wrap:wrap;gap:10px">${names.map((n) => `<img src="${rel(n)}" width="${size}" height="${size}" title="${n}">`).join('')}</div>`;
  const labels = `<div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px;font:10px sans-serif">${names.map((n) => `<div style="width:72px;text-align:center"><img src="${rel(n)}" width="64" height="64"><br>${n}</div>`).join('')}</div>`;
  writeFileSync(process.argv[pi + 1], `<!doctype html><body style="margin:0;background:#fff">${labels}${row('#ffffff', 40)}${row('#0D1B2A', 40)}${row('#C2410C', 24)}${row('#ffffff', 18)}</body>`);
}
