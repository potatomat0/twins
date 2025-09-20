export type ThemeSpec = {
  colors: Record<string, string>; // values are "r g b" triplets
};

export type ThemeName = 'dark' | 'light';

export const themes: Record<ThemeName, ThemeSpec> = {
  dark: {
    colors: {
      '--bg': '11 11 14',
      '--surface': '20 20 24',
      '--border': '255 255 255',
      '--text-primary': '240 240 245',
      '--text-secondary': '180 180 190',
      '--brand-primary': '99 102 241',
      '--accent-cyan': '34 211 238',
      '--danger': '239 68 68',
      '--warning': '234 179 8',
      '--neutral': '120 120 130'
    }
  },
  light: {
    colors: {
      '--bg': '141 95 140',
      '--surface': '255 255 255',
      '--border': '0 0 0',
      '--text-primary': '20 20 24',
      '--text-secondary': '107 63 105',
      '--brand-primary': '79 70 229',
      '--accent-cyan': '14 165 233',
      '--danger': '220 38 38',
      '--warning': '202 138 4',
      '--neutral': '108 115 125'
    }
  }
};

export function toRgb(triplet: string) {
  return `rgb(${triplet.split(' ').join(', ')})`;
}

export function toRgba(triplet: string, a = 1) {
  return `rgba(${triplet.split(' ').join(', ')}, ${a})`;
}
