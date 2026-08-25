import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { requestsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchBar from '../../components/pets/SearchBar.jsx';
import { formatDate } from '../../utils/format.js';
import { REQUEST_STATUSES, STATUS_LABELS } from '../../utils/constants.js';

/**
 * Bandeja de solicitudes del refugio (§45).
 *
 * `basePath` permite reutilizar la misma tabla en el panel administrativo,
 * cambiando sólo el destino de los enlaces.
 */
export default function ShelterRequestsPage({ basePath = '/refugio/solicitudes', title = 'Solicitudes recibidas' }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);

  const { data, loading, error, reload } = useAsync(
    () =>
      requestsApi.list({
        status: status || undefined,
        search: debounced || undefined,
        page,
        limit: 15
      }),
    [status, debounced, page]
  );

  const columns = [
    {
      key: 'adopterName',
      header: 'Solicitante',
      render: (row) => (
        <Link to={`${basePath}/${row.id}`}>
          <strong>{row.adopterName}</strong>
        </Link>
      )
    },
    { key: 'petName', header: 'Mascota' },
    { key: 'createdAt', header: 'Fecha', render: (row) => formatDate(row.createdAt) },
    { key: 'status', header: 'Estado', render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions',
      header: 'Acción',
      render: (row) => <Link to={`${basePath}/${row.id}`}>Ver</Link>
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">SOLICITUDES</p>
        <h1>{title}</h1>
        <p className="muted">Revisa cada solicitud y avanza el proceso de adopción.</p>
      </header>

      <div className="panel-toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por solicitante o mascota"
          id="buscador-solicitudes"
        />
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
            title="No hay solicitudes"
            description="Cuando alguien solicite una mascota aparecerá en esta bandeja."
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
