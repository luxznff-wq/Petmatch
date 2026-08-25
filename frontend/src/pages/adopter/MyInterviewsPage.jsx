import { CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { interviewsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDateTime } from '../../utils/format.js';

/** Tono visual de cada resultado de entrevista (§36). */
const RESULT_TONES = { Aprobada: 'success', 'No aprobada': 'danger', Pendiente: 'neutral' };

/** Agenda de entrevistas del adoptante (§8, §36). */
export default function MyInterviewsPage() {
  const { data, loading, error, reload } = useAsync(() => interviewsApi.mine(), []);

  const columns = [
    { key: 'petName', header: 'Mascota', render: (row) => <strong>{row.petName}</strong> },
    { key: 'shelterName', header: 'Refugio' },
    {
      key: 'scheduledAt',
      header: 'Fecha y hora',
      render: (row) => formatDateTime(row.scheduledAt)
    },
    { key: 'modality', header: 'Modalidad' },
    {
      key: 'result',
      header: 'Resultado',
      render: (row) => <Badge tone={RESULT_TONES[row.result] ?? 'neutral'}>{row.result}</Badge>
    },
    {
      key: 'actions',
      header: 'Solicitud',
      render: (row) => <Link to={`/mi-cuenta/solicitudes/${row.requestId}`}>Ver</Link>
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MIS ENTREVISTAS</p>
        <h1>Entrevistas programadas</h1>
        <p className="muted">Las entrevistas que los refugios agendaron contigo.</p>
      </header>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty={
          <EmptyState
            icon={CalendarCheck}
            title="Sin entrevistas"
            description="Cuando una solicitud llegue a la etapa de entrevista aparecerá aquí."
          />
        }
      />
    </>
  );
}
