export interface Tone {
  bg: string;
  fg: string;
  dot: string;
}

export const TONES: Record<string, Tone> = {
  green: { bg: '#E2F3DF', fg: '#1E6A2B', dot: '#43A047' },
  blue: { bg: '#E1ECFB', fg: '#1D4E8F', dot: '#3D7BD9' },
  red: { bg: '#FCE4DF', fg: '#9A2E1E', dot: '#E0563E' },
  amber: { bg: '#FCEBCB', fg: '#7F4D00', dot: '#E59A1A' },
  purple: { bg: '#ECE4FA', fg: '#5A3797', dot: '#8A62D6' },
  teal: { bg: '#DDF2F1', fg: '#16625D', dot: '#26A69A' },
  sea: { bg: '#DCEFF8', fg: '#0F5878', dot: '#2A8DBF' },
  pink: { bg: '#FBE3EF', fg: '#8E2459', dot: '#D9558F' },
  gray: { bg: '#ECEDEA', fg: '#454B47', dot: '#8C928E' },
};

export const COLOR_NAMES: Record<string, string> = {
  green: 'Verde',
  blue: 'Azul',
  red: 'Coral',
  amber: 'Ámbar',
  purple: 'Morado',
  teal: 'Turquesa',
  sea: 'Azul mar',
  pink: 'Rosa',
  gray: 'Gris',
};

export function tone(color: string | undefined): Tone {
  return TONES[color ?? 'gray'] ?? TONES.gray;
}
