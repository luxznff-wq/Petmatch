import { reportsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import BarChart from '../../components/ui/BarChart.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import { STATUS_LABELS } from '../../utils/constants.js';

/** Traduce las claves de estado a etiquetas legibles antes de graficarlas. */
const humanize = (buckets = []) =>
  buckets.map((bucket) => ({ ...bucket, label: STATUS_LABELS[bucket.label] ?? bucket.label }));

/** Estadísticas del refugio (§44). */
export default function ShelterStatsPage() {
  const pets = useAsync(() => reportsApi.pets(), []);
  const requests = useAsync(() => reportsApi.requests(), []);
  const adoptions = useAsync(() => reportsApi.adoptions(), []);

  const loading = pets.loading || requests.loading || adoptions.loading;
  const error = pets.error ?? requests.error ?? adoptions.error;

  if (loading) return <LoadingSpinner label="Calculando estadísticas…" />;
  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={() => {
          pets.reload();
          requests.reload();
          adoptions.reload();
        }}
      />
    );
  }

  return (
    <>
      <header className="panel-head">
        <p className="kicker">ESTADÍSTICAS</p>
        <h1>Cómo va tu refugio</h1>
        <p className="muted">Todos los datos corresponden únicamente a tu organización.</p>
      </header>

      <div className="report-grid">
        <section className="report-card">
          <h2>Mascotas por especie</h2>
          <BarChart data={pets.data.bySpecies} />
        </section>

        <section className="report-card">
          <h2>Mascotas por estado</h2>
          <BarChart data={humanize(pets.data.byStatus)} />
        </section>

        <section className="report-card">
          <h2>Mascotas por ciudad</h2>
          <BarChart data={pets.data.byCity} />
        </section>

        <section className="report-card">
          <h2>Solicitudes por estado</h2>
          <BarChart data={humanize(requests.data.byStatus)} />
        </section>

        <section className="report-card">
          <h2>Adopciones por mes</h2>
          <BarChart data={adoptions.data.byMonth} emptyText="Todavía no registraste adopciones." />
        </section>

        <section className="report-card">
          <h2>Adopciones por especie</h2>
          <BarChart
            data={adoptions.data.bySpecies}
            emptyText="Todavía no registraste adopciones."
          />
        </section>
      </div>
    </>
  );
}
