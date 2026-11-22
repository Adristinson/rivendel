import { describe, expect, it } from 'vitest';
import { complete, dueLabel, dueToday, nextDue, sortOpen } from './todos';
import type { Todo } from './types';

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
