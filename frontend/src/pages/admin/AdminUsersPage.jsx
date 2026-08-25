import { useState } from 'react';
import { Ban, CheckCircle2, Trash2, Users } from 'lucide-react';
import { usersApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchBar from '../../components/pets/SearchBar.jsx';
import { formatDate } from '../../utils/format.js';
import { USER_ROLES, USER_STATUSES } from '../../utils/constants.js';

/** Gestión de usuarios (§47). */
export default function AdminUsersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const debounced = useDebouncedValue(search);

  const { data, loading, error, reload } = useAsync(
    () =>
      usersApi.list({
        search: debounced || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit: 15
      }),
    [debounced, role, status, page]
  );

  async function toggleStatus(user) {
    const next = user.status === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    try {
      await usersApi.setStatus(user.id, next);
      toast.success(next === 'ACTIVO' ? 'Cuenta reactivada.' : 'Cuenta suspendida.');
      reload();
    } catch (statusError) {
      toast.error(statusError.message);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await usersApi.remove(pendingDelete.id);
      toast.success('Cuenta eliminada.');
      reload();
    } catch (deleteError) {
      toast.error(deleteError.message);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Usuario',
      render: (row) => (
        <span className="cell-stack">
          <strong>
            {row.firstName} {row.lastName}
          </strong>
          <small>{row.email}</small>
        </span>
      )
    },
    { key: 'role', header: 'Rol' },
    { key: 'city', header: 'Ciudad', render: (row) => row.city ?? '—' },
    { key: 'createdAt', header: 'Registro', render: (row) => formatDate(row.createdAt) },
    { key: 'status', header: 'Estado', render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="row-actions">
          <Button
            variant="ghost"
            size="sm"
            icon={row.status === 'ACTIVO' ? Ban : CheckCircle2}
            onClick={() => toggleStatus(row)}
          >
            {row.status === 'ACTIVO' ? 'Suspender' : 'Reactivar'}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setPendingDelete(row)}>
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <header className="panel-head">
        <p className="kicker">USUARIOS</p>
        <h1>Gestión de usuarios</h1>
        <p className="muted">Busca, filtra, suspende o reactiva cuentas de la plataforma.</p>
      </header>

      <div className="panel-toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o correo"
          id="buscador-usuarios"
        />
        <Select
          aria-label="Filtrar por rol"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          placeholder="Todos los roles"
          options={USER_ROLES}
        />
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          placeholder="Todos los estados"
          options={USER_STATUSES}
        />
      </div>

      <ErrorMessage error={error} onRetry={reload} />

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty={
          <EmptyState
            icon={Users}
            title="Sin usuarios"
            description="No hay cuentas que coincidan con los filtros aplicados."
          />
        }
      />

      <Pagination
        page={data?.pagination?.page ?? 1}
        totalPages={data?.pagination?.totalPages ?? 0}
        total={data?.pagination?.total}
        onChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar cuenta"
        message={`¿Seguro que quieres eliminar la cuenta de ${pendingDelete?.email}? Se borrarán también sus favoritos y solicitudes.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
