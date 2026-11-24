import { describe, expect, it } from 'vitest';
import { balance, byMonth, frequentConcepts, parseAmount, settlements } from './accounts';
import type { LedgerEntry } from './types';

const A = 'adri', B = 'almu';
let n = 0;
const E = (p: Partial<LedgerEntry>): LedgerEntry => ({
  id: `e${++n}`, household_id: 'h', kind: 'gasto', amount: 10, concept: 'Súper', paid_by: A, other_user: B,
  payer_share: 50, date: '2026-11-10', created_by: null, created_at: `2026-11-10T10:0${n % 10}:00Z`, updated_at: '', ...p,
});

describe('saldo', () => {
  it('a medias: el otro debe la mitad', () => {
    expect(balance([E({ amount: 60 })], A, B)).toBe(30);
    expect(balance([E({ amount: 60 })], B, A)).toBe(-30);
  });
  it('gastos de los dos se compensan', () => {
    expect(balance([E({ amount: 60 }), E({ amount: 20, paid_by: B, other_user: A })], A, B)).toBe(20);
  });
  it('reparto personalizado: todo del otro', () => {
    expect(balance([E({ amount: 40, payer_share: 0 })], A, B)).toBe(40);
  });
  it('un pago salda la deuda', () => {
    const list = [E({ amount: 60 }), E({ kind: 'pago', amount: 30, paid_by: B, other_user: A })];
    expect(balance(list, A, B)).toBe(0);
  });
  it('redondea a céntimos', () => {
    expect(balance([E({ amount: 10.01 })], A, B)).toBe(5.01);
  });
});

describe('importes', () => {
  it.each([['12,5', 12.5], ['12.50', 12.5], ['1.234,56', 1234.56], ['7 €', 7], ['0', null], ['abc', null], ['-3', null]])('%s', (s, v) => {
    expect(parseAmount(s)).toBe(v);
  });
});

describe('historial', () => {
  it('agrupa por mes y suma solo gastos', () => {
    const g = byMonth([E({ amount: 10, date: '2026-11-02' }), E({ amount: 5, date: '2026-10-30' }), E({ kind: 'pago', amount: 99, date: '2026-11-05' })]);
    expect(g.map((x) => [x.month, x.spent])).toEqual([['2026-11', 10], ['2026-10', 5]]);
  });
  it('conceptos más usados primero', () => {
    const c = frequentConcepts([E({ concept: 'Gasolina' }), E({ concept: 'gasolina' }), E({ concept: 'Súper' })]);
    expect(c.slice(0, 2)).toEqual(['Gasolina', 'Súper']);
    expect(c).toContain('Guardería');
  });
});

describe('histórico de saldos', () => {
  it('cada pago que deja las cuentas a cero cierra un periodo', () => {
    const list = [
      E({ id: 'g1', amount: 60, date: '2026-10-02' }),
      E({ id: 'g2', amount: 20, paid_by: B, other_user: A, date: '2026-10-15' }),
      E({ id: 'p1', kind: 'pago', amount: 20, paid_by: B, other_user: A, date: '2026-10-31' }),
      E({ id: 'g3', amount: 40, date: '2026-11-05' }),
      E({ id: 'p2', kind: 'pago', amount: 5, paid_by: B, other_user: A, date: '2026-11-06' }), // pago parcial: no cierra
    ];
    const { closed, open } = settlements(list, A, B);
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({ id: 'p1', date: '2026-10-31', spent: 80, from: '2026-10-02' });
    expect(closed[0].entries.map((e) => e.id)).toEqual(['g2', 'g1']);
    expect(open.map((e) => e.id)).toEqual(['g3', 'p2']);
  });
  it('sin pagos no hay histórico', () => {
    expect(settlements([E({})], A, B)).toMatchObject({ closed: [], open: [{}] });
  });
});
