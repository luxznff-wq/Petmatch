import { CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { interviewsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Select from '../../components/ui/Select.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDateTime } from '../../utils/format.js';
import { INTERVIEW_RESULTS } from '../../utils/constants.js';

const RESULT_TONES = { Aprobada: 'success', 'No aprobada': 'danger', Pendiente: 'neutral' };

/** Agenda de entrevistas del refugio con registro de resultados (§36). */
export default function ShelterInterviewsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => interviewsApi.mine(), []);

  async function updateResult(interviewId, result) {
    try {
      await interviewsApi.update(interviewId, { result });
      toast.success('Resultado registrado.');
      reload();
    } catch (updateError) {
      toast.error(updateError.message);
    }
  }

  const columns = [
    { key: 'adopterName', header: 'Solicitante', render: (row) => <strong>{row.adopterName}</strong> },
    { key: 'petName', header: 'Mascota' },
    {
      key: 'scheduledAt',
      header: 'Fecha y hora',
      render: (row) => formatDateTime(row.scheduledAt)
    },
    { key: 'modality', header: 'Modalidad' },
    {
      key: 'result',
      header: 'Resultado',
      render: (row) => (
        <div className="row-actions">
          <Badge tone={RESULT_TONES[row.result] ?? 'neutral'}>{row.result}</Badge>
          <Select
            aria-label={`Resultado de la entrevista con ${row.adopterName}`}
            value={row.result}
            onChange={(event) => updateResult(row.id, event.target.value)}
            options={INTERVIEW_RESULTS}
          />
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Solicitud',
      render: (row) => <Link to={`/refugio/solicitudes/${row.requestId}`}>Ver</Link>
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">ENTREVISTAS</p>
        <h1>Agenda de entrevistas</h1>
        <p className="muted">Registra el resultado de cada entrevista para avanzar el proceso.</p>
      </header>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty={
          <EmptyState
            icon={CalendarCheck}
            title="Sin entrevistas programadas"
            description="Pasa una solicitud al estado ENTREVISTA para agendar la primera."
          />
        }
      />
    </>
  );
}
