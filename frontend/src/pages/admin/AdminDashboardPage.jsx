import { Link } from 'react-router-dom';
import { Building2, ClipboardList, Heart, PawPrint, ScrollText, Users } from 'lucide-react';
import { workspaceApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import BarChart from '../../components/ui/BarChart.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import { formatRelative } from '../../utils/format.js';

/** Dashboard general del administrador (§46). */
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => workspaceApi.get(), []);

  if (loading) return <LoadingSpinner label="Cargando el panel…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { summary } = data;
  const cards = [
    { icon: Users, label: 'Usuarios', value: summary.users, to: '/admin/usuarios' },
    { icon: Building2, label: 'Refugios', value: summary.shelters, to: '/admin/refugios' },
    { icon: PawPrint, label: 'Mascotas', value: summary.pets, to: '/admin/mascotas' },
    { icon: ClipboardList, label: 'Solicitudes', value: summary.requests, to: '/admin/solicitudes' },
    { icon: Heart, label: 'Adopciones', value: summary.adoptions, to: '/admin/adopciones' }
  ];

  const pendingShelters = data.shelters.filter((shelter) => shelter.status === 'PENDIENTE');

  return (
    <>
      <header className="panel-head">
        <p className="kicker">PANEL ADMINISTRATIVO</p>
        <h1>Hola, {user.firstName}</h1>
        <p className="muted">Estado general de la plataforma.</p>
      </header>

      <div className="dashboard-grid">
        {cards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </div>

      {pendingShelters.length > 0 && (
        <div className="notice notice-warning">
          Hay {pendingShelters.length} refugio{pendingShelters.length === 1 ? '' : 's'} esperando
          verificación. <Link to="/admin/refugios">Revisar ahora</Link>
        </div>
      )}

      <div className="report-grid">
        <section className="report-card">
          <h2>Usuarios por rol</h2>
          <BarChart data={summary.usersByRole} />
        </section>

        <section className="report-card">
          <header className="panel-section-head">
            <h2>
              <ScrollText size={18} aria-hidden="true" /> Actividad reciente
            </h2>
            <Link to="/admin/auditoria">Ver auditoría</Link>
          </header>

          {data.audit.length === 0 ? (
            <p className="muted">Sin acciones registradas todavía.</p>
          ) : (
            <ul className="audit-list">
              {data.audit.slice(0, 8).map((entry) => (
                <li key={entry.id}>
                  <span>{entry.action}</span>
                  <small>
                    {entry.userEmail ?? 'Sistema'} · {formatRelative(entry.createdAt)}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel-section">
        <header className="panel-section-head">
          <h2>Últimas solicitudes</h2>
          <Link to="/admin/solicitudes">Ver todas</Link>
        </header>

        {data.requests.length === 0 ? (
          <p className="muted">Todavía no hay solicitudes en la plataforma.</p>
        ) : (
          <ul className="record-list">
            {data.requests.slice(0, 6).map((request) => (
              <li key={request.id}>
                <Link to={`/admin/solicitudes/${request.id}`}>
                  <strong>{request.adopterName}</strong>
                  <small>
                    {request.petName} · {request.shelterName}
                  </small>
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
