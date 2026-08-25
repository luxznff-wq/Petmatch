import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarCheck, XCircle } from 'lucide-react';
import { requestsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import { formatDate, formatDateTime } from '../../utils/format.js';

/** Estados desde los que el adoptante puede cancelar (§34). */
const CANCELLABLE = ['PENDIENTE', 'EN_REVISION'];

/** Detalle de una solicitud propia, con su historial de entrevistas. */
export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, loading, error, reload } = useAsync(() => requestsApi.get(id), [id]);

  if (loading) return <LoadingSpinner label="Cargando la solicitud…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  async function cancelRequest() {
    setCancelling(true);
    try {
      await requestsApi.cancel(id);
      toast.success('Tu solicitud fue cancelada.');
      navigate('/mi-cuenta/solicitudes');
    } catch (cancelError) {
      toast.error(cancelError.message);
    } finally {
      setCancelling(false);
      setConfirmOpen(false);
    }
  }

  const housing = data.housing ?? {};
  const applicant = data.applicant ?? {};

  return (
    <>
      <header className="panel-head">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to="/mi-cuenta/solicitudes">Mis solicitudes</Link>{' '}
          <span aria-hidden="true">›</span> Solicitud #{data.id}
        </nav>
        <div className="pet-detail-heading">
          <h1>{data.petName}</h1>
          <Badge status={data.status} />
        </div>
        <p className="muted">
          Enviada el {formatDate(data.createdAt)} a {data.shelterName}.
        </p>
      </header>

      {CANCELLABLE.includes(data.status) && (
        <Button variant="danger" icon={XCircle} onClick={() => setConfirmOpen(true)}>
          Cancelar solicitud
        </Button>
      )}

      {data.reviewNotes && (
        <section className="panel-section">
          <h2>Observaciones del refugio</h2>
          <p>{data.reviewNotes}</p>
        </section>
      )}

      <section className="panel-section">
        <h2>Datos declarados</h2>
        <dl className="detail-list">
          <div>
            <dt>Nombre completo</dt>
            <dd>{applicant.name}</dd>
          </div>
          <div>
            <dt>Edad</dt>
            <dd>{applicant.age} años</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{applicant.phone}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{applicant.email}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>
              {applicant.address}, {applicant.city}
            </dd>
          </div>
          <div>
            <dt>Vivienda</dt>
            <dd>{housing.type}</dd>
          </div>
          <div>
            <dt>Patio</dt>
            <dd>{housing.hasYard ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>Vive solo/a</dt>
            <dd>{housing.livesAlone ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>Otras mascotas</dt>
            <dd>{housing.hasOtherPets ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>Niños en casa</dt>
            <dd>{housing.hasChildren ? 'Sí' : 'No'}</dd>
          </div>
        </dl>
      </section>

      {data.hadPetsBefore && data.experience && (
        <section className="panel-section">
          <h2>Experiencia con mascotas</h2>
          <p>{data.experience}</p>
        </section>
      )}

      <section className="panel-section">
        <h2>Motivación</h2>
        <p>{data.motivation}</p>
      </section>

      <section className="panel-section">
        <h2>Entrevistas</h2>
        {data.interviews?.length === 0 ? (
          <p className="muted">Todavía no hay entrevistas programadas.</p>
        ) : (
          <ul className="record-list">
            {data.interviews.map((interview) => (
              <li key={interview.id}>
                <span>
                  <strong>
                    <CalendarCheck size={15} aria-hidden="true" />{' '}
                    {formatDateTime(interview.scheduledAt)}
                  </strong>
                  <small>{interview.modality}</small>
                </span>
                <Badge
                  tone={
                    interview.result === 'Aprobada'
                      ? 'success'
                      : interview.result === 'No aprobada'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {interview.result}
                </Badge>
                {interview.notes && <small>{interview.notes}</small>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancelar solicitud"
        message={`¿Seguro que quieres cancelar tu solicitud para ${data.petName}? Podrás volver a solicitarla más adelante si sigue disponible.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        loading={cancelling}
        onConfirm={cancelRequest}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
