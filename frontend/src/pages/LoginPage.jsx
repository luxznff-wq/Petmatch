import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPathFor } from '../components/layout/Navbar.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';

/** Inicio de sesión y redirección según el rol (§25). */
export default function LoginPage() {
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const profile = await login({
        email: form.get('email'),
        password: form.get('password')
      });
      // Si el usuario venía de una página protegida, se le devuelve allí.
      navigate(location.state?.from?.pathname ?? dashboardPathFor(profile.role), { replace: true });
    } catch (loginError) {
      setError(loginError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="kicker">BIENVENIDO DE VUELTA</p>
        <h1>Inicia sesión</h1>
        <p className="muted">Continúa tu proceso de adopción.</p>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={error?.fieldError?.('email')}
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={error?.fieldError?.('password')}
          />

          {error && !error.errors?.length && <ErrorMessage error={error} title="No pudimos iniciar sesión" />}

          <Button type="submit" loading={submitting} className="full-width">
            Iniciar sesión
          </Button>
        </form>

        <p className="auth-switch">
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </p>
        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </section>
  );
}
