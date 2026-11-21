import { useState } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { Meal } from '../lib/types';
import type { Ctx } from '../lib/logic';
import { groupPending } from '../lib/logic';
import { proposeTodayOps, todayMenu } from './Comida';
import { Chevron } from '../icons';

function saludo() {
  const h = new Date().getHours();
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export function Hoy({
  store,
  state,
  ctx,
  name,
  goCompra,
  goComida,
}: {
  store: Store;
  state: StoreState;
  ctx: Ctx;
  name: string;
  goCompra: () => void;
  goComida: () => void;
}) {
  const groups = groupPending(state.data);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const f = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fecha = f.charAt(0).toUpperCase() + f.slice(1);
  const menu = todayMenu(state.data);
  const [rejected, setRejected] = useState<Record<Meal, Set<string>>>({ comida: new Set(), cena: new Set() });
  const [proposed, setProposed] = useState<Record<Meal, string | null>>({ comida: null, cena: null });

  function propose(meal: Meal) {
    const current = proposed[meal];
    const rej = new Set(rejected[meal]);
    if (current) rej.add(current);
    const { ops, recipe } = proposeTodayOps(state.data, ctx, meal, rej);
    setRejected({ ...rejected, [meal]: rej });
    setProposed({ ...proposed, [meal]: recipe?.id ?? null });
    store.dispatch(ops);
  }

  return (
    <div className="screen">
      <header className="band">
        <div>
          <div className="band-kicker">{fecha}</div>
          <h1>
            {saludo()}, {name}
          </h1>
        </div>
      </header>
      <div className="scroll">
        <section className="group">
          <h2 className="group-title" style={{ background: '#FFE2C6', color: '#8A3B00' }}>
            Menú de hoy
          </h2>
          {menu.weekend ? (
            <div className="hint-card">
              Fin de semana: sin menú. Buen momento para preparar el de la semana que viene.
              <button className="link-btn" onClick={goComida}>
                Ir al menú
              </button>
            </div>
          ) : state.data.recipes.length === 0 && !menu.comida && !menu.cena ? (
            <div className="hint-card">
              Guardad algunas recetas y la app os propondrá qué comer.
              <button className="link-btn" onClick={goComida}>
                Ir a Comida
              </button>
            </div>
          ) : (
            <ul className="menu-list">
              {(['comida', 'cena'] as Meal[]).map((meal) => {
                const dish = menu[meal];
                const label = meal === 'comida' ? 'Comida' : 'Cena';
                return (
                  <li key={meal}>
                    <div className="item">
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="sub">{label}</span>
                        <div style={{ fontWeight: 600 }}>
                          {dish ? (dish.recipe?.name ?? dish.text) + (dish.leftover ? ' (sobras)' : '') : 'Sin decidir'}
                        </div>
                      </span>
                      {(!dish || proposed[meal]) && state.data.recipes.length > 0 && (
                        <button className="secondary" style={{ height: 40, padding: '0 14px', width: 'auto' }} onClick={() => propose(meal)}>
                          {proposed[meal] ? 'Otra' : 'Proponer'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ul className="menu-list">
          <li>
            <button onClick={goCompra}>
              <span style={{ flex: 1 }}>
                Lista de la compra
                <div className="sub">
                  {total === 0 ? 'No falta nada' : `${total} por comprar · ${groups.map((g) => g.name.toLowerCase()).join(', ')}`}
                </div>
              </span>
              <Chevron />
            </button>
          </li>
          <li>
            <button onClick={goComida}>
              <span style={{ flex: 1 }}>
                Menú de la semana
                <div className="sub">Recetas, propuestas y lista de ingredientes</div>
              </span>
              <Chevron />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
