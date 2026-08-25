import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Check, Heart, MapPin, Ruler, Scale, ShieldCheck, Weight } from 'lucide-react';
import { petsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import AdoptionRequestForm from '../components/pets/AdoptionRequestForm.jsx';
import { formatDate } from '../utils/format.js';
import { PET_ATTRIBUTES } from '../utils/constants.js';

/** Perfil completo de la mascota (§18, §19, §20, §27). */
export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdopter } = useAuth();
  const toast = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: pet, loading, error, reload } = useAsync(() => petsApi.get(id), [id]);
  const [activeImage, setActiveImage] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  if (loading) return <LoadingSpinner label="Cargando el perfil…" />;
  if (error) {
    return (
      <section className="section">
        <ErrorMessage error={error} onRetry={reload} title="No pudimos cargar esta mascota" />
        <Button variant="secondary" to="/mascotas">
          Volver a explorar
        </Button>
      </section>
    );
  }
  if (!pet) return null;

  const gallery = pet.images?.length > 0 ? pet.images : pet.image ? [{ id: 0, url: pet.image }] : [];
  const cover = activeImage ?? gallery[0]?.url;
  const attributes = PET_ATTRIBUTES.filter((attribute) => pet.attributes?.[attribute.key]);
  const canRequest = pet.status === 'DISPONIBLE';

  const handleFavorite = async () => {
    if (!isAdopter) {
      toast.notify('Inicia sesión como adoptante para guardar favoritos.');
      navigate('/ingresar');
      return;
    }
    try {
      await toggleFavorite(pet.id);
    } catch (favoriteError) {
      toast.error(favoriteError.message);
    }
  };

  const handleRequest = () => {
    if (!isAuthenticated) {
      toast.notify('Necesitas iniciar sesión para enviar una solicitud.');
      navigate('/ingresar', { state: { from: { pathname: `/mascotas/${pet.id}` } } });
      return;
    }
    if (!isAdopter) {
      toast.error('Solo las cuentas de adoptante pueden enviar solicitudes.');
      return;
    }
    setFormOpen(true);
  };

  const facts = [
    { icon: Ruler, label: 'Tamaño', value: pet.size },
    { icon: CalendarDays, label: 'Edad', value: pet.ageLabel },
    { icon: Scale, label: 'Color', value: pet.color },
    { icon: Weight, label: 'Peso', value: pet.weightKg ? `${pet.weightKg} kg` : null },
    { icon: CalendarDays, label: 'Fecha de ingreso', value: formatDate(pet.admittedAt) }
  ].filter((fact) => fact.value);

  return (
    <article className="section pet-detail">
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link to="/mascotas">Mascotas</Link> <span aria-hidden="true">›</span> {pet.name}
      </nav>

      <div className="pet-detail-grid">
        <div className="pet-detail-gallery">
          {cover ? (
            <img src={cover} alt={`Fotografía de ${pet.name}`} className="pet-detail-cover" />
          ) : (
            <div className="pet-detail-cover pet-detail-placeholder" aria-hidden="true">
              🐾
            </div>
          )}

          {gallery.length > 1 && (
            <div className="pet-detail-thumbs">
              {gallery.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className={cover === image.url ? 'is-active' : ''}
                  onClick={() => setActiveImage(image.url)}
                  aria-label={`Ver fotografía de ${pet.name}`}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pet-detail-info">
          <div className="pet-detail-heading">
            <h1>{pet.name}</h1>
            <Badge status={pet.status} />
          </div>

          <p className="pet-detail-summary">
            {[pet.species, pet.breed, pet.sex, pet.ageLabel].filter(Boolean).join(' · ')}
          </p>

          <p className="pet-card-location">
            <MapPin size={16} aria-hidden="true" />
            {pet.city}
            {pet.region && `, ${pet.region}`}
          </p>

          {pet.shelterName && (
            <p className="pet-detail-shelter">
              Publicada por{' '}
              <Link to={`/refugios/${pet.shelterId}`}>{pet.shelterName}</Link>
            </p>
          )}

          <dl className="pet-detail-facts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>
                  <fact.icon size={14} aria-hidden="true" /> {fact.label}
                </dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {attributes.length > 0 && (
            <section className="pet-detail-attributes">
              <h2>Información médica y compatibilidad</h2>
              <ul>
                {attributes.map((attribute) => (
                  <li key={attribute.key}>
                    <Check size={14} aria-hidden="true" /> {attribute.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="pet-detail-actions">
            <Button onClick={handleRequest} disabled={!canRequest}>
              {canRequest ? 'Solicitar adopción' : 'No disponible para adopción'}
            </Button>
            <Button variant="outline" icon={Heart} onClick={handleFavorite}>
              {isFavorite(pet.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            </Button>
          </div>

          {!canRequest && (
            <p className="notice">
              <ShieldCheck size={15} aria-hidden="true" />
              Esta mascota no está recibiendo solicitudes en este momento.
            </p>
          )}
        </div>
      </div>

      {pet.description && (
        <section className="pet-detail-text">
          <h2>Sobre {pet.name}</h2>
          <p>{pet.description}</p>
        </section>
      )}

      {pet.story && (
        <section className="pet-detail-text">
          <h2>Su historia</h2>
          <p>{pet.story}</p>
        </section>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={`Solicitud de adopción · ${pet.name}`}
        description="Completa el formulario. El refugio recibirá tu solicitud y se pondrá en contacto contigo."
        size="lg"
      >
        <AdoptionRequestForm
          pet={pet}
          user={user}
          onCancel={() => setFormOpen(false)}
          onSuccess={(request) => {
            setFormOpen(false);
            toast.success('Tu solicitud fue enviada correctamente.');
            navigate(`/mi-cuenta/solicitudes/${request.id}`);
          }}
        />
      </Modal>
    </article>
  );
}
