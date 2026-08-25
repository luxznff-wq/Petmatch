import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, BadgeCheck, Building2 } from 'lucide-react';
import { sheltersApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchBar from '../../components/pets/SearchBar.jsx';
import { SHELTER_STATUSES, STATUS_LABELS } from '../../utils/constants.js';

/** Verificación y supervisión de refugios (§48). */
export default function AdminSheltersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);

  const { data, loading, error, reload } = useAsync(
    () =>
      sheltersApi.list({
        search: debounced || undefined,
        status: status || undefined,
        page,
        limit: 15
      }),
    [debounced, status, page]
  );

  async function changeStatus(shelter, next) {
    try {
      await sheltersApi.setStatus(shelter.id, next);
      toast.success(`${shelter.name} ahora está ${STATUS_LABELS[next].toLowerCase()}.`);
      reload();
    } catch (statusError) {
      toast.error(statusError.message);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Refugio',
      render: (row) => (
        <span className="cell-stack">
          <Link to={`/refugios/${row.id}`}>
            <strong>{row.name}</strong>
          </Link>
          <small>{row.email ?? 'Sin correo de contacto'}</small>
        </span>
      )
    },
    { key: 'city', header: 'Ciudad' },
    { key: 'petCount', header: 'Mascotas', render: (row) => row.petCount ?? 0 },
    { key: 'adoptionCount', header: 'Adopciones', render: (row) => row.adoptionCount ?? 0 },
    { key: 'status', header: 'Estado', render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="row-actions">
          {row.status !== 'VERIFICADO' && (
            <Button
              variant="ghost"
              size="sm"
              icon={BadgeCheck}
              onClick={() => changeStatus(row, 'VERIFICADO')}
            >
              Verificar
            </Button>
          )}
          {row.status !== 'SUSPENDIDO' && (
            <Button
              variant="ghost"
              size="sm"
              icon={Ban}
              onClick={() => changeStatus(row, 'SUSPENDIDO')}
            >
              Suspender
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">REFUGIOS</p>
        <h1>Gestión de refugios</h1>
        <p className="muted">
          Verifica los refugios nuevos y suspende los que incumplan las condiciones.
        </p>
      </header>

      <div className="panel-toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o ciudad"
          id="buscador-refugios-admin"
        />
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          placeholder="Todos los estados"
          options={SHELTER_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={Building2}
            title="Sin refugios"
            description="No hay refugios que coincidan con los filtros aplicados."
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
