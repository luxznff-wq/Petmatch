import { SlidersHorizontal, X } from 'lucide-react';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import {
  AGE_GROUPS,
  PET_ATTRIBUTES,
  PET_STATUSES,
  SEXES,
  SIZES,
  SORT_OPTIONS,
  SPECIES,
  STATUS_LABELS
} from '../../utils/constants.js';

/**
 * Panel de filtros de la exploración (§15, §16).
 *
 * Es un componente controlado: recibe los filtros activos y notifica cada
 * cambio. La página es la única dueña del estado y de la URL.
 */
export default function FilterPanel({
  filters,
  onChange,
  onReset,
  shelters = [],
  cities = [],
  open,
  onToggle,
  activeCount = 0
}) {
  const set = (key) => (event) => {
    const value = event.target.value;
    onChange({ [key]: value === '' ? undefined : value });
  };

  const toggleAttribute = (key) => (event) => {
    onChange({ [key]: event.target.checked ? true : undefined });
  };

  return (
    <section className="filter-panel">
      <div className="filter-panel-head">
        <Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={onToggle}>
          {open ? 'Ocultar filtros' : 'Todos los filtros'}
          {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </Button>

        <Select
          className="filter-sort"
          aria-label="Ordenar resultados"
          value={filters.sort ?? 'recent'}
          onChange={set('sort')}
          options={SORT_OPTIONS}
        />
      </div>

      {open && (
        <div className="filter-panel-body">
          <div className="filter-grid">
            <Select
              label="Especie"
              value={filters.species ?? ''}
              onChange={set('species')}
              placeholder="Todas"
              options={SPECIES}
            />
            <Select
              label="Sexo"
              value={filters.sex ?? ''}
              onChange={set('sex')}
              placeholder="Todos"
              options={SEXES}
            />
            <Select
              label="Edad"
              value={filters.ageGroup ?? ''}
              onChange={set('ageGroup')}
              placeholder="Todas"
              options={AGE_GROUPS}
            />
            <Select
              label="Tamaño"
              value={filters.size ?? ''}
              onChange={set('size')}
              placeholder="Todos"
              options={SIZES}
            />
            <Select
              label="Estado"
              value={filters.status ?? ''}
              onChange={set('status')}
              placeholder="Todos"
              options={PET_STATUSES.map((status) => ({
                value: status,
                label: STATUS_LABELS[status]
              }))}
            />
            <Select
              label="Ciudad"
              value={filters.city ?? ''}
              onChange={set('city')}
              placeholder="Todas"
              options={cities}
            />
            {shelters.length > 0 && (
              <Select
                label="Refugio"
                value={filters.shelterId ?? ''}
                onChange={set('shelterId')}
                placeholder="Todos"
                options={shelters.map((shelter) => ({
                  value: String(shelter.id),
                  label: shelter.name
                }))}
              />
            )}
          </div>

          <fieldset className="filter-attributes">
            <legend>Características</legend>
            {PET_ATTRIBUTES.map((attribute) => (
              <label key={attribute.key}>
                <input
                  type="checkbox"
                  checked={filters[attribute.key] === true}
                  onChange={toggleAttribute(attribute.key)}
                />
                {attribute.label}
              </label>
            ))}
          </fieldset>

          <Button variant="ghost" size="sm" icon={X} onClick={onReset}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </section>
  );
}
