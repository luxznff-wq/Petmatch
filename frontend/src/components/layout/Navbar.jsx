import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { initials } from '../../utils/format.js';
import NotificationBell from './NotificationBell.jsx';
import Button from '../ui/Button.jsx';

const PUBLIC_LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/mascotas', label: 'Explorar mascotas' },
  { to: '/refugios', label: 'Refugios' },
  { to: '/como-adoptar', label: '¿Cómo adoptar?' }
];

/** Ruta del panel según el rol (§25). */
export function dashboardPathFor(role) {
  if (role === 'REFUGIO') return '/refugio';
  if (role === 'ADMINISTRADOR') return '/admin';
  return '/mi-cuenta';
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          pet<span>match</span>
          <b aria-hidden="true">♥</b>
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="navegacion-principal"
          aria-label={menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        <nav
          id="navegacion-principal"
          className={`navbar-links ${menuOpen ? 'is-open' : ''}`}
          aria-label="Navegación principal"
        >
          {PUBLIC_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={close}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}

          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <Link
                  to={dashboardPathFor(user.role)}
                  className="navbar-account"
                  onClick={close}
                  title="Ir a mi panel"
                >
                  <span className="avatar" aria-hidden="true">
                    {initials(user)}
                  </span>
                  <span className="navbar-account-name">{user.firstName}</span>
                </Link>
                <Button variant="ghost" size="sm" icon={LayoutDashboard} to={dashboardPathFor(user.role)} onClick={close}>
                  Mi panel
                </Button>
                <Button variant="ghost" size="sm" icon={LogOut} onClick={handleLogout}>
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" to="/ingresar" onClick={close}>
                  Iniciar sesión
                </Button>
                <Button variant="primary" size="sm" to="/registro" onClick={close}>
                  Crear cuenta
                </Button>
              </>
            )}
          </div>
        </nav>

      </div>
    </header>
  );
}
