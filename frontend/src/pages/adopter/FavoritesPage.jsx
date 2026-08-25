import { Heart } from 'lucide-react';
import { favoritesApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import PetGrid from '../../components/pets/PetGrid.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';

/** Sección "Mis favoritos" (§23). */
export default function FavoritesPage() {
  const { data, loading, error, reload } = useAsync(() => favoritesApi.list(), []);
  const toast = useToast();

  async function remove(petId) {
    try {
      await favoritesApi.remove(petId);
      toast.success('Mascota quitada de tus favoritos.');
      reload();
    } catch (removeError) {
      toast.error(removeError.message);
    }
  }

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MIS FAVORITOS</p>
        <h1>Mascotas que guardaste</h1>
        <p className="muted">Te avisaremos si alguna deja de estar disponible.</p>
      </header>

      <ErrorMessage error={error} onRetry={reload} />

      {loading ? (
        <LoadingSpinner label="Cargando tus favoritos…" />
      ) : data?.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Todavía no guardaste favoritos"
          description="Pulsa el corazón en cualquier mascota para guardarla aquí."
          action={{ label: 'Explorar mascotas', to: '/mascotas' }}
        />
      ) : (
        <PetGrid pets={data} isFavorite={() => true} onToggleFavorite={remove} />
      )}
    </>
  );
}
