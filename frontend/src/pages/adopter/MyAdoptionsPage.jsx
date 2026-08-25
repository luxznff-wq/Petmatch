import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { adoptionsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { formatDate } from '../../utils/format.js';

/** Historial de adopciones del adoptante (§38). */
export default function MyAdoptionsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => adoptionsApi.list({ page, limit: 12 }),
    [page]
  );

  const columns = [
    { key: 'code', header: 'Código', render: (row) => <strong>{row.code}</strong> },
    {
      key: 'pet',
      header: 'Mascota',
      render: (row) => <Link to={`/mascotas/${row.petId}`}>{row.petName}</Link>
    },
    { key: 'shelterName', header: 'Refugio' },
    { key: 'adoptedAt', header: 'Fecha', render: (row) => formatDate(row.adoptedAt) },
    { key: 'status', header: 'Estado', render: () => <Badge status="ADOPTADA">Completada</Badge> }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MIS ADOPCIONES</p>
        <h1>Historial de adopciones</h1>
        <p className="muted">Cada adopción que completaste a través de PetMatch.</p>
      </header>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={PawPrint}
            title="Aún no completaste una adopción"
            description="Tu historial aparecerá aquí cuando finalices un proceso."
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
