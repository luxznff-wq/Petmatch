import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { requestsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDate } from '../../utils/format.js';
import { REQUEST_STATUSES, STATUS_LABELS } from '../../utils/constants.js';

/** Listado de las solicitudes del adoptante (§26). */
export default function MyRequestsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAsync(
    () => requestsApi.list({ status: status || undefined, page, limit: 12 }),
    [status, page]
  );

  const columns = [
    {
      key: 'pet',
      header: 'Mascota',
      render: (row) => (
        <Link to={`/mi-cuenta/solicitudes/${row.id}`}>
          <strong>{row.petName}</strong>
        </Link>
      )
    },
    { key: 'shelterName', header: 'Refugio' },
    { key: 'createdAt', header: 'Enviada', render: (row) => formatDate(row.createdAt) },
    { key: 'status', header: 'Estado', render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions',
      header: 'Acción',
      render: (row) => <Link to={`/mi-cuenta/solicitudes/${row.id}`}>Ver detalle</Link>
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MIS SOLICITUDES</p>
        <h1>Solicitudes de adopción</h1>
        <p className="muted">Sigue el estado de cada proceso que iniciaste.</p>
      </header>

      <div className="panel-toolbar">
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          placeholder="Todos los estados"
          options={REQUEST_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="Sin solicitudes"
            description="Cuando envíes una solicitud de adopción aparecerá aquí."
            action={{ label: 'Explorar mascotas', to: '/mascotas' }}
          />
        }
      />

      <Pagination
        page={data?.pagination?.page ?? 1}
        totalPages={data?.pagination?.totalPages ?? 0}
        total={data?.pagination?.total}
        onChange={setPage}
      />
    </>
  );
}
