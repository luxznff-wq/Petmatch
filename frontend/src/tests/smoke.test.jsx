import { afterEach, describe, expect, test, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from './utils.jsx';
import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';

/**
 * Prueba de humo de todas las páginas.
 *
 * No comprueba contenido: comprueba que ninguna revienta ante los dos casos
 * que más se dan en producción y menos se prueban a mano — que la API
 * devuelva vacío y que la API falle. Un `data.map` sobre `undefined` deja la
 * pantalla en blanco, y es el error más fácil de colar.
 */

/* ----------------------------------------------------------- Páginas */

import HomePage from '../pages/HomePage.jsx';
import ExplorePage from '../pages/ExplorePage.jsx';
import PetDetailPage from '../pages/PetDetailPage.jsx';
import SheltersPage from '../pages/SheltersPage.jsx';
import ShelterDetailPage from '../pages/ShelterDetailPage.jsx';
import HowToAdoptPage from '../pages/HowToAdoptPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import NotificationsPage from '../pages/NotificationsPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';

import AdopterDashboardPage from '../pages/adopter/AdopterDashboardPage.jsx';
import ProfilePage from '../pages/adopter/ProfilePage.jsx';
import FavoritesPage from '../pages/adopter/FavoritesPage.jsx';
import MyRequestsPage from '../pages/adopter/MyRequestsPage.jsx';
import RequestDetailPage from '../pages/adopter/RequestDetailPage.jsx';
import MyInterviewsPage from '../pages/adopter/MyInterviewsPage.jsx';
import MyAdoptionsPage from '../pages/adopter/MyAdoptionsPage.jsx';

import ShelterDashboardPage from '../pages/shelter/ShelterDashboardPage.jsx';
import ShelterPetsPage from '../pages/shelter/ShelterPetsPage.jsx';
import PetFormPage from '../pages/shelter/PetFormPage.jsx';
import ShelterRequestsPage from '../pages/shelter/ShelterRequestsPage.jsx';
import ShelterRequestDetailPage from '../pages/shelter/ShelterRequestDetailPage.jsx';
import ShelterInterviewsPage from '../pages/shelter/ShelterInterviewsPage.jsx';
import ShelterAdoptionsPage from '../pages/shelter/ShelterAdoptionsPage.jsx';
import ShelterProfilePage from '../pages/shelter/ShelterProfilePage.jsx';
import ShelterStatsPage from '../pages/shelter/ShelterStatsPage.jsx';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminSheltersPage from '../pages/admin/AdminSheltersPage.jsx';
import AdminPetsPage from '../pages/admin/AdminPetsPage.jsx';
import AdminRequestsPage from '../pages/admin/AdminRequestsPage.jsx';
import AdminAdoptionsPage from '../pages/admin/AdminAdoptionsPage.jsx';
import AdminReportsPage from '../pages/admin/AdminReportsPage.jsx';
import AdminAuditPage from '../pages/admin/AdminAuditPage.jsx';

/* ------------------------------------------------------- Simulaciones */

/**
 * Respuesta genérica "todo vacío": listas sin elementos, objetos sin campos.
 * Es lo que ve una cuenta recién creada, y donde más aparecen los fallos de
 * acceso a propiedades inexistentes.
 */
const vacio = () =>
  vi.fn(async (url) => {
    const cuerpo = { success: true, pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };

    // Perfil de la sesión: el mínimo para que los paneles se monten.
    if (url.includes('/auth/me')) {
      return respuesta({
        ...cuerpo,
        data: { id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'ana@x.com', role: 'ADOPTANTE' }
      });
    }
    // El panel devuelve su estructura con todas las colecciones vacías.
    if (url.includes('/workspace')) {
      return respuesta({
        ...cuerpo,
        data: {
          role: 'ADOPTANTE',
          summary: {},
          shelter: null,
          favorites: [],
          requests: [],
          interviews: [],
          adoptions: [],
          pets: [],
          users: [],
          shelters: [],
          audit: [],
          notifications: []
        }
      });
    }
    if (url.includes('/notifications')) {
      return respuesta({ ...cuerpo, data: { items: [], unread: 0 } });
    }
    if (url.includes('/reports/') || url.includes('/admin/dashboard')) {
      return respuesta({ ...cuerpo, data: {} });
    }
    // Recursos por identificador: objeto mínimo, sin colecciones anidadas.
    if (/\/(pets|shelters|adoptions\/requests|adoptions)\/\d+$/.test(url.split('?')[0])) {
      return respuesta({ ...cuerpo, data: { id: 1 } });
    }
    if (url.includes('/shelters/me')) return respuesta({ ...cuerpo, data: null });

    return respuesta({ ...cuerpo, data: [] });
  });

/** Todas las peticiones fallan con un error del servidor. */
const falla = () =>
  vi.fn(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ success: false, message: 'Servicio no disponible' })
  }));

