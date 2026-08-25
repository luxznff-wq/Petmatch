import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { formatDateTime, formatRelative } from '../utils/format.js';

/** Bandeja completa de notificaciones (§51). */
export default function NotificationsPage() {
  const { data, loading, error, reload } = useAsync(() => notificationsApi.list(), []);

  async function markAll() {
    await notificationsApi.markAllRead();
    reload();
  }

  async function markOne(id) {
    await notificationsApi.markRead(id);
    reload();
  }

  return (
    <section className="section">
      <header className="section-head">
        <div>
          <p className="kicker">NOTIFICACIONES</p>
          <h1>Tu actividad reciente</h1>
          {data && (
            <p className="muted">
              {data.unread > 0
                ? `Tienes ${data.unread} notificación${data.unread === 1 ? '' : 'es'} sin leer.`
                : 'Estás al día.'}
            </p>
          )}
        </div>
        {data?.unread > 0 && (
          <Button variant="outline" icon={CheckCheck} onClick={markAll}>
            Marcar todas como leídas
          </Button>
        )}
      </header>

      <ErrorMessage error={error} onRetry={reload} />

      {loading ? (
        <LoadingSpinner label="Cargando notificaciones…" />
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sin notificaciones"
          description="Te avisaremos cuando haya novedades sobre tus solicitudes y favoritos."
        />
      ) : (
        <ul className="notification-list">
          {data?.items.map((item) => (
            <li key={item.id} className={item.read ? '' : 'is-unread'}>
              <div>
                <p>{item.message}</p>
                <small title={formatDateTime(item.createdAt)}>
                  {formatRelative(item.createdAt)}
                </small>
              </div>
              <div className="notification-list-actions">
                {item.link && <Link to={item.link}>Ver detalle</Link>}
                {!item.read && (
                  <button type="button" onClick={() => markOne(item.id)}>
                    Marcar como leída
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
