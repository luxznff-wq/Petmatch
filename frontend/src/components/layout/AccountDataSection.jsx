import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Download, MailWarning, Trash2 } from 'lucide-react';
import { accountApi, getToken } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Badge from '../ui/Badge.jsx';
import { formatDate } from '../../utils/format.js';

/**
 * Verificación del correo y derechos sobre los datos personales.
 *
 * Reúne en un solo bloque lo que la Política de Privacidad promete: descargar
 * una copia de los datos (acceso y portabilidad) y eliminar la cuenta
 * (cancelación).
 */
export default function AccountDataSection({ user }) {
  const { logout, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function resendVerification() {
    setResending(true);
    try {
      await accountApi.resendVerification();
      toast.success('Te enviamos un correo de confirmación.');
      await refresh().catch(() => {});
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  }

  /**
   * La descarga no puede ser un enlace normal: el endpoint exige la cabecera
   * de autorización, así que se pide con fetch y se guarda el blob.
   */
  async function downloadData() {
    setExporting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/account/me/export`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('No pudimos preparar tu archivo. Inténtalo de nuevo.');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `petmatch-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Descargamos una copia de tus datos.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    setDeleting(true);
    setDeleteError(null);

    const form = new FormData(event.currentTarget);
    try {
      await accountApi.deleteAccount({
        password: form.get('password'),
        confirmation: form.get('confirmation')
      });
      logout();
      navigate('/', { replace: true });
      toast.success('Tu cuenta fue eliminada. Gracias por haber formado parte de PetMatch.');
    } catch (error) {
      setDeleteError(error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="panel-section">
        <h2>Correo electrónico</h2>
        {user.emailVerifiedAt ? (
          <p className="verified-line">
            <Badge tone="success">
              <BadgeCheck size={13} aria-hidden="true" /> Verificado
            </Badge>
            <span className="muted">Confirmado el {formatDate(user.emailVerifiedAt)}.</span>
          </p>
        ) : (
          <>
            <div className="notice notice-warning">
              <MailWarning size={16} aria-hidden="true" />
              Tu correo aún no está confirmado. Verificarlo nos permite ayudarte a recuperar el
              acceso si olvidas tu contraseña.
            </div>
            <Button variant="outline" onClick={resendVerification} loading={resending}>
              Reenviar correo de confirmación
            </Button>
          </>
        )}
      </section>

      <section className="panel-section">
        <h2>Tus datos personales</h2>
        <p className="muted">
          Puedes descargar todo lo que guardamos sobre ti o eliminar tu cuenta cuando quieras.
          Consulta la <Link to="/privacidad">Política de Privacidad</Link> para saber qué datos
          tratamos y por qué.
        </p>

        <div className="pet-detail-actions">
          <Button variant="outline" icon={Download} onClick={downloadData} loading={exporting}>
            Descargar mis datos
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Eliminar mi cuenta
          </Button>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar tu cuenta"
        description="Esta acción es permanente y no se puede deshacer."
        size="sm"
      >
        <p className="muted">
          Se borrarán tu perfil, tus favoritos, tus solicitudes abiertas y tus notificaciones. Las
          adopciones que ya completaste se conservan como historial del refugio.
        </p>

        <form className="panel-form" onSubmit={deleteAccount} noValidate>
          <Input
            label="Confirma tu contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Input
            label="Escribe ELIMINAR para confirmar"
            name="confirmation"
            required
            placeholder="ELIMINAR"
            error={deleteError?.fieldError?.('confirmation')}
          />

          {deleteError && !deleteError.errors?.length && (
            <p className="field-error" role="alert">
              {deleteError.message}
            </p>
          )}

          <div className="modal-actions">
            <Button variant="ghost" type="button" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit" loading={deleting}>
              Eliminar definitivamente
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