const respuesta = (json) => ({ ok: true, status: 200, json: async () => json });

/** Espera a que la página deje de estar cargando y devuelve el contenedor. */
async function esperarRender(container) {
  await waitFor(() => {
    expect(container.textContent.length).toBeGreaterThan(0);
  });
  return container;
}

/**
 * Las páginas privadas se montan dentro de su guardia, igual que en la
 * aplicación: `ProtectedRoute` espera a que la sesión esté resuelta antes de
 * renderizarlas. Probarlas sueltas daría fallos que no ocurren en la práctica.
 */
const protegida = (elemento) => {
  localStorage.setItem('petmatch_token', 'jwt-de-prueba');
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="*" element={elemento} />
      </Route>
      <Route path="/ingresar" element={<p>Acceso</p>} />
    </Routes>
  );
};

/** Renderiza dentro de una ruta con parámetro, para las páginas de detalle. */
const conParametro = (Componente, ruta, patron, privada = true) => ({
  elemento: () => {
    const rutas = (
      <Routes>
        <Route path={patron} element={<Componente />} />
      </Routes>
    );
    return privada ? protegida(rutas) : rutas;
  },
  ruta
});

const PAGINAS = [
  ['HomePage', () => <HomePage />, '/'],
  ['ExplorePage', () => <ExplorePage />, '/mascotas'],
  ['SheltersPage', () => <SheltersPage />, '/refugios'],
  ['HowToAdoptPage', () => <HowToAdoptPage />, '/como-adoptar'],
  ['NotFoundPage', () => <NotFoundPage />, '/ruta-inexistente'],
  ['NotificationsPage', () => protegida(<NotificationsPage />), '/notificaciones'],
  ['VerifyEmailPage', () => <VerifyEmailPage />, '/verificar-correo'],

  ['AdopterDashboardPage', () => protegida(<AdopterDashboardPage />), '/mi-cuenta'],
  ['ProfilePage', () => protegida(<ProfilePage />), '/mi-cuenta/perfil'],
  ['FavoritesPage', () => protegida(<FavoritesPage />), '/mi-cuenta/favoritos'],
  ['MyRequestsPage', () => protegida(<MyRequestsPage />), '/mi-cuenta/solicitudes'],
  ['MyInterviewsPage', () => protegida(<MyInterviewsPage />), '/mi-cuenta/entrevistas'],
  ['MyAdoptionsPage', () => protegida(<MyAdoptionsPage />), '/mi-cuenta/adopciones'],

  ['ShelterDashboardPage', () => protegida(<ShelterDashboardPage />), '/refugio'],
  ['ShelterPetsPage', () => protegida(<ShelterPetsPage />), '/refugio/mascotas'],
  ['PetFormPage (alta)', () => protegida(<PetFormPage />), '/refugio/mascotas/nueva'],
  ['ShelterRequestsPage', () => protegida(<ShelterRequestsPage />), '/refugio/solicitudes'],
  ['ShelterInterviewsPage', () => protegida(<ShelterInterviewsPage />), '/refugio/entrevistas'],
  ['ShelterAdoptionsPage', () => protegida(<ShelterAdoptionsPage />), '/refugio/adopciones'],
  ['ShelterProfilePage', () => protegida(<ShelterProfilePage />), '/refugio/perfil'],
  ['ShelterStatsPage', () => protegida(<ShelterStatsPage />), '/refugio/estadisticas'],

  ['AdminDashboardPage', () => protegida(<AdminDashboardPage />), '/admin'],
  ['AdminUsersPage', () => protegida(<AdminUsersPage />), '/admin/usuarios'],
  ['AdminSheltersPage', () => protegida(<AdminSheltersPage />), '/admin/refugios'],
  ['AdminPetsPage', () => protegida(<AdminPetsPage />), '/admin/mascotas'],
  ['AdminRequestsPage', () => protegida(<AdminRequestsPage />), '/admin/solicitudes'],
  ['AdminAdoptionsPage', () => protegida(<AdminAdoptionsPage />), '/admin/adopciones'],
  ['AdminReportsPage', () => protegida(<AdminReportsPage />), '/admin/reportes'],
  ['AdminAuditPage', () => protegida(<AdminAuditPage />), '/admin/auditoria']
];

