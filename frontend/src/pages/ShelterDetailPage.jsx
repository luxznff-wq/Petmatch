import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Clock, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { sheltersApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PetGrid from '../components/pets/PetGrid.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Badge from '../components/ui/Badge.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import Button from '../components/ui/Button.jsx';

/** Perfil público del refugio (§42). */
export default function ShelterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdopter } = useAuth();
  const toast = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [page, setPage] = useState(1);

  const shelter = useAsync(() => sheltersApi.get(id), [id]);
  const pets = useAsync(
    () => sheltersApi.pets(id, { page, limit: 12, sort: 'recent' }),
    [id, page]
  );

  if (shelter.loading) return <LoadingSpinner label="Cargando el refugio…" />;
  if (shelter.error) {
    return (
      <section className="section">
        <ErrorMessage
          error={shelter.error}
          onRetry={shelter.reload}
          title="No pudimos cargar este refugio"
        />
        <Button variant="secondary" to="/refugios">
          Volver al directorio
        </Button>
      </section>
    );
  }

  const data = shelter.data;
  const contact = [
    data.address && { icon: MapPin, text: `${data.address}, ${data.city}` },
    !data.address && data.city && { icon: MapPin, text: data.city },
    data.phone && { icon: Phone, text: data.phone },
    data.email && { icon: Mail, text: data.email },
    data.hours && { icon: Clock, text: data.hours }
  ].filter(Boolean);

  const handleFavorite = async (petId) => {
    if (!isAdopter) {
      toast.notify('Inicia sesión como adoptante para guardar favoritos.');
      navigate('/ingresar');
      return;
    }
    try {
      await toggleFavorite(petId);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="section shelter-detail">
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link to="/refugios">Refugios</Link> <span aria-hidden="true">›</span> {data.name}
      </nav>

      <header className="shelter-detail-head">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt={`Logo de ${data.name}`} />
        ) : (
          <span className="shelter-card-logo" aria-hidden="true">
            <Building2 size={28} />
          </span>
        )}

        <div>
          <div className="pet-detail-heading">
            <h1>{data.name}</h1>
            <Badge status={data.status} />
          </div>
          {data.description && <p className="muted">{data.description}</p>}

          <ul className="shelter-contact">
            {contact.map((item) => (
              <li key={item.text}>
                <item.icon size={15} aria-hidden="true" />
                {item.text}
              </li>
            ))}
            {data.website && (
              <li>
                <Globe size={15} aria-hidden="true" />
                <a href={data.website} target="_blank" rel="noreferrer noopener">
                  {data.website.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
          </ul>
        </div>

        <dl className="shelter-detail-stats">
          <div>
            <dt>Mascotas</dt>
            <dd>{data.petCount ?? 0}</dd>
          </div>
          <div>
            <dt>Disponibles</dt>
            <dd>{data.availablePetCount ?? 0}</dd>
          </div>
          <div>
            <dt>Adopciones</dt>
            <dd>{data.adoptionCount ?? 0}</dd>
          </div>
        </dl>
      </header>

      <h2>Mascotas de {data.name}</h2>
      <ErrorMessage error={pets.error} onRetry={pets.reload} />
      <PetGrid
        pets={pets.data?.data}
        loading={pets.loading}
        isFavorite={isFavorite}
        onToggleFavorite={handleFavorite}
        emptyTitle="Este refugio aún no tiene mascotas publicadas"
        emptyDescription="Vuelve más adelante para conocer a sus rescatados."
      />
      <Pagination
        page={pets.data?.pagination?.page ?? 1}
        totalPages={pets.data?.pagination?.totalPages ?? 0}
        total={pets.data?.pagination?.total}
        onChange={setPage}
      />
    </section>
  );
}
