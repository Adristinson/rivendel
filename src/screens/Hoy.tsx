import type { StoreState } from '../lib/store';
import { groupPending } from '../lib/logic';
import { Chevron } from '../icons';

function saludo() {
  const h = new Date().getHours();
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export function Hoy({ state, name, goCompra }: { state: StoreState; name: string; goCompra: () => void }) {
  const groups = groupPending(state.data);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const f = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fecha = f.charAt(0).toUpperCase() + f.slice(1);
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
        <ul className="menu-list">
          <li>
            <button onClick={goCompra}>
              <span style={{ flex: 1 }}>
                Lista de la compra
                <div className="sub">
                  {total === 0
                    ? 'No falta nada'
                    : `${total} por comprar · ${groups.map((g) => g.name.toLowerCase()).join(', ')}`}
                </div>
              </span>
              <Chevron />
            </button>
          </li>
        </ul>
        <ul className="menu-list">
          <li>
            <div className="item">
              <span style={{ flex: 1 }}>
                Menú de hoy
                <div className="sub">Llegará con el recetario y el menú semanal</div>
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function Comida() {
  return (
    <div className="screen">
      <header className="band">
        <div>
          <div className="band-kicker">Rivendel</div>
          <h1>Comida</h1>
        </div>
      </header>
      <div className="scroll">
        <div className="empty">
          <strong>Próximo módulo</strong>
          Aquí irán el recetario y el menú semanal. Al aprobar el menú, los ingredientes pasarán a la lista de la compra.
        </div>
      </div>
    </div>
  );
}
