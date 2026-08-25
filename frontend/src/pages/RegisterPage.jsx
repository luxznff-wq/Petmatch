import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dashboardPathFor } from '../components/layout/Navbar.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';

/** Registro de adoptantes y refugios (§24). */
export default function RegisterPage() {
  const { register, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [role, setRole] = useState('ADOPTANTE');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  const fieldError = (field) => error?.fieldError?.(field);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const profile = await register({
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        email: form.get('email'),
        password: form.get('password'),
        phone: form.get('phone') || undefined,
        city: form.get('city'),
        role
      });
      toast.success(
        role === 'REFUGIO'
          ? 'Cuenta creada. Completa el perfil de tu refugio para publicar mascotas.'
          : '¡Bienvenido a PetMatch!'
      );
      navigate(dashboardPathFor(profile.role), { replace: true });
    } catch (registerError) {
      setError(registerError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card auth-card-wide">
        <p className="kicker">ÚNETE A PETMATCH</p>
        <h1>Crea tu cuenta</h1>
        <p className="muted">Empieza a encontrar a tu nuevo compañero.</p>

        <div className="role-picker" role="radiogroup" aria-label="Tipo de cuenta">
          <label className={role === 'ADOPTANTE' ? 'is-active' : ''}>
            <input
              type="radio"
              name="role"
              value="ADOPTANTE"
              checked={role === 'ADOPTANTE'}
              onChange={() => setRole('ADOPTANTE')}
            />
            <strong>Quiero adoptar</strong>
            <small>Explora mascotas, guarda favoritos y envía solicitudes.</small>
          </label>
          <label className={role === 'REFUGIO' ? 'is-active' : ''}>
            <input
              type="radio"
              name="role"
              value="REFUGIO"
              checked={role === 'REFUGIO'}
              onChange={() => setRole('REFUGIO')}
            />
            <strong>Represento un refugio</strong>
            <small>Publica mascotas y gestiona solicitudes de adopción.</small>
          </label>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <Input label="Nombre" name="firstName" required error={fieldError('firstName')} />
            <Input label="Apellidos" name="lastName" required error={fieldError('lastName')} />
          </div>

          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={fieldError('email')}
          />

          <div className="form-row">
            <Input label="Ciudad" name="city" required error={fieldError('city')} />
            <Input label="Teléfono" name="phone" error={fieldError('phone')} />
          </div>

          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint="Mínimo 8 caracteres, con una mayúscula, una minúscula y un número."
            error={fieldError('password')}
          />

          {error && !error.errors?.length && <ErrorMessage error={error} title="No pudimos crear tu cuenta" />}

          <Button type="submit" loading={submitting} className="full-width">
            Crear cuenta
          </Button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/ingresar">Inicia sesión</Link>
        </p>
      </div>
    </section>
  );
}
