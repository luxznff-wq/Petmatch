import { Bell, CalendarCheck, ClipboardList, Heart, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workspaceApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDate, formatRelative } from '../../utils/format.js';

/** Resumen del panel del adoptante (§26). */
export default function AdopterDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => workspaceApi.get(), []);

  if (loading) return <LoadingSpinner label="Cargando tu panel…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const cards = [
    { icon: Heart, label: 'Favoritos', value: data.summary.favorites, to: '/mi-cuenta/favoritos' },
    { icon: ClipboardList, label: 'Solicitudes', value: data.summary.requests, to: '/mi-cuenta/solicitudes' },
    { icon: CalendarCheck, label: 'Entrevistas', value: data.summary.interviews, to: '/mi-cuenta/entrevistas' },
    { icon: PawPrint, label: 'Adopciones', value: data.summary.adoptions, to: '/mi-cuenta/adopciones' },
    { icon: Bell, label: 'Sin leer', value: data.summary.unreadNotifications, to: '/notificaciones' }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">PANEL DEL ADOPTANTE</p>
        <h1>Hola, {user.firstName}</h1>
        <p className="muted">Este es el resumen de tu actividad en PetMatch.</p>
      </header>

      <div className="dashboard-grid">
        {cards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </div>

      <section className="panel-section">
        <header className="panel-section-head">
          <h2>Últimas solicitudes</h2>
          <Link to="/mi-cuenta/solicitudes">Ver todas</Link>
        </header>

        {data.requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Todavía no enviaste solicitudes"
            description="Explora las mascotas disponibles y envía tu primera solicitud."
            action={{ label: 'Explorar mascotas', to: '/mascotas' }}
          />
        ) : (
          <ul className="record-list">
            {data.requests.slice(0, 5).map((request) => (
              <li key={request.id}>
                <Link to={`/mi-cuenta/solicitudes/${request.id}`}>
                  <strong>{request.petName}</strong>
                  <small>{request.shelterName}</small>
                </Link>
                <Badge status={request.status} />
                <small>{formatRelative(request.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-section">
        <header className="panel-section-head">
          <h2>Próximas entrevistas</h2>
          <Link to="/mi-cuenta/entrevistas">Ver todas</Link>
        </header>

        {data.interviews.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Sin entrevistas programadas"
            description="Cuando el refugio agende una entrevista aparecerá aquí."
          />
        ) : (
          <ul className="record-list">
            {data.interviews.slice(0, 3).map((interview) => (
              <li key={interview.id}>
                <span>
                  <strong>{interview.petName}</strong>
                  <small>{interview.modality}</small>
                </span>
                <Badge status={interview.result === 'Pendiente' ? 'PENDIENTE' : 'APROBADA'}>
                  {interview.result}
                </Badge>
                <small>{formatDate(interview.scheduledAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
