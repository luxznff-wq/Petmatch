import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor.
 *
 * La caja de búsqueda lo usa para no lanzar una petición por cada tecla.
 */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
