import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleX } from 'lucide-react';
import { accountApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Button from '../components/ui/Button.jsx';

/** Confirma el correo a partir del enlace recibido. */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { isAuthenticated, refresh } = useAuth();

  const [state, setState] = useState(token ? 'verificando' : 'sin-token');
  const [message, setMessage] = useState('');
  // El enlace es de un solo uso: en desarrollo React monta dos veces y sin
  // esta guarda el segundo intento fallaría con un token ya consumido.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    accountApi
      .verifyEmail(token)
      .then(async () => {
        setState('verificado');
        if (isAuthenticated) await refresh().catch(() => {});
      })
      .catch((error) => {
        setState('error');
        setMessage(error.message);
      });
  }, [token, isAuthenticated, refresh]);

  return (
    <section className="auth-page">
      <div className="auth-card">
        {state === 'verificando' && <LoadingSpinner label="Confirmando tu correo…" />}

        {state === 'verificado' && (
          <>
            <span className="auth-icon auth-icon-success" aria-hidden="true">
              <CircleCheck size={32} />
            </span>
            <h1>Correo confirmado</h1>
            <p className="muted">
              Gracias. Tu dirección quedó verificada y ya puedes usar PetMatch con normalidad.
            </p>
            <Button to={isAuthenticated ? '/mi-cuenta' : '/ingresar'} className="full-width">
              {isAuthenticated ? 'Ir a mi panel' : 'Iniciar sesión'}
            </Button>
          </>
        )}

        {(state === 'error' || state === 'sin-token') && (
          <>
            <span className="auth-icon auth-icon-error" aria-hidden="true">
              <CircleX size={32} />
            </span>
            <h1>No pudimos confirmar tu correo</h1>
            <p className="muted">
              {state === 'sin-token'
                ? 'El enlace está incompleto. Ábrelo tal y como aparece en el correo.'
                : message}
            </p>
            <p className="muted">
              Si el enlace caducó, entra en tu cuenta y pide uno nuevo desde tu perfil.
            </p>
            <Button variant="outline" to="/" className="full-width">
              Volver al inicio
            </Button>
          </>
        )}

        <p className="auth-switch">
          <Link to="/">Ir a PetMatch</Link>
        </p>
      </div>
    </section>
  );
}
