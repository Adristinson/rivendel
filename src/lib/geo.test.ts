import { describe, expect, it } from 'vitest';
import { countryAt, MAP, projection } from './geo';

describe('mapa de países', () => {
  it('sabe en qué país cae cada sitio, también en la costa', () => {
    expect(countryAt(-3.7, 40.4)).toBe('724'); // Madrid
    expect(countryAt(-8.61, 41.15)).toBe('620'); // Oporto (costa)
    expect(countryAt(12.49, 41.89)).toBe('380'); // Roma
    expect(countryAt(-6.29, 36.53)).toBe('724'); // Cádiz (costa)
    expect(countryAt(-30, 30)).toBeNull(); // en mitad del Atlántico
  });
  it('Europa encuadra la península y Escandinavia', () => {
    const p = projection('europe');
    for (const c of [[-8.6, 41.1], [12.5, 41.9], [18, 59.3], [-21.9, 64.1]] as [number, number][]) {
      const [x, y] = p(c)!;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP.europe.w);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP.europe.h);
    }
  });
});
