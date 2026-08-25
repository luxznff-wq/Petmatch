import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Pencil, Plus, Trash2 } from 'lucide-react';
import { petsApi, sheltersApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatDate } from '../../utils/format.js';
import { PET_STATUSES, STATUS_LABELS } from '../../utils/constants.js';

/** Gestión de mascotas del refugio (§43). */
export default function ShelterPetsPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const shelter = useAsync(() => sheltersApi.mine(), []);
  const shelterId = shelter.data?.id;

  const pets = useAsync(
    () =>
      shelterId
        ? sheltersApi.pets(shelterId, { status: status || undefined, page, limit: 20, sort: 'recent' })
        : Promise.resolve(null),
    [shelterId, status, page]
  );

  async function changeStatus(petId, nextStatus) {
    try {
      await petsApi.setStatus(petId, nextStatus);
      toast.success('Estado actualizado.');
      pets.reload();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await petsApi.remove(pendingDelete.id);
      toast.success(`${pendingDelete.name} fue eliminada.`);
      pets.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Mascota',
      render: (row) => (
        <Link to={`/mascotas/${row.id}`}>
          <strong>{row.name}</strong>
        </Link>
      )
    },
    { key: 'species', header: 'Especie' },
    { key: 'ageLabel', header: 'Edad', render: (row) => row.ageLabel ?? '—' },
    { key: 'city', header: 'Ciudad' },
    { key: 'admittedAt', header: 'Ingreso', render: (row) => formatDate(row.admittedAt) },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <Select
          aria-label={`Estado de ${row.name}`}
          value={row.status}
          onChange={(event) => changeStatus(row.id, event.target.value)}
          options={PET_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="row-actions">
          <Button variant="ghost" size="sm" icon={Pencil} to={`/refugio/mascotas/${row.id}/editar`}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setPendingDelete(row)}
            disabled={row.status === 'ADOPTADA'}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  if (shelter.loading) return <LoadingSpinner label="Cargando tu refugio…" />;
  if (!shelter.data) {
    return (
      <EmptyState
        icon={PawPrint}
        title="Primero registra tu refugio"
        description="Necesitas un perfil de refugio verificado para publicar mascotas."
        action={{ label: 'Registrar refugio', to: '/refugio/perfil' }}
      />
    );
  }

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MIS MASCOTAS</p>
        <h1>Mascotas registradas</h1>
        <p className="muted">Administra el estado y la información de cada mascota.</p>
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
          options={PET_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
        <Button
          icon={Plus}
          to="/refugio/mascotas/nueva"
          disabled={shelter.data.status !== 'VERIFICADO'}
        >
          Registrar mascota
        </Button>
      </div>

      <ErrorMessage error={pets.error} onRetry={pets.reload} />

      <DataTable
        columns={columns}
        rows={pets.data?.data}
        loading={pets.loading}
        empty={
          <EmptyState
            icon={PawPrint}
            title="Aún no registraste mascotas"
            description="Publica tu primera mascota para empezar a recibir solicitudes."
            action={{ label: 'Registrar mascota', to: '/refugio/mascotas/nueva' }}
          />
        }
      />

      <Pagination
        page={pets.data?.pagination?.page ?? 1}
        totalPages={pets.data?.pagination?.totalPages ?? 0}
        total={pets.data?.pagination?.total}
        onChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar mascota"
        message={`¿Seguro que quieres eliminar a ${pendingDelete?.name}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
