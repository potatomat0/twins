export type ThemeSpec = {
  colors: Record<string, string>; // values are "r g b" triplets
};

export type ThemeName = 'dark' | 'light' | 'system';

export const themes: Record<Exclude<ThemeName, 'system'>, ThemeSpec> = {
  dark: {
    colors: {
      '--bg': '16 17 24',
      '--surface': '28 30 40',
      '--border': '82 84 104',
      '--text-primary': '231 233 243',
      '--text-secondary': '182 186 205',
      '--text-muted': '136 140 165',
      '--focus': '176 134 255',
      '--brand-primary': '129 140 255',
      '--accent-cyan': '45 212 191',
      '--danger': '248 113 113',
      '--warning': '249 168 37',
      '--neutral': '148 163 184'
    }
  },
  light: {
    colors: {
      '--bg': '250 247 255',
      '--surface': '255 255 255',
      '--border': '204 206 224',
      '--text-primary': '28 28 36',
      '--text-secondary': '92 94 112',
      '--text-muted': '136 138 158',
      '--focus': '112 84 212',
      '--brand-primary': '88 80 236',
      '--accent-cyan': '6 182 212',
      '--danger': '220 38 38',
      '--warning': '245 158 11',
      '--neutral': '107 114 128'
    }
  }
};

export function toRgb(triplet: string) {
  return `rgb(${triplet.split(' ').join(', ')})`;
}

export function toRgba(triplet: string, a = 1) {
  return `rgba(${triplet.split(' ').join(', ')}, ${a})`;
}
