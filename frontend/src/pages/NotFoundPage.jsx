import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <section className="section not-found">
      <p className="kicker">ERROR 404</p>
      <h1>Esta página se fue a pasear</h1>
      <p className="muted">
        No encontramos lo que buscabas. Puede que el enlace haya cambiado o que la mascota ya
        tenga un hogar.
      </p>
      <div className="pet-detail-actions">
        <Button to="/">Volver al inicio</Button>
        <Button variant="outline" to="/mascotas">
          Explorar mascotas
        </Button>
      </div>
      <p className="muted">
        Si crees que es un error, <Link to="/como-adoptar">revisa cómo funciona PetMatch</Link>.
      </p>
    </section>
  );
}
