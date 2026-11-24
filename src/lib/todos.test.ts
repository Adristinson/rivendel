import { describe, expect, it } from 'vitest';
import { complete, dueLabel, dueToday, frozenLabel, lastDone, nextDue, setLastDone, sortFreezer, sortOpen } from './todos';
import type { FreezerItem, Todo } from './types';

const T = (p: Partial<Todo>): Todo => ({
  id: Math.random().toString(), household_id: 'h', list: 'casa', text: 'x', note: null, due: null, repeat: null, tags: [],
  done: false, done_at: null, created_by: null, created_at: '2026-11-01T00:00:00Z', updated_at: '', ...p,
});

describe('repetición', () => {
  it('semanal, quincenal y mensual', () => {
    expect(nextDue('2026-11-22', 'semanal')).toBe('2026-11-29');
    expect(nextDue('2026-11-22', 'quincenal')).toBe('2026-12-06');
    expect(nextDue('2026-01-31', 'mensual')).toBe('2026-02-28');
    expect(nextDue('2026-12-15', 'mensual')).toBe('2027-01-15');
  });
  it('al hacer una tarea repetida, sigue abierta con la próxima fecha', () => {
    const t = complete(T({ due: '2026-11-22', repeat: 'semanal' }), '2026-11-22', 'now');
    expect(t.done).toBe(false);
    expect(t.due).toBe('2026-11-29');
  });
  it('si estaba atrasada, cuenta desde hoy', () => {
    expect(complete(T({ due: '2026-11-01', repeat: 'semanal' }), '2026-11-22', 'now').due).toBe('2026-11-29');
  });
  it('una tarea normal se marca y desmarca', () => {
    const t = complete(T({}), '2026-11-22', 'now');
    expect(t.done).toBe(true);
    expect(complete(t, '2026-11-22', 'later').done).toBe(false);
  });
});

describe('filtro del agua (cada 3 meses)', () => {
  it('trimestral, semestral y anual', () => {
    expect(nextDue('2026-11-30', 'trimestral')).toBe('2027-02-28');
    expect(nextDue('2026-11-24', 'semestral')).toBe('2027-05-24');
    expect(nextDue('2026-11-24', 'anual')).toBe('2027-11-24');
  });
  it('cuenta desde el día en que se cambia y guarda el historial', () => {
    let t = T({ text: 'Cambiar el filtro del agua', repeat: 'trimestral', due: '2026-12-01' });
    t = complete(t, '2026-11-24', 'now');
    expect(t.due).toBe('2027-02-24');
    t = complete(t, '2027-03-10', 'now'); // se hizo tarde
    expect(t.due).toBe('2027-06-10');
    expect(t.done_log).toEqual(['2026-11-24', '2027-03-10']);
    expect(lastDone(t)).toBe('2027-03-10');
  });
  it('corregir la última vez recalcula la próxima', () => {
    const t = setLastDone(T({ repeat: 'trimestral' }), '2026-10-05', 'now');
    expect(t.done_log).toEqual(['2026-10-05']);
    expect(t.due).toBe('2027-01-05');
    expect(setLastDone(t, '2026-10-20', 'now').done_log).toEqual(['2026-10-20']);
  });
});

describe('aviso en Hoy', () => {
  it('el filtro se queda en Hoy desde el día que toca hasta marcarlo', () => {
    const f = T({ id: 'f', text: 'Cambiar el filtro del agua', repeat: 'trimestral', due: '2027-02-24' });
    expect(dueToday([f], '2027-02-23')).toHaveLength(0);
    expect(dueToday([f], '2027-02-24')).toHaveLength(1);
    expect(dueToday([f], '2027-03-15')).toHaveLength(1);
    expect(dueToday([complete(f, '2027-03-15', 'now')], '2027-03-15')).toHaveLength(0);
  });
  it('una tarea que se repite sin fecha aún sale en Hoy', () => {
    expect(dueToday([T({ repeat: 'trimestral', due: null })], '2026-11-24')).toHaveLength(1);
  });
});

describe('congelador', () => {
  const F = (p: Partial<FreezerItem>): FreezerItem => ({ id: 'x', household_id: 'h', name: 'Lentejas', portions: 2, frozen_on: '2026-11-01', note: null, created_by: null, created_at: '', updated_at: '', ...p });
  it('antigüedad y aviso a los 3 meses', () => {
    expect(frozenLabel(F({}), '2026-11-01').text).toBe('Congelado hoy');
    expect(frozenLabel(F({}), '2026-11-08').text).toBe('Hace 7 días');
    expect(frozenLabel(F({}), '2026-11-29').text).toBe('Hace 4 semanas');
    expect(frozenLabel(F({}), '2027-01-29').old).toBe(false);
    expect(frozenLabel(F({}), '2027-02-01')).toEqual({ text: 'Hace 3 meses', old: true });
  });
  it('lo más antiguo primero y sin lo que se ha acabado', () => {
    const l = sortFreezer([F({ id: 'a', frozen_on: '2026-11-10' }), F({ id: 'b', frozen_on: '2026-09-01' }), F({ id: 'c', portions: 0 })]);
    expect(l.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('orden y hoy', () => {
  it('primero con fecha, después sin fecha (más nuevos arriba)', () => {
    const list = sortOpen([T({ text: 'a', created_at: '1' }), T({ text: 'b', due: '2026-12-01' }), T({ text: 'c', created_at: '2' }), T({ text: 'd', due: '2026-11-25' })]);
    expect(list.map((t) => t.text)).toEqual(['d', 'b', 'c', 'a']);
  });
  it('hoy incluye atrasadas, no ideas ni hechas', () => {
    const list = dueToday([T({ text: 'a', due: '2026-11-20' }), T({ text: 'b', due: '2026-11-22' }), T({ text: 'c', due: '2026-11-23' }), T({ text: 'd', due: '2026-11-22', list: 'ideas' }), T({ text: 'e', due: '2026-11-21', done: true })], '2026-11-22');
    expect(list.map((t) => t.text)).toEqual(['a', 'b']);
  });
  it('etiquetas de fecha', () => {
    expect(dueLabel('2026-11-21', '2026-11-22')).toMatchObject({ text: 'Ayer', tone: 'late' });
    expect(dueLabel('2026-11-22', '2026-11-22')?.text).toBe('Hoy');
    expect(dueLabel('2026-11-23', '2026-11-22')?.text).toBe('Mañana');
  });
});