const DETALLES = [
  ['PetDetailPage', conParametro(PetDetailPage, '/mascotas/1', '/mascotas/:id', false)],
  ['ShelterDetailPage', conParametro(ShelterDetailPage, '/refugios/1', '/refugios/:id', false)],
  [
    'RequestDetailPage',
    conParametro(RequestDetailPage, '/mi-cuenta/solicitudes/1', '/mi-cuenta/solicitudes/:id')
  ],
  [
    'ShelterRequestDetailPage',
    conParametro(ShelterRequestDetailPage, '/refugio/solicitudes/1', '/refugio/solicitudes/:id')
  ],
  ['PetFormPage (edición)', conParametro(PetFormPage, '/refugio/mascotas/1/editar', '/refugio/mascotas/:id/editar')]
];

/** Errores de React que no deben aparecer durante el render. */
function vigilarConsola() {
  const fallos = [];
  const original = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const texto = String(args[0] ?? '');
    // Se ignoran los avisos de acto no envuelto: son ruido del entorno.
    if (!texto.includes('not wrapped in act')) fallos.push(texto);
    original(...args);
  });
  return fallos;
}

afterEach(() => vi.unstubAllGlobals());

describe('Todas las páginas con la API vacía', () => {
  for (const [nombre, elemento, ruta] of PAGINAS) {
    test(nombre, async () => {
      vi.stubGlobal('fetch', vacio());
      const { container } = renderWithProviders(elemento(), { route: ruta });
      await esperarRender(container);
    });
  }

  for (const [nombre, { elemento, ruta }] of DETALLES) {
    test(nombre, async () => {
      vi.stubGlobal('fetch', vacio());
      const { container } = renderWithProviders(elemento(), { route: ruta });
      await esperarRender(container);
    });
  }
});

describe('Todas las páginas cuando la API falla', () => {
  for (const [nombre, elemento, ruta] of PAGINAS) {
    test(nombre, async () => {
      const fallos = vigilarConsola();
      vi.stubGlobal('fetch', falla());

      const { container } = renderWithProviders(elemento(), { route: ruta });
      await esperarRender(container);

      // Un fallo de la API debe verse como un mensaje, nunca como una
      // excepción que rompa el render.
      const excepciones = fallos.filter((linea) => /Uncaught|threw an error/i.test(linea));
      expect(excepciones, `${nombre} lanzó una excepción al fallar la API`).toEqual([]);
    });
  }

  for (const [nombre, { elemento, ruta }] of DETALLES) {
    test(nombre, async () => {
      const fallos = vigilarConsola();
      vi.stubGlobal('fetch', falla());

      const { container } = renderWithProviders(elemento(), { route: ruta });
      await esperarRender(container);

      const excepciones = fallos.filter((linea) => /Uncaught|threw an error/i.test(linea));
      expect(excepciones, `${nombre} lanzó una excepción al fallar la API`).toEqual([]);
    });
  }
});
