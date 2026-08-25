import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { petSummary } from '../../utils/format.js';

/**
 * Tarjeta de mascota del listado (§11, §13).
 *
 * Muestra imagen, nombre, especie, raza, edad, sexo, ciudad, refugio, estado,
 * características principales, botón de favorito y acceso al perfil.
 */
export default function PetCard({ pet, isFavorite = false, onToggleFavorite }) {
  const placeholder = 'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
         <rect width="100%" height="100%" fill="#f1e9e4"/>
         <text x="50%" y="52%" text-anchor="middle" font-size="64">🐾</text>
       </svg>`
    );

  return (
    <article className="pet-card">
      <div className="pet-card-photo">
        <img
          src={pet.image || placeholder}
          alt={`Fotografía de ${pet.name}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = placeholder;
          }}
        />
        <Badge status={pet.status} className="pet-card-status" />
        {onToggleFavorite && (
          <button
            type="button"
            className={`pet-card-heart ${isFavorite ? 'is-favorite' : ''}`}
            onClick={() => onToggleFavorite(pet.id)}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite ? `Quitar a ${pet.name} de favoritos` : `Agregar a ${pet.name} a favoritos`
            }
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="pet-card-body">
        <div className="pet-card-title">
          <h3>{pet.name}</h3>
          {pet.size && <span className="pet-card-size">{pet.size}</span>}
        </div>

        <p className="pet-card-meta">{petSummary(pet)}</p>
        {pet.breed && <p className="pet-card-breed">{pet.breed}</p>}

        <p className="pet-card-location">
          <MapPin size={14} aria-hidden="true" />
          {pet.city}
          {pet.shelterName && <span> · {pet.shelterName}</span>}
        </p>

        {pet.tags?.length > 0 && (
          <ul className="pet-card-tags">
            {pet.tags.slice(0, 3).map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}

        <Link to={`/mascotas/${pet.id}`} className="btn btn-secondary btn-sm pet-card-link">
          Conocer a {pet.name}
        </Link>
      </div>
    </article>
  );
}
