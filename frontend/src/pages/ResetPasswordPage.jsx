import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { accountApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';

/** Crea una contraseña nueva a partir del enlace recibido por correo. */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const newPassword = form.get('newPassword');

    // Se comprueba aquí para dar el aviso sin gastar el enlace, que es de un
    // solo uso: un fallo en el servidor lo consumiría igualmente.
    if (newPassword !== form.get('repeatPassword')) {
      setError(new Error('Las contraseñas no coinciden'));
      return;
    }

    setSubmitting(true);
    try {
      await accountApi.resetPassword({ token, newPassword });
      toast.success('Tu contraseña se actualizó. Ya puedes iniciar sesión.');
      navigate('/ingresar', { replace: true });
    } catch (resetError) {
      setError(resetError);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <p className="kicker">ENLACE INCOMPLETO</p>
          <h1>Falta el enlace</h1>
          <p className="muted">
            Abre el enlace tal y como aparece en el correo que te enviamos. Si lo copiaste a mano,
            puede que se haya perdido una parte.
          </p>
          <Button to="/recuperar" className="full-width">
            Pedir un enlace nuevo
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="kicker">NUEVA CONTRASEÑA</p>
        <h1>Crea tu contraseña</h1>
        <p className="muted">Elige una contraseña que no uses en otros sitios.</p>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Nueva contraseña"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            hint="Mínimo 8 caracteres, con una mayúscula, una minúscula y un número."
            error={error?.fieldError?.('newPassword')}
          />
          <Input
            label="Repite la contraseña"
            name="repeatPassword"
            type="password"
            autoComplete="new-password"
            required
          />

          {error && !error.errors?.length && <ErrorMessage error={error} />}

          <Button type="submit" loading={submitting} className="full-width">
            Guardar contraseña
          </Button>
        </form>

        <p className="auth-switch">
          ¿El enlace caducó? <Link to="/recuperar">Pide uno nuevo</Link>
        </p>
      </div>
    </section>
  );
}
