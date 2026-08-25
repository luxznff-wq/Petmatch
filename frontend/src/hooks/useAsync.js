import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta una función asíncrona y expone `{ data, error, loading, reload }`.
 *
 * Evita actualizar el estado de un componente ya desmontado y descarta las
 * respuestas de peticiones que quedaron obsoletas por otra más reciente.
 *
 * Las dependencias se reducen a una clave serializada en lugar de propagarse
 * como arreglo dinámico: así los arreglos de dependencias de los hooks son
 * literales estáticos y el analizador puede verificarlos.
 *
 * @param {() => Promise<unknown>} asyncFn operación a ejecutar
 * @param {unknown[]} dependencies valores que, al cambiar, relanzan la carga
 * @param {{ immediate?: boolean }} [options] `immediate: false` espera a `reload()`
 */
export function useAsync(asyncFn, dependencies = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: immediate });

  const key = JSON.stringify(dependencies);
  const mounted = useRef(true);
  const runId = useRef(0);

  // Referencia siempre actualizada a la última función recibida: permite que
  // `run` sea estable sin quedarse con una versión antigua.
  const latestFn = useRef(asyncFn);
  useEffect(() => {
    latestFn.current = asyncFn;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const currentRun = (runId.current += 1);
    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await latestFn.current();
      // Descarta el resultado si llegó tarde o el componente ya se desmontó.
      if (mounted.current && currentRun === runId.current) {
        setState({ data, error: null, loading: false });
      }
      return data;
    } catch (error) {
      if (mounted.current && currentRun === runId.current) {
        setState({ data: null, error, loading: false });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    // La regla desaconseja actualizar estado desde un efecto, pero cargar
    // datos al montar es exactamente eso y no tiene alternativa sin añadir
    // una librería de datos (React Query, Suspense). El render extra ocurre
    // una sola vez por carga y queda acotado a este hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (immediate) run();
  }, [key, immediate, run]);

  const setData = useCallback((data) => setState((previous) => ({ ...previous, data })), []);

  return { ...state, reload: run, setData };
}
