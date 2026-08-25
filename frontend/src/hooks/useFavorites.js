import { useCallback, useEffect, useState } from 'react';
import { favoritesApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Conjunto de mascotas favoritas del adoptante en sesión.
 *
 * Actualiza la interfaz de forma optimista y revierte si la API falla, para
 * que el corazón responda al instante sin mentir sobre el estado real.
 */
export function useFavorites() {
  const { isAdopter } = useAuth();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (!isAdopter) {
      setIds(new Set());
      return;
    }
    let active = true;
    favoritesApi
      .ids()
      .then((list) => {
        if (active) setIds(new Set(list));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdopter]);

  const toggle = useCallback(
    async (petId) => {
      const removing = ids.has(petId);
      setIds((current) => {
        const next = new Set(current);
        if (removing) next.delete(petId);
        else next.add(petId);
        return next;
      });

      try {
        if (removing) await favoritesApi.remove(petId);
        else await favoritesApi.add(petId);
      } catch (error) {
        setIds((current) => {
          const next = new Set(current);
          if (removing) next.add(petId);
          else next.delete(petId);
          return next;
        });
        throw error;
      }
    },
    [ids]
  );

  return { favoriteIds: ids, isFavorite: (petId) => ids.has(petId), toggleFavorite: toggle };
}
