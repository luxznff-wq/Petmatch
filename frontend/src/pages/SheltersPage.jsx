import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, PawPrint } from 'lucide-react';
import { sheltersApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import SearchBar from '../components/pets/SearchBar.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

/** Directorio público de refugios verificados (§39, §42). */
export default function SheltersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);

  const shelters = useAsync(
    () => sheltersApi.list({ search: debounced || undefined, page, limit: 12 }),
    [debounced, page]
  );

  return (
    <section className="section">
      <header className="section-head">
        <div>
          <p className="kicker">REFUGIOS</p>
          <h1>Organizaciones que confían en PetMatch</h1>
          <p className="muted">
            Refugios verificados que publican y gestionan sus mascotas en la plataforma.
          </p>
        </div>
      </header>

      <SearchBar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Busca por nombre o ciudad"
        id="buscador-refugios"
      />

      <ErrorMessage error={shelters.error} onRetry={shelters.reload} />

      {shelters.loading ? (
        <LoadingSpinner label="Cargando refugios…" />
      ) : shelters.data?.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No encontramos refugios"
          description="Prueba con otro término de búsqueda."
        />
      ) : (
        <div className="shelter-grid">
          {shelters.data?.data.map((shelter) => (
            <article key={shelter.id} className="shelter-card">
              {shelter.logoUrl ? (
                <img src={shelter.logoUrl} alt={`Logo de ${shelter.name}`} />
              ) : (
                <span className="shelter-card-logo" aria-hidden="true">
                  <Building2 size={22} />
                </span>
              )}
              <h2>{shelter.name}</h2>
              <p className="pet-card-location">
                <MapPin size={14} aria-hidden="true" />
                {shelter.city}
              </p>
              {shelter.description && <p className="shelter-card-text">{shelter.description}</p>}
              <ul className="shelter-card-stats">
                <li>
                  <PawPrint size={14} aria-hidden="true" /> {shelter.availablePetCount ?? 0} disponibles
                </li>
                <li>{shelter.adoptionCount ?? 0} adopciones</li>
              </ul>
              <Link to={`/refugios/${shelter.id}`} className="btn btn-secondary btn-sm">
                Ver refugio
              </Link>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={shelters.data?.pagination?.page ?? 1}
        totalPages={shelters.data?.pagination?.totalPages ?? 0}
        total={shelters.data?.pagination?.total}
        onChange={setPage}
      />
    </section>
  );
}
