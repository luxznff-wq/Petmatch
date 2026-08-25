import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../services/api.js';
import { formatRelative } from '../../utils/format.js';

/** Campana de notificaciones con contador de no leídas (§51, §76). */
export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  async function load() {
    try {
      const data = await notificationsApi.list();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // Una campana que falla no debe romper la navegación.
    }
  }

  useEffect(() => {
    load();
    // Sondeo ligero: mantiene el contador al día sin websockets.
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

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
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
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
