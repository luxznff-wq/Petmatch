import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { petsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchBar from '../../components/pets/SearchBar.jsx';
import { formatDate } from '../../utils/format.js';
import { PET_STATUSES, SPECIES, STATUS_LABELS } from '../../utils/constants.js';

/** Supervisión global de mascotas (§49). */
export default function AdminPetsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);

  const { data, loading, error, reload } = useAsync(
    () =>
      petsApi.list({
        search: debounced || undefined,
        species: species || undefined,
        status: status || undefined,
        page,
        limit: 15,
        sort: 'recent'
      }),
    [debounced, species, status, page]
  );

  async function changeStatus(pet, next) {
    try {
      await petsApi.setStatus(pet.id, next);
      toast.success(`${pet.name} ahora está ${STATUS_LABELS[next].toLowerCase()}.`);
      reload();
    } catch (statusError) {
      toast.error(statusError.message);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Mascota',
      render: (row) => (
        <span className="cell-stack">
          <Link to={`/mascotas/${row.id}`}>
            <strong>{row.name}</strong>
          </Link>
          <small>
            {row.species}
            {row.breed ? ` · ${row.breed}` : ''}
          </small>
        </span>
      )
    },
    {
      key: 'shelterName',
      header: 'Refugio',
      render: (row) => <Link to={`/refugios/${row.shelterId}`}>{row.shelterName}</Link>
    },
    { key: 'city', header: 'Ciudad' },
    { key: 'createdAt', header: 'Publicada', render: (row) => formatDate(row.createdAt) },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <Select
          aria-label={`Estado de ${row.name}`}
          value={row.status}
          onChange={(event) => changeStatus(row, event.target.value)}
          options={PET_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      )
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MASCOTAS</p>
        <h1>Supervisión de mascotas</h1>
        <p className="muted">
          Revisa el contenido publicado y ajusta estados cuando sea necesario.
        </p>
      </header>

      <div className="panel-toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, raza, ciudad o refugio"
          id="buscador-mascotas-admin"
        />
        <Select
          aria-label="Filtrar por especie"
          value={species}
          onChange={(event) => {
            setSpecies(event.target.value);
            setPage(1);
          }}
          placeholder="Todas las especies"
          options={SPECIES}
        />
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          placeholder="Todos los estados"
          options={PET_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={PawPrint}
            title="Sin mascotas"
            description="No hay mascotas que coincidan con los filtros aplicados."
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
