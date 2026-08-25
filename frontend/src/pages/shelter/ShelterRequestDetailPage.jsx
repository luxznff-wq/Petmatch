import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, Check, Heart, Search, X } from 'lucide-react';
import { adoptionsApi, interviewsApi, requestsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import { formatDate, formatDateTime, toDateTimeLocal } from '../../utils/format.js';
import { INTERVIEW_MODALITIES, INTERVIEW_RESULTS } from '../../utils/constants.js';

/**
 * Acciones disponibles en cada estado (§45).
 * Refleja exactamente las transiciones que acepta el backend.
 */
const ACTIONS = {
  PENDIENTE: [
    { status: 'EN_REVISION', label: 'Enviar a revisión', icon: Search, variant: 'primary' },
    { status: 'RECHAZADA', label: 'Rechazar', icon: X, variant: 'danger' }
  ],
  EN_REVISION: [
    { status: 'ENTREVISTA', label: 'Pasar a entrevista', icon: CalendarPlus, variant: 'primary' },
    { status: 'APROBADA', label: 'Aprobar', icon: Check, variant: 'secondary' },
    { status: 'RECHAZADA', label: 'Rechazar', icon: X, variant: 'danger' }
  ],
  ENTREVISTA: [
    { status: 'APROBADA', label: 'Aprobar', icon: Check, variant: 'primary' },
    { status: 'RECHAZADA', label: 'Rechazar', icon: X, variant: 'danger' }
  ],
  APROBADA: [],
  RECHAZADA: [],
  CANCELADA: [],
  ADOPCION_COMPLETADA: []
};

const RESULT_TONES = { Aprobada: 'success', 'No aprobada': 'danger', Pendiente: 'neutral' };

/** Detalle y gestión de una solicitud desde el refugio o la administración. */
export default function ShelterRequestDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const basePath = isAdmin ? '/admin/solicitudes' : '/refugio/solicitudes';

  const { data, loading, error, reload } = useAsync(() => requestsApi.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [adoptionOpen, setAdoptionOpen] = useState(false);

  if (loading) return <LoadingSpinner label="Cargando la solicitud…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  async function move(status) {
    setBusy(true);
    try {
      await requestsApi.setStatus(id, { status });
      toast.success('Solicitud actualizada.');
      reload();
    } catch (moveError) {
      toast.error(moveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function scheduleInterview(event) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await requestsApi.scheduleInterview(id, {
        // El input datetime-local no lleva zona horaria: se añade la local.
        scheduledAt: new Date(form.get('scheduledAt')).toISOString(),
        modality: form.get('modality'),
        notes: form.get('notes') || undefined
      });
      toast.success('Entrevista programada.');
      setInterviewOpen(false);
      reload();
    } catch (scheduleError) {
      toast.error(scheduleError.message);
    } finally {
      setBusy(false);
    }
  }

  async function setInterviewResult(interviewId, result) {
    try {
      await interviewsApi.update(interviewId, { result });
      toast.success('Resultado registrado.');
      reload();
    } catch (resultError) {
      toast.error(resultError.message);
    }
  }

  async function registerAdoption(event) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const adoption = await adoptionsApi.create({
        requestId: Number(id),
        notes: form.get('notes') || undefined
      });
      toast.success(`Adopción ${adoption.code} registrada.`);
      setAdoptionOpen(false);
      reload();
    } catch (adoptionError) {
      toast.error(adoptionError.message);
    } finally {
      setBusy(false);
    }
  }

  const applicant = data.applicant ?? {};
  const housing = data.housing ?? {};
  const actions = ACTIONS[data.status] ?? [];

  return (
    <>
      <header className="panel-head">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to={basePath}>Solicitudes</Link> <span aria-hidden="true">›</span> #{data.id}
        </nav>
        <div className="pet-detail-heading">
          <h1>{data.adopterName}</h1>
          <Badge status={data.status} />
        </div>
        <p className="muted">
          Solicita a <Link to={`/mascotas/${data.petId}`}>{data.petName}</Link> · enviada el{' '}
          {formatDate(data.createdAt)}
        </p>
      </header>

      <div className="panel-toolbar">
        {actions.map((action) => (
          <Button
            key={action.status}
            variant={action.variant}
            icon={action.icon}
            onClick={() => move(action.status)}
            loading={busy}
          >
            {action.label}
          </Button>
        ))}

        {data.status === 'ENTREVISTA' && (
          <Button variant="outline" icon={CalendarPlus} onClick={() => setInterviewOpen(true)}>
            Programar entrevista
          </Button>
        )}

        {data.status === 'APROBADA' && (
          <Button icon={Heart} onClick={() => setAdoptionOpen(true)}>
            Registrar adopción
          </Button>
        )}
      </div>

      {data.status === 'ADOPCION_COMPLETADA' && (
        <div className="notice notice-success">
          Esta adopción ya fue registrada. ¡Gracias por completar el proceso!
        </div>
      )}

      <section className="panel-section">
        <h2>Información del solicitante</h2>
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
            <dd>{applicant.address}</dd>
          </div>
          <div>
            <dt>Ciudad</dt>
            <dd>{applicant.city}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section">
        <h2>Información de vivienda</h2>
        <dl className="detail-list">
          <div>
            <dt>Tipo de vivienda</dt>
            <dd>{housing.type}</dd>
          </div>
          <div>
            <dt>¿Tiene patio?</dt>
            <dd>{housing.hasYard ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>¿Vive solo/a?</dt>
            <dd>{housing.livesAlone ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>¿Tiene otras mascotas?</dt>
            <dd>{housing.hasOtherPets ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>¿Hay niños en casa?</dt>
            <dd>{housing.hasChildren ? 'Sí' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section">
        <h2>Experiencia y motivación</h2>
        <p>
          <strong>¿Ha tenido mascotas antes?</strong> {data.hadPetsBefore ? 'Sí' : 'No'}
        </p>
        {data.experience && <p>{data.experience}</p>}
        <p>
          <strong>Motivación:</strong> {data.motivation}
        </p>
      </section>

      <section className="panel-section">
        <header className="panel-section-head">
          <h2>Entrevistas</h2>
        </header>

        {data.interviews?.length === 0 ? (
          <p className="muted">
            Todavía no hay entrevistas. Pasa la solicitud al estado ENTREVISTA para poder agendar una.
          </p>
        ) : (
          <ul className="record-list">
            {data.interviews.map((interview) => (
              <li key={interview.id}>
                <span>
                  <strong>{formatDateTime(interview.scheduledAt)}</strong>
                  <small>{interview.modality}</small>
                  {interview.notes && <small>{interview.notes}</small>}
                </span>
                <Badge tone={RESULT_TONES[interview.result] ?? 'neutral'}>{interview.result}</Badge>
                <Select
                  aria-label="Registrar resultado de la entrevista"
                  value={interview.result}
                  onChange={(event) => setInterviewResult(interview.id, event.target.value)}
                  options={INTERVIEW_RESULTS}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        title="Programar entrevista"
        description={`Coordina la entrevista con ${data.adopterName} por ${data.petName}.`}
      >
        <form className="panel-form" onSubmit={scheduleInterview}>
          <Input
            label="Fecha y hora"
            name="scheduledAt"
            type="datetime-local"
            required
            min={toDateTimeLocal(new Date().toISOString())}
          />
          <Select label="Modalidad" name="modality" required options={INTERVIEW_MODALITIES} />
          <Input as="textarea" rows={3} label="Observaciones" name="notes" />
          <div className="modal-actions">
            <Button variant="ghost" type="button" onClick={() => setInterviewOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              Programar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={adoptionOpen}
        onClose={() => setAdoptionOpen(false)}
        title="Registrar adopción"
        description={`Al confirmar, ${data.petName} pasará a estado ADOPTADA y el proceso quedará cerrado.`}
      >
        <form className="panel-form" onSubmit={registerAdoption}>
          <Input as="textarea" rows={3} label="Observaciones de la entrega" name="notes" />
          <div className="modal-actions">
            <Button variant="ghost" type="button" onClick={() => setAdoptionOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              Confirmar adopción
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
