import { useCallback, useEffect, useState } from 'react';
import { favoritesApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/** Conjunto vacío compartido: evita crear uno nuevo en cada render. */
const NONE = new Set();

/**
 * Conjunto de mascotas favoritas del adoptante en sesión.
 *
 * Actualiza la interfaz de forma optimista y revierte si la API falla, para
 * que el corazón responda al instante sin mentir sobre el estado real.
 */
export function useFavorites() {
  const { isAdopter } = useAuth();
  const [loaded, setLoaded] = useState(() => new Set());

  // Quien no es adoptante no tiene favoritos: se deriva en lugar de limpiar
  // el estado desde un efecto, que provocaría un render en cascada.
  const favoriteIds = isAdopter ? loaded : NONE;

  useEffect(() => {
    if (!isAdopter) return undefined;

    let active = true;
    favoritesApi
      .ids()
      .then((list) => {
        if (active) setLoaded(new Set(list));
      })
      .catch(() => {
        // Un fallo al cargar favoritos no debe romper el listado.
      });

    return () => {
      active = false;
    };
  }, [isAdopter]);

  const toggle = useCallback(
    async (petId) => {
      const removing = favoriteIds.has(petId);
      setLoaded((current) => {
        const next = new Set(current);
        if (removing) next.delete(petId);
        else next.add(petId);
        return next;
      });

      try {
        if (removing) await favoritesApi.remove(petId);
        else await favoritesApi.add(petId);
      } catch (error) {
        // Revierte el cambio optimista si la API lo rechaza.
        setLoaded((current) => {
          const next = new Set(current);
          if (removing) next.add(petId);
          else next.delete(petId);
          return next;
        });
        throw error;
      }
    },
    [favoriteIds]
  );

  return { favoriteIds, isFavorite: (petId) => favoriteIds.has(petId), toggleFavorite: toggle };
}
