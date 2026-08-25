import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { adoptionsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDate } from '../../utils/format.js';

/**
 * Historial de adopciones (§38).
 *
 * El mismo componente sirve al refugio y al administrador: la API ya acota
 * los resultados según el rol de quien consulta.
 */
export default function ShelterAdoptionsPage({
  title = 'Adopciones realizadas',
  description = 'Cada proceso que tu refugio cerró con éxito.'
}) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => adoptionsApi.list({ page, limit: 15 }),
    [page]
  );

  const columns = [
    { key: 'code', header: 'Código', render: (row) => <strong>{row.code}</strong> },
    {
      key: 'petName',
      header: 'Mascota',
      render: (row) => <Link to={`/mascotas/${row.petId}`}>{row.petName}</Link>
    },
    { key: 'adopterName', header: 'Adoptante' },
    { key: 'shelterName', header: 'Refugio' },
    { key: 'adoptedAt', header: 'Fecha', render: (row) => formatDate(row.adoptedAt) }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">ADOPCIONES</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </header>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={Heart}
            title="Sin adopciones registradas"
            description="Cuando completes una adopción aparecerá en este historial."
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
