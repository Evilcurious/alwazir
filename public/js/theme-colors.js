/* ============================================================
   ALWAZIR — two-colour theme engine
   Turns the two colours chosen in the admin panel (a background colour and an
   accent colour) into the full set of CSS variables the storefront is styled
   with: shades/tints of the accent, borders, gradient, readable text, shadows…

   Loaded by the browser as `window.AlwazirThemeColors` and required by the
   server (lib/app.js) so the colours injected before first paint are exactly
   the ones the page applies with JS.
   ============================================================ */

(function (factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AlwazirThemeColors = api;
})(function () {
  /* Defaults when the admin has not picked colours yet (the gold theme). */
  const DEFAULT_CUSTOM = { bg: '#ffffff', accent: '#c9a227' };

  /* Every variable the custom theme may set — used to clear them again when
     the admin switches back to one of the built-in themes. */
  const VAR_NAMES = [
    '--bg',
    '--bg-soft',
    '--card',
    '--text',
    '--muted',
    '--border',
    '--accent',
    '--accent-strong',
    '--accent-soft',
    '--accent-ghost',
    '--gold-gradient',
    '--on-accent',
    '--header-bg',
    '--input-bg',
    '--shadow',
    '--shadow-sm',
    '--danger'
  ];

  const WHITE = { r: 255, g: 255, b: 255 };
  const BLACK = { r: 0, g: 0, b: 0 };

  /* Accepts #abc, #aabbcc, abc, aabbcc (any case) -> {r,g,b} or null */
  function parseHex(value) {
    if (typeof value !== 'string') return null;
    let v = value.trim().replace(/^#/, '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    if (!/^[0-9a-f]{6}$/i.test(v)) return null;
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16)
    };
  }

  function isHex(value) {
    return !!parseHex(value);
  }

  /* Returns '#rrggbb' (or `fallback` when the value is not a colour). */
  function normalizeHex(value, fallback) {
    const c = parseHex(value);
    if (c) return toHex(c);
    if (fallback === undefined) return null;
    const f = parseHex(fallback);
    return f ? toHex(f) : null;
  }

  function toHex(c) {
    const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }

  /* t = 0 -> a, t = 1 -> b */
  function mix(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return toHex({
      r: a.r + (b.r - a.r) * k,
      g: a.g + (b.g - a.g) * k,
      b: a.b + (b.b - a.b) * k
    });
  }

  function rgba(c, alpha) {
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + alpha + ')';
  }

  /* Relative luminance (0 = black, 1 = white) — decides light vs dark styling. */
  function luminance(c) {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  /* Dark or light text that stays readable on top of the accent colour
     (e.g. gold / light accents get dark text, deep accents get white text). */
  function readableOn(c) {
    return luminance(c) > 0.25 ? mix(c, BLACK, 0.85) : mix(c, WHITE, 0.95);
  }

  function resolve(bgValue, accentValue) {
    const bg = parseHex(bgValue) || parseHex(DEFAULT_CUSTOM.bg);
    const accent = parseHex(accentValue) || parseHex(DEFAULT_CUSTOM.accent);
    return { bg, accent };
  }

  /* The whole palette, derived from the two chosen colours. */
  function deriveVars(bgValue, accentValue) {
    const { bg, accent } = resolve(bgValue, accentValue);
    const dark = luminance(bg) < 0.42;

    const accentStrong = dark ? mix(accent, WHITE, 0.2) : mix(accent, BLACK, 0.2);
    const accentLight = mix(accent, WHITE, 0.3);
    const text = dark ? mix(bg, WHITE, 0.92) : mix(bg, BLACK, 0.87);
    const muted = dark ? mix(bg, WHITE, 0.62) : mix(bg, BLACK, 0.46);
    const border = mix(bg, accent, dark ? 0.26 : 0.24);
    const card = dark ? mix(bg, accent, 0.035) : mix(bg, WHITE, 0.55);

    return {
      '--bg': toHex(bg),
      '--bg-soft': mix(bg, accent, dark ? 0.07 : 0.06),
      '--card': card,
      '--text': text,
      '--muted': muted,
      '--border': border,
      '--accent': toHex(accent),
      '--accent-strong': accentStrong,
      '--accent-soft': mix(bg, accent, dark ? 0.18 : 0.16),
      '--accent-ghost': rgba(accent, dark ? 0.14 : 0.1),
      '--gold-gradient':
        'linear-gradient(135deg, ' + accentLight + ' 0%, ' + toHex(accent) + ' 50%, ' + accentStrong + ' 100%)',
      '--on-accent': readableOn(accent),
      '--header-bg': rgba(bg, 0.9),
      '--input-bg': dark ? mix(bg, WHITE, 0.08) : mix(bg, WHITE, 0.75),
      '--shadow': '0 24px 60px ' + rgba(accent, dark ? 0.3 : 0.16),
      '--shadow-sm': '0 8px 24px ' + rgba(accent, dark ? 0.26 : 0.14),
      '--danger': dark ? '#ff7a85' : '#b23a48'
    };
  }

  /* Stylesheet text for the pre-paint injection (server side). */
  function styleText(bgValue, accentValue) {
    const vars = deriveVars(bgValue, accentValue);
    return (
      "html[data-theme='custom']{" +
      Object.keys(vars)
        .map((name) => name + ':' + vars[name])
        .join(';') +
      '}'
    );
  }

  return {
    DEFAULT_CUSTOM,
    VAR_NAMES,
    isHex,
    parseHex,
    normalizeHex,
    toHex,
    mix,
    rgba,
    luminance,
    readableOn,
    deriveVars,
    styleText
  };
});
