import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { formatRelative } from '../../utils/format.js';

/** Cada cuánto se refresca el contador de no leídas. */
const POLL_INTERVAL = 60_000;

/** Campana de notificaciones con contador de no leídas (§51, §76). */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Un fallo al consultar las notificaciones no debe romper la navegación:
  // el error se ignora y la campana simplemente se muestra vacía.
  const { data, reload, setData } = useAsync(() => notificationsApi.list(), []);
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  // Sondeo ligero: mantiene el contador al día sin abrir un websocket.
  useEffect(() => {
    const timer = setInterval(reload, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [reload]);

  // Cerrar al pulsar fuera del panel.
  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function markAll() {
    await notificationsApi.markAllRead();
    setData({ items: items.map((item) => ({ ...item, read: true })), unread: 0 });
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && <span className="notification-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <header>
            <strong>Notificaciones</strong>
            {unread > 0 && (
              <button type="button" onClick={markAll}>
                <CheckCheck size={14} aria-hidden="true" /> Marcar todas
              </button>
            )}
          </header>

          {items.length === 0 ? (
            <p className="notification-empty">No tienes notificaciones todavía.</p>
          ) : (
            <ul>
              {items.slice(0, 8).map((item) => (
                <li key={item.id} className={item.read ? '' : 'is-unread'}>
                  <span>{item.message}</span>
                  <small>{formatRelative(item.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}

          <Link to="/notificaciones" onClick={() => setOpen(false)}>
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
