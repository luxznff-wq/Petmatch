import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Heart, MapPin, PawPrint, Search, ShieldCheck } from 'lucide-react';
import { petsApi, statsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PetGrid from '../components/pets/PetGrid.jsx';
import Button from '../components/ui/Button.jsx';
import { formatNumber } from '../utils/format.js';
import { HOW_IT_WORKS } from '../utils/constants.js';

/** Página de inicio (§9, §10, §11, §12). */
export default function HomePage() {
  const navigate = useNavigate();
  const { isAdopter } = useAuth();
  const toast = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [term, setTerm] = useState('');

  const stats = useAsync(() => statsApi.public(), []);
  const featured = useAsync(
    () => petsApi.list({ status: 'DISPONIBLE', limit: 8, sort: 'recent' }),
    []
  );

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/mascotas${term.trim() ? `?search=${encodeURIComponent(term.trim())}` : ''}`);
  };

  const handleFavorite = async (petId) => {
    if (!isAdopter) {
      toast.notify('Inicia sesión como adoptante para guardar favoritos.');
      navigate('/ingresar');
      return;
    }
    try {
      await toggleFavorite(petId);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const metrics = [
    { icon: PawPrint, value: stats.data?.pets, label: 'Mascotas registradas' },
    { icon: Heart, value: stats.data?.adoptions, label: 'Adopciones realizadas' },
    { icon: Building2, value: stats.data?.shelters, label: 'Refugios registrados' },
    { icon: MapPin, value: stats.data?.cities, label: 'Ciudades disponibles' }
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" /> Adopción responsable y segura
          </p>
          <h1>
            Encuentra a tu <em>nuevo mejor amigo</em>
          </h1>
          <p className="hero-text">
            Conoce mascotas que buscan un hogar y descubre cómo puedes cambiar sus vidas.
          </p>

          <form className="hero-search" onSubmit={handleSearch} role="search">
            <label htmlFor="hero-buscador" className="sr-only">
              Buscar mascotas
            </label>
            <Search size={18} aria-hidden="true" />
            <input
              id="hero-buscador"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Busca por nombre, raza, ciudad o refugio"
            />
            <Button type="submit">Buscar mascotas</Button>
          </form>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1100&q=85"
            alt="Perro esperando un hogar"
          />
        </div>
      </section>

      <section className="stats" aria-label="Estadísticas de PetMatch">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <metric.icon size={22} aria-hidden="true" />
            <strong>{stats.loading ? '—' : formatNumber(metric.value)}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="section" id="destacadas">
        <header className="section-head">
          <div>
            <p className="kicker">CONÓCELOS</p>
            <h2>Mascotas que buscan hogar</h2>
          </div>
          <Button variant="outline" to="/mascotas">
            Ver todas
          </Button>
        </header>

        <PetGrid
          pets={featured.data?.data}
          loading={featured.loading}
          isFavorite={isFavorite}
          onToggleFavorite={handleFavorite}
          emptyTitle="Todavía no hay mascotas publicadas"
          emptyDescription="Cuando los refugios registren mascotas aparecerán aquí."
        />
      </section>

      <section className="section how-section">
        <p className="kicker">UN PROCESO CON PROPÓSITO</p>
        <h2>¿Cómo funciona?</h2>
        <ol className="steps">
          {HOW_IT_WORKS.map((item) => (
            <li key={item.step}>
              <b>{item.step}</b>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
        <Button variant="secondary" to="/como-adoptar">
          Conoce el proceso completo
        </Button>
      </section>
    </>
  );
}
