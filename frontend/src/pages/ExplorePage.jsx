import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { petsApi, sheltersApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SearchBar from '../components/pets/SearchBar.jsx';
import FilterPanel from '../components/pets/FilterPanel.jsx';
import PetGrid from '../components/pets/PetGrid.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import { PET_ATTRIBUTES } from '../utils/constants.js';

const ATTRIBUTE_KEYS = PET_ATTRIBUTES.map((attribute) => attribute.key);

/** Filtros que no cuentan como "activos" en el contador del panel. */
const NON_FILTER_KEYS = new Set(['search', 'sort', 'page', 'limit']);

/**
 * Exploración de mascotas (§13-§17).
 *
 * El estado vive en la URL: así los filtros se pueden compartir, quedan en el
 * historial del navegador y sobreviven a una recarga. La búsqueda, los
 * filtros, el orden y la paginación se resuelven en el servidor.
 */
export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdopter } = useAuth();
  const toast = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Los parámetros de la URL son la única fuente de verdad de los filtros.
  const filters = useMemo(() => {
    const entries = {};
    for (const [key, value] of searchParams.entries()) {
      entries[key] = ATTRIBUTE_KEYS.includes(key) ? value === 'true' : value;
    }
    return entries;
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const page = Number(filters.page) || 1;
  const sort = filters.sort ?? 'recent';

  const query = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch || undefined,
      status: filters.status ?? 'DISPONIBLE',
      sort,
      page,
      limit: 12
    }),
    [filters, debouncedSearch, sort, page]
  );

  const pets = useAsync(() => petsApi.list(query), [JSON.stringify(query)]);
  const shelters = useAsync(() => sheltersApi.list({ limit: 50 }), []);

  /** Aplica cambios de filtro y vuelve siempre a la primera página. */
  const updateFilters = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === false) next.delete(key);
        else next.set(key, String(value));
      }
      if (resetPage) next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleSearch = (value) => {
    setSearchInput(value);
    updateFilters({ search: value || undefined });
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

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

  const cities = useMemo(() => {
    const fromShelters = (shelters.data?.data ?? []).map((shelter) => shelter.city);
    const fromPets = (pets.data?.data ?? []).map((pet) => pet.city);
    return [...new Set([...fromShelters, ...fromPets])].filter(Boolean).sort();
  }, [shelters.data, pets.data]);

  const activeCount = Object.keys(filters).filter((key) => !NON_FILTER_KEYS.has(key)).length;
  const total = pets.data?.pagination?.total ?? 0;

  return (
    <section className="section explore">
      <header className="section-head">
        <div>
          <p className="kicker">EXPLORAR</p>
          <h1>Mascotas disponibles</h1>
          <p className="muted">
            {pets.loading
              ? 'Buscando mascotas…'
              : `${total} mascota${total === 1 ? '' : 's'} coincide${total === 1 ? '' : 'n'} con tu búsqueda.`}
          </p>
        </div>
      </header>

      <SearchBar value={searchInput} onChange={handleSearch} />

      <FilterPanel
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        shelters={shelters.data?.data ?? []}
        cities={cities}
        open={panelOpen}
        onToggle={() => setPanelOpen((open) => !open)}
        activeCount={activeCount}
      />

      <ErrorMessage error={pets.error} onRetry={pets.reload} />

      <PetGrid
        pets={pets.data?.data}
        loading={pets.loading}
        isFavorite={isFavorite}
        onToggleFavorite={handleFavorite}
      />

      <Pagination
        page={pets.data?.pagination?.page ?? 1}
        totalPages={pets.data?.pagination?.totalPages ?? 0}
        total={total}
        onChange={(nextPage) => {
          updateFilters({ page: nextPage }, { resetPage: false });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </section>
  );
}
