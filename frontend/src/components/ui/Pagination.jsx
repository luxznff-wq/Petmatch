import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Ventana de páginas alrededor de la actual, con elipsis en los extremos. */
function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const visible = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  return visible.reduce((accumulator, page, index) => {
    if (index > 0 && page - visible[index - 1] > 1) accumulator.push('…');
    accumulator.push(page);
    return accumulator;
  }, []);
}

/** Paginación del listado de mascotas y de las tablas (§17). */
export default function Pagination({ page, totalPages, total, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Paginación de resultados">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {pageWindow(page, totalPages).map((item, index) =>
        item === '…' ? (
          <span key={`gap-${index}`} className="pagination-gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            type="button"
            key={item}
            className={item === page ? 'active' : ''}
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {total != null && (
        <span className="pagination-total">
          {total} resultado{total === 1 ? '' : 's'}
        </span>
      )}
    </nav>
  );
}
