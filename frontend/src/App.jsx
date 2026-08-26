import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Heart,
  LayoutDashboard,
  PawPrint,
  ScrollText,
  Settings,
  UserRound,
  Users
} from 'lucide-react';

import PublicLayout from './layouts/PublicLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import LoadingSpinner from './components/ui/LoadingSpinner.jsx';

// El área pública se carga de inmediato: es lo primero que ve cualquier
// visitante y retrasarla sólo añadiría un parpadeo.
import HomePage from './pages/HomePage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import PetDetailPage from './pages/PetDetailPage.jsx';
import SheltersPage from './pages/SheltersPage.jsx';
import ShelterDetailPage from './pages/ShelterDetailPage.jsx';
import HowToAdoptPage from './pages/HowToAdoptPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

/*
 * El resto se carga bajo demanda. Un adoptante no necesita descargar el panel
 * administrativo, ni un visitante los documentos legales: separarlos reduce a
 * la mitad lo que se transfiere en la primera visita.
 */
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage.jsx'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage.jsx'));

const AdopterDashboardPage = lazy(() => import('./pages/adopter/AdopterDashboardPage.jsx'));
const ProfilePage = lazy(() => import('./pages/adopter/ProfilePage.jsx'));
const FavoritesPage = lazy(() => import('./pages/adopter/FavoritesPage.jsx'));
const MyRequestsPage = lazy(() => import('./pages/adopter/MyRequestsPage.jsx'));
const RequestDetailPage = lazy(() => import('./pages/adopter/RequestDetailPage.jsx'));
const MyInterviewsPage = lazy(() => import('./pages/adopter/MyInterviewsPage.jsx'));
const MyAdoptionsPage = lazy(() => import('./pages/adopter/MyAdoptionsPage.jsx'));

const ShelterDashboardPage = lazy(() => import('./pages/shelter/ShelterDashboardPage.jsx'));
const ShelterPetsPage = lazy(() => import('./pages/shelter/ShelterPetsPage.jsx'));
const PetFormPage = lazy(() => import('./pages/shelter/PetFormPage.jsx'));
const ShelterRequestsPage = lazy(() => import('./pages/shelter/ShelterRequestsPage.jsx'));
const ShelterRequestDetailPage = lazy(() => import('./pages/shelter/ShelterRequestDetailPage.jsx'));
const ShelterInterviewsPage = lazy(() => import('./pages/shelter/ShelterInterviewsPage.jsx'));
const ShelterAdoptionsPage = lazy(() => import('./pages/shelter/ShelterAdoptionsPage.jsx'));
const ShelterProfilePage = lazy(() => import('./pages/shelter/ShelterProfilePage.jsx'));
const ShelterStatsPage = lazy(() => import('./pages/shelter/ShelterStatsPage.jsx'));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AdminSheltersPage = lazy(() => import('./pages/admin/AdminSheltersPage.jsx'));
const AdminPetsPage = lazy(() => import('./pages/admin/AdminPetsPage.jsx'));
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage.jsx'));
const AdminAdoptionsPage = lazy(() => import('./pages/admin/AdminAdoptionsPage.jsx'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage.jsx'));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage.jsx'));

/** Barra lateral de cada panel, según la estructura de §8. */
const ADOPTER_LINKS = [
  { to: '/mi-cuenta', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/mi-cuenta/perfil', label: 'Perfil', icon: UserRound },
  { to: '/mi-cuenta/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/mi-cuenta/solicitudes', label: 'Mis solicitudes', icon: ClipboardList },
  { to: '/mi-cuenta/entrevistas', label: 'Mis entrevistas', icon: CalendarCheck },
  { to: '/mi-cuenta/adopciones', label: 'Mis adopciones', icon: PawPrint },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell }
];

