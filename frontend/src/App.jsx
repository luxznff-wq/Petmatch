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

import HomePage from './pages/HomePage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import PetDetailPage from './pages/PetDetailPage.jsx';
import SheltersPage from './pages/SheltersPage.jsx';
import ShelterDetailPage from './pages/ShelterDetailPage.jsx';
import HowToAdoptPage from './pages/HowToAdoptPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';

import AdopterDashboardPage from './pages/adopter/AdopterDashboardPage.jsx';
import ProfilePage from './pages/adopter/ProfilePage.jsx';
import FavoritesPage from './pages/adopter/FavoritesPage.jsx';
import MyRequestsPage from './pages/adopter/MyRequestsPage.jsx';
import RequestDetailPage from './pages/adopter/RequestDetailPage.jsx';
import MyInterviewsPage from './pages/adopter/MyInterviewsPage.jsx';
import MyAdoptionsPage from './pages/adopter/MyAdoptionsPage.jsx';

import ShelterDashboardPage from './pages/shelter/ShelterDashboardPage.jsx';
import ShelterPetsPage from './pages/shelter/ShelterPetsPage.jsx';
import PetFormPage from './pages/shelter/PetFormPage.jsx';
import ShelterRequestsPage from './pages/shelter/ShelterRequestsPage.jsx';
import ShelterRequestDetailPage from './pages/shelter/ShelterRequestDetailPage.jsx';
import ShelterInterviewsPage from './pages/shelter/ShelterInterviewsPage.jsx';
import ShelterAdoptionsPage from './pages/shelter/ShelterAdoptionsPage.jsx';
import ShelterProfilePage from './pages/shelter/ShelterProfilePage.jsx';
import ShelterStatsPage from './pages/shelter/ShelterStatsPage.jsx';

import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminSheltersPage from './pages/admin/AdminSheltersPage.jsx';
import AdminPetsPage from './pages/admin/AdminPetsPage.jsx';
import AdminRequestsPage from './pages/admin/AdminRequestsPage.jsx';
import AdminAdoptionsPage from './pages/admin/AdminAdoptionsPage.jsx';
import AdminReportsPage from './pages/admin/AdminReportsPage.jsx';
import AdminAuditPage from './pages/admin/AdminAuditPage.jsx';

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
  );
}
