export interface CanvasTheme {
  bg: string;
  elevated: string;
  surface: string;
  fg: string;
  muted: string;
  faint: string;
  copper: string;
  border: string;
  danger: string;
  warn: string;
  ok: string;
  paper: string;
}

export function readCanvasTheme(el: HTMLElement = document.documentElement): CanvasTheme {
  const s = getComputedStyle(el);
  const v = (name: string, fallback: string) => {
    const x = s.getPropertyValue(name).trim();
    return x || fallback;
  };
  return {
    bg: v("--color-bg", "#0c0c0d"),
    elevated: v("--color-bg-elevated", "#141312"),
    surface: v("--color-surface", "#1a1816"),
    fg: v("--color-fg", "#f3efe6"),
    muted: v("--color-muted", "#9a9488"),
    faint: v("--color-faint", "#6b665c"),
    copper: v("--color-copper", "#c4896a"),
    border: v("--color-border", "#2c2925"),
    danger: v("--color-danger", "#d07060"),
    warn: v("--color-warn", "#c9a15b"),
    ok: v("--color-ok", "#7d9a78"),
    paper: v("--color-paper", "#f3efe6"),
  };
}
