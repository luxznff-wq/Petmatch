import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { accountApi } from '../services/api.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';

/** Solicitud del enlace para restablecer la contraseña. */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      await accountApi.forgotPassword(form.get('email'));
      setSent(true);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        {sent ? (
          <>
            <span className="auth-icon" aria-hidden="true">
              <MailCheck size={32} />
            </span>
            <h1>Revisa tu correo</h1>
            <p className="muted">
              Si esa dirección corresponde a una cuenta de PetMatch, recibirás un enlace para
              crear una contraseña nueva. El enlace caduca en una hora y sólo puede usarse una vez.
            </p>
            <p className="muted">
              ¿No te llega? Revisa la carpeta de spam antes de volver a intentarlo.
            </p>
            <Button variant="outline" to="/ingresar" className="full-width">
              Volver a iniciar sesión
            </Button>
          </>
        ) : (
          <>
            <p className="kicker">RECUPERAR ACCESO</p>
            <h1>¿Olvidaste tu contraseña?</h1>
            <p className="muted">
              Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <Input
                label="Correo electrónico"
                name="email"
                type="email"
                autoComplete="email"
                required
                error={error?.fieldError?.('email')}
              />

              {error && !error.errors?.length && <ErrorMessage error={error} />}

              <Button type="submit" loading={submitting} className="full-width">
                Enviarme el enlace
              </Button>
            </form>

            <p className="auth-switch">
              <Link to="/ingresar">Volver a iniciar sesión</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
