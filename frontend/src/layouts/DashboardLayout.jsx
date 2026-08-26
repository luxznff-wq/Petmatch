import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';
import NotificationBell from '../components/layout/NotificationBell.jsx';

/**
 * Estructura de los tres paneles (§8).
 *
 * Recibe los enlaces de la barra lateral desde la ruta padre, de modo que
 * adoptante, refugio y administrador comparten la misma carcasa.
 */
export default function DashboardLayout({ title, links }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-shell">
      <aside className={open ? 'is-open' : ''}>
        <Link to="/" className="brand">
          pet<span>match</span>
          <b aria-hidden="true">♥</b>
        </Link>

        <div className="dashboard-account">
          <span className="avatar" aria-hidden="true">
            {initials(user)}
          </span>
          <span>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <small>{title}</small>
          </span>
        </div>

        <nav aria-label={`Navegación del panel ${title}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              <link.icon size={18} aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-footer">
          <Link to="/" className="dashboard-back">
            <ArrowLeft size={16} aria-hidden="true" /> Volver a PetMatch
          </Link>

          {/* Los paneles no llevan el pie del sitio, así que sin estos
              enlaces quien tiene sesión iniciada se queda sin ninguna vía
              hacia los documentos legales. */}
          <nav className="dashboard-legal" aria-label="Documentos legales">
            <Link to="/terminos" onClick={() => setOpen(false)}>
              Términos
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacidad" onClick={() => setOpen(false)}>
              Privacidad
            </Link>
          </nav>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Abrir menú del panel"
            aria-expanded={open}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <NotificationBell />
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
