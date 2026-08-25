import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDateTime } from '../../utils/format.js';

/** Tipos de entidad que registra la auditoría (§52). */
const ENTITY_TYPES = [
  { value: 'user', label: 'Usuarios' },
  { value: 'shelter', label: 'Refugios' },
  { value: 'pet', label: 'Mascotas' },
  { value: 'adoption_request', label: 'Solicitudes' },
  { value: 'adoption_interview', label: 'Entrevistas' },
  { value: 'adoption', label: 'Adopciones' }
];

/** Registro de auditoría (§52). */
export default function AdminAuditPage() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAsync(
    () => adminApi.audit({ entityType: entityType || undefined, page, limit: 25 }),
    [entityType, page]
  );

  const columns = [
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (row) => formatDateTime(row.createdAt)
    },
    { key: 'userEmail', header: 'Usuario', render: (row) => row.userEmail ?? 'Sistema' },
    { key: 'action', header: 'Acción', render: (row) => <strong>{row.action}</strong> },
    {
      key: 'entity',
      header: 'Entidad',
      render: (row) =>
        row.entityType ? `${row.entityType}${row.entityId ? ` #${row.entityId}` : ''}` : '—'
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">AUDITORÍA</p>
        <h1>Registro de acciones</h1>
        <p className="muted">
          Cada acción administrativa importante queda registrada con su autor y su fecha.
        </p>
      </header>

      <div className="panel-toolbar">
        <Select
          aria-label="Filtrar por tipo de entidad"
          value={entityType}
          onChange={(event) => {
            setEntityType(event.target.value);
            setPage(1);
          }}
          placeholder="Todas las entidades"
          options={ENTITY_TYPES}
        />
      </div>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={ScrollText}
            title="Sin registros"
            description="Todavía no se registraron acciones administrativas."
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
