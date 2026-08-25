import { PawPrint } from 'lucide-react';
import PetCard from './PetCard.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import EmptyState from '../ui/EmptyState.jsx';

/** Rejilla responsive de tarjetas de mascota. */
export default function PetGrid({
  pets,
  loading = false,
  isFavorite,
  onToggleFavorite,
  emptyTitle = 'No encontramos mascotas',
  emptyDescription = 'Prueba con otros filtros o revisa más adelante: publicamos mascotas cada semana.'
}) {
  if (loading) return <LoadingSpinner label="Buscando mascotas…" />;

  if (!pets || pets.length === 0) {
    return <EmptyState icon={PawPrint} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="pet-grid">
      {pets.map((pet) => (
        <PetCard
          key={pet.id}
          pet={pet}
          isFavorite={isFavorite?.(pet.id) ?? false}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
