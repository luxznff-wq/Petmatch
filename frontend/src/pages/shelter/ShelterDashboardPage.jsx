import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, ClipboardList, Heart, PawPrint, Plus } from 'lucide-react';
import { workspaceApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatRelative } from '../../utils/format.js';

/** Dashboard del refugio (§44). */
export default function ShelterDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => workspaceApi.get(), []);

  if (loading) return <LoadingSpinner label="Cargando tu panel…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  // Sin perfil de refugio no hay nada que gestionar todavía (§41).
  if (!data.shelter) {
    return (
      <>
        <header className="panel-head">
          <p className="kicker">PANEL DEL REFUGIO</p>
          <h1>Hola, {user.firstName}</h1>
        </header>
        <EmptyState
          icon={Building2}
          title="Todavía no registraste tu refugio"
          description="Completa el perfil de tu organización. Un administrador lo verificará y podrás publicar mascotas."
          action={{ label: 'Registrar mi refugio', to: '/refugio/perfil' }}
        />
      </>
    );
  }

  const { shelter, summary } = data;
  const notVerified = shelter.status !== 'VERIFICADO';

  const cards = [
    { icon: PawPrint, label: 'Mascotas registradas', value: summary.pets, to: '/refugio/mascotas' },
    { icon: PawPrint, label: 'Disponibles', value: summary.petsAvailable, tone: 'success' },
    { icon: ClipboardList, label: 'En proceso', value: summary.petsInProcess, tone: 'warning' },
    { icon: Heart, label: 'Adoptadas', value: summary.petsAdopted, tone: 'info' },
    {
      icon: ClipboardList,
      label: 'Solicitudes pendientes',
      value: summary.requestsPending,
      to: '/refugio/solicitudes'
    },
    {
      icon: ClipboardList,
      label: 'Solicitudes en revisión',
      value: summary.requestsUnderReview,
      to: '/refugio/solicitudes'
    },
    { icon: CalendarCheck, label: 'Entrevistas activas', value: summary.requestsInterview, to: '/refugio/entrevistas' },
    { icon: Heart, label: 'Adopciones del mes', value: summary.adoptionsThisMonth, to: '/refugio/adopciones' }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">PANEL DEL REFUGIO</p>
        <div className="pet-detail-heading">
          <h1>{shelter.name}</h1>
          <Badge status={shelter.status} />
        </div>
        <p className="muted">{shelter.city}</p>
      </header>

      {notVerified && (
        <div className="notice notice-warning">
          {shelter.status === 'PENDIENTE'
            ? 'Tu refugio está pendiente de verificación. Podrás publicar mascotas en cuanto un administrador lo apruebe.'
            : 'Tu refugio está suspendido. Contacta al administrador de PetMatch para reactivarlo.'}
        </div>
      )}

      <div className="panel-toolbar">
        <Button icon={Plus} to="/refugio/mascotas/nueva" disabled={notVerified}>
          Registrar mascota
        </Button>
      </div>

      <div className="dashboard-grid">
        {cards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </div>

      <section className="panel-section">
        <header className="panel-section-head">
          <h2>Últimas solicitudes recibidas</h2>
          <Link to="/refugio/solicitudes">Ver todas</Link>
        </header>

        {data.requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin solicitudes por ahora"
            description="Cuando alguien solicite una de tus mascotas aparecerá aquí."
          />
        ) : (
          <ul className="record-list">
            {data.requests.slice(0, 5).map((request) => (
              <li key={request.id}>
                <Link to={`/refugio/solicitudes/${request.id}`}>
                  <strong>{request.adopterName}</strong>
                  <small>{request.petName}</small>
                </Link>
                <Badge status={request.status} />
                <small>{formatRelative(request.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
