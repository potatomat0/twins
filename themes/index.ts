export type ThemeSpec = {
  colors: Record<string, string>; // values are "r g b" triplets
};

export type ThemeName = 'dark';

export const themes: Record<ThemeName, ThemeSpec> = {
  dark: {
    colors: {
      '--dark-bg': '11 11 14',
      '--dark-card': '20 20 24',
      '--text-primary': '240 240 245',
      '--text-secondary': '180 180 190',
      '--brand-primary': '99 102 241',
      '--accent-cyan': '34 211 238',
      '--danger': '239 68 68',
      '--warning': '234 179 8',
      '--neutral': '120 120 130'
    }
  }
};

export function toRgb(triplet: string) {
  return `rgb(${triplet.split(' ').join(', ')})`;
}

export function toRgba(triplet: string, a = 1) {
  return `rgba(${triplet.split(' ').join(', ')}, ${a})`;
}