const SHELTER_LINKS = [
  { to: '/refugio', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/refugio/mascotas', label: 'Mis mascotas', icon: PawPrint },
  { to: '/refugio/mascotas/nueva', label: 'Registrar mascota', icon: Settings },
  { to: '/refugio/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { to: '/refugio/entrevistas', label: 'Entrevistas', icon: CalendarCheck },
  { to: '/refugio/adopciones', label: 'Adopciones', icon: Heart },
  { to: '/refugio/perfil', label: 'Perfil del refugio', icon: Building2 },
  { to: '/refugio/estadisticas', label: 'Estadísticas', icon: BarChart3 }
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/refugios', label: 'Refugios', icon: Building2 },
  { to: '/admin/mascotas', label: 'Mascotas', icon: PawPrint },
  { to: '/admin/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { to: '/admin/adopciones', label: 'Adopciones', icon: Heart },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/admin/auditoria', label: 'Auditoría', icon: ScrollText }
];

export default function App() {
  return (
    // Una sola frontera de carga: mientras llega el trozo de código de la
    // ruta, se muestra el mismo indicador que usa el resto de la aplicación.
    <Suspense fallback={<LoadingSpinner label="Cargando…" />}>
      <Routes>
        {/* Área pública */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="mascotas" element={<ExplorePage />} />
          <Route path="mascotas/:id" element={<PetDetailPage />} />
          <Route path="refugios" element={<SheltersPage />} />
          <Route path="refugios/:id" element={<ShelterDetailPage />} />
          <Route path="como-adoptar" element={<HowToAdoptPage />} />
          <Route path="ingresar" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="recuperar" element={<ForgotPasswordPage />} />
          <Route path="restablecer" element={<ResetPasswordPage />} />
          <Route path="verificar-correo" element={<VerifyEmailPage />} />

          {/* Documentos legales: públicos y enlazados desde el registro. */}
          <Route path="terminos" element={<TermsPage />} />
          <Route path="privacidad" element={<PrivacyPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="notificaciones" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Panel del adoptante */}
        <Route element={<ProtectedRoute roles={['ADOPTANTE']} />}>
          <Route path="/mi-cuenta" element={<DashboardLayout title="Adoptante" links={ADOPTER_LINKS} />}>
            <Route index element={<AdopterDashboardPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="favoritos" element={<FavoritesPage />} />
            <Route path="solicitudes" element={<MyRequestsPage />} />
            <Route path="solicitudes/:id" element={<RequestDetailPage />} />
            <Route path="entrevistas" element={<MyInterviewsPage />} />
            <Route path="adopciones" element={<MyAdoptionsPage />} />
          </Route>
        </Route>

        {/* Panel del refugio */}
        <Route element={<ProtectedRoute roles={['REFUGIO']} />}>
          <Route path="/refugio" element={<DashboardLayout title="Refugio" links={SHELTER_LINKS} />}>
            <Route index element={<ShelterDashboardPage />} />
            <Route path="mascotas" element={<ShelterPetsPage />} />
            <Route path="mascotas/nueva" element={<PetFormPage />} />
            <Route path="mascotas/:id/editar" element={<PetFormPage />} />
            <Route path="solicitudes" element={<ShelterRequestsPage />} />
            <Route path="solicitudes/:id" element={<ShelterRequestDetailPage />} />
            <Route path="entrevistas" element={<ShelterInterviewsPage />} />
            <Route path="adopciones" element={<ShelterAdoptionsPage />} />
            <Route path="perfil" element={<ShelterProfilePage />} />
            <Route path="estadisticas" element={<ShelterStatsPage />} />
          </Route>
        </Route>

        {/* Panel administrativo */}
        <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
          <Route path="/admin" element={<DashboardLayout title="Administrador" links={ADMIN_LINKS} />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="usuarios" element={<AdminUsersPage />} />
            <Route path="refugios" element={<AdminSheltersPage />} />
            <Route path="mascotas" element={<AdminPetsPage />} />
            <Route path="solicitudes" element={<AdminRequestsPage />} />
            <Route path="solicitudes/:id" element={<ShelterRequestDetailPage />} />
            <Route path="adopciones" element={<AdminAdoptionsPage />} />
            <Route path="reportes" element={<AdminReportsPage />} />
            <Route path="auditoria" element={<AdminAuditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
