import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta una función asíncrona y expone `{ data, error, loading, reload }`.
 *
 * Evita actualizar el estado de un componente ya desmontado y descarta las
 * respuestas de peticiones que quedaron obsoletas por otra más reciente.
 */
export function useAsync(asyncFn, dependencies = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: immediate });
  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const currentRun = ++runId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await asyncFn();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}
