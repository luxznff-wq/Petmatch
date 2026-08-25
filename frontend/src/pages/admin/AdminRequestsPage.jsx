import ShelterRequestsPage from '../shelter/ShelterRequestsPage.jsx';

/**
 * Supervisión global de solicitudes (§46).
 *
 * Reutiliza la tabla del refugio: la API ya devuelve todas las solicitudes
 * cuando quien consulta es administrador, así que sólo cambia el destino de
 * los enlaces al detalle.
 */
export default function AdminRequestsPage() {
  return (
    <ShelterRequestsPage
      basePath="/admin/solicitudes"
      title="Todas las solicitudes de la plataforma"
    />
  );
}
