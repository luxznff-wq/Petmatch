import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Link to="/" className="brand">
            pet<span>match</span>
            <b aria-hidden="true">♥</b>
          </Link>
          <p>Un hogar para cada historia.</p>
        </div>

        <nav aria-label="Enlaces del pie de página">
          <Link to="/mascotas">Explorar mascotas</Link>
          <Link to="/refugios">Refugios</Link>
          <Link to="/como-adoptar">¿Cómo adoptar?</Link>
          <a href="/api/docs" target="_blank" rel="noreferrer noopener">
            Documentación de la API
          </a>
        </nav>
      </div>
      <small>© {new Date().getFullYear()} PetMatch · Proyecto académico de Herramientas de Desarrollo</small>
    </footer>
  );
}
