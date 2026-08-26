import { useState } from 'react';
import { authApi, usersApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import AccountDataSection from '../../components/layout/AccountDataSection.jsx';

/** Perfil del usuario: datos personales y cambio de contraseña (§26). */
export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [profileError, setProfileError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    const form = new FormData(event.currentTarget);
    try {
      await usersApi.update(user.id, {
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        phone: form.get('phone') || undefined,
        address: form.get('address') || undefined,
        city: form.get('city'),
        avatarUrl: form.get('avatarUrl') || undefined
      });
      await refresh();
      toast.success('Perfil actualizado.');
    } catch (error) {
      setProfileError(error);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await authApi.changePassword({
        currentPassword: data.get('currentPassword'),
        newPassword: data.get('newPassword')
      });
      form.reset();
      toast.success('Contraseña actualizada.');
    } catch (error) {
      setPasswordError(error);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <header className="panel-head">
        <p className="kicker">MI PERFIL</p>
        <h1>Datos de tu cuenta</h1>
        <p className="muted">
          Estos datos se usan para completar tus solicitudes de adopción más rápido.
        </p>
      </header>

      <section className="panel-section">
        <h2>Información personal</h2>
        <form className="panel-form" onSubmit={saveProfile} noValidate>
          <div className="form-row">
            <Input
              label="Nombre"
              name="firstName"
              defaultValue={user.firstName}
              required
              error={profileError?.fieldError?.('firstName')}
            />
            <Input
              label="Apellidos"
              name="lastName"
              defaultValue={user.lastName}
              required
              error={profileError?.fieldError?.('lastName')}
            />
          </div>

          <Input label="Correo electrónico" value={user.email} disabled readOnly />

          <div className="form-row">
            <Input
              label="Teléfono"
              name="phone"
              defaultValue={user.phone ?? ''}
              error={profileError?.fieldError?.('phone')}
            />
            <Input
              label="Ciudad"
              name="city"
              defaultValue={user.city ?? ''}
              required
              error={profileError?.fieldError?.('city')}
            />
          </div>

          <Input
            label="Dirección"
            name="address"
            defaultValue={user.address ?? ''}
            error={profileError?.fieldError?.('address')}
          />
          <Input
            label="URL de tu foto"
            name="avatarUrl"
            type="url"
            defaultValue={user.avatarUrl ?? ''}
            error={profileError?.fieldError?.('avatarUrl')}
          />

          {profileError && !profileError.errors?.length && <ErrorMessage error={profileError} />}

          <Button type="submit" loading={savingProfile}>
            Guardar cambios
          </Button>
        </form>
      </section>

      <section className="panel-section">
        <h2>Cambiar contraseña</h2>
        <form className="panel-form" onSubmit={savePassword} noValidate>
          <Input
            label="Contraseña actual"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <Input
            label="Nueva contraseña"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            hint="Mínimo 8 caracteres, con una mayúscula, una minúscula y un número."
            error={passwordError?.fieldError?.('newPassword')}
          />

          {passwordError && !passwordError.errors?.length && <ErrorMessage error={passwordError} />}

          <Button type="submit" variant="secondary" loading={savingPassword}>
            Actualizar contraseña
          </Button>
        </form>
      </section>

      <AccountDataSection user={user} />
    </>
  );
}
