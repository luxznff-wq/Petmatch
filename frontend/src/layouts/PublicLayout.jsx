import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';

/** Envoltorio de las páginas públicas: cabecera, contenido y pie. */
export default function PublicLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main id="contenido">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
