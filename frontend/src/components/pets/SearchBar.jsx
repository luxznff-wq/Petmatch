import { Search, X } from 'lucide-react';

/** Caja de búsqueda por nombre, raza, ciudad o refugio (§14). */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Busca por nombre, raza, ciudad o refugio',
  id = 'buscador-mascotas'
}) {
  return (
    <div className="search-bar">
      <label htmlFor={id} className="sr-only">
        Buscar mascotas
      </label>
      <Search size={18} aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
