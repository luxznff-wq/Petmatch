import { reportsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import BarChart from '../../components/ui/BarChart.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import { STATUS_LABELS } from '../../utils/constants.js';
import { Building2, Heart } from 'lucide-react';

const humanize = (buckets = []) =>
  buckets.map((bucket) => ({ ...bucket, label: STATUS_LABELS[bucket.label] ?? bucket.label }));

/** Sección de reportes de la plataforma (§50). */
export default function AdminReportsPage() {
  const pets = useAsync(() => reportsApi.pets(), []);
  const requests = useAsync(() => reportsApi.requests(), []);
  const adoptions = useAsync(() => reportsApi.adoptions(), []);
  const shelters = useAsync(() => reportsApi.shelters(), []);

  const loading = pets.loading || requests.loading || adoptions.loading || shelters.loading;
  const error = pets.error ?? requests.error ?? adoptions.error ?? shelters.error;

  if (loading) return <LoadingSpinner label="Generando reportes…" />;
  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={() => {
          pets.reload();
          requests.reload();
          adoptions.reload();
          shelters.reload();
        }}
      />
    );
  }

  return (
    <>
      <header className="panel-head">
        <p className="kicker">REPORTES</p>
        <h1>Estadísticas de la plataforma</h1>
        <p className="muted">Datos agregados de adopciones, mascotas, solicitudes y refugios.</p>
      </header>

      <div className="dashboard-grid">
        <DashboardCard icon={Heart} label="Adopciones totales" value={adoptions.data.total} />
        <DashboardCard icon={Building2} label="Refugios registrados" value={shelters.data.total} />
        <DashboardCard label="Solicitudes totales" value={requests.data.total} />
      </div>

      <h2 className="report-section-title">Adopciones</h2>
      <div className="report-grid">
        <section className="report-card">
          <h3>Por mes</h3>
          <BarChart data={adoptions.data.byMonth} />
        </section>
        <section className="report-card">
          <h3>Por ciudad</h3>
          <BarChart data={adoptions.data.byCity} />
        </section>
        <section className="report-card">
          <h3>Por especie</h3>
          <BarChart data={adoptions.data.bySpecies} />
        </section>
      </div>

      <h2 className="report-section-title">Mascotas</h2>
      <div className="report-grid">
        <section className="report-card">
          <h3>Por especie</h3>
          <BarChart data={pets.data.bySpecies} />
        </section>
        <section className="report-card">
          <h3>Por estado</h3>
          <BarChart data={humanize(pets.data.byStatus)} />
        </section>
        <section className="report-card">
          <h3>Por ciudad</h3>
          <BarChart data={pets.data.byCity} />
        </section>
      </div>

      <h2 className="report-section-title">Solicitudes y refugios</h2>
      <div className="report-grid">
        <section className="report-card">
          <h3>Solicitudes por estado</h3>
          <BarChart data={humanize(requests.data.byStatus)} />
        </section>
        <section className="report-card">
          <h3>Refugios por estado</h3>
          <BarChart data={humanize(shelters.data.byStatus)} />
        </section>
        <section className="report-card">
          <h3>Refugios con más adopciones</h3>
          <BarChart
            data={shelters.data.topByAdoptions}
            emptyText="Todavía no hay adopciones registradas."
          />
        </section>
      </div>
    </>
  );
}
