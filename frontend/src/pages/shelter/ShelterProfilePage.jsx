import { useState } from 'react';
import { sheltersApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';

/** Alta y edición del perfil del refugio (§39, §41). */
export default function ShelterProfilePage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const shelter = useAsync(() => sheltersApi.mine(), []);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  if (shelter.loading) return <LoadingSpinner label="Cargando el perfil…" />;

  const current = shelter.data;
  const isNew = !current;
  const fieldError = (field) => error?.fieldError?.(field);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      logoUrl: form.get('logoUrl') || undefined,
      description: form.get('description') || undefined,
      address: form.get('address') || undefined,
      city: form.get('city'),
      region: form.get('region') || undefined,
      phone: form.get('phone') || undefined,
      email: form.get('email') || undefined,
      website: form.get('website') || undefined,
      hours: form.get('hours') || undefined,
      social: {
        facebook: form.get('facebook') || undefined,
        instagram: form.get('instagram') || undefined,
        whatsapp: form.get('whatsapp') || undefined
      }
    };

    try {
      if (isNew) {
        await sheltersApi.create(payload);
        toast.success('Refugio registrado. Un administrador lo revisará pronto.');
      } else {
        await sheltersApi.update(current.id, payload);
        toast.success('Perfil actualizado.');
      }
      await refresh();
      shelter.reload();
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="panel-head">
        <p className="kicker">PERFIL DEL REFUGIO</p>
        <div className="pet-detail-heading">
          <h1>{isNew ? 'Registra tu refugio' : current.name}</h1>
          {!isNew && <Badge status={current.status} />}
        </div>
        <p className="muted">
          {isNew
            ? 'Completa los datos de tu organización. Un administrador la verificará antes de que puedas publicar mascotas.'
            : 'Esta información se muestra en tu perfil público.'}
        </p>
      </header>

      {!isNew && current.status === 'PENDIENTE' && (
        <div className="notice notice-warning">
          Tu refugio está pendiente de verificación. Puedes editar los datos mientras tanto.
        </div>
      )}

      <form className="panel-form" onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>Identidad</legend>
          <Input
            label="Nombre del refugio"
            name="name"
            required
            defaultValue={current?.name ?? ''}
            error={fieldError('name')}
          />
          <Input
            label="URL del logo"
            name="logoUrl"
            type="url"
            defaultValue={current?.logoUrl ?? ''}
            error={fieldError('logoUrl')}
          />
          <Input
            as="textarea"
            rows={4}
            label="Descripción"
            name="description"
            defaultValue={current?.description ?? ''}
            hint="Cuenta quiénes son, desde cuándo trabajan y qué tipo de rescates hacen."
          />
        </fieldset>

        <fieldset>
          <legend>Ubicación</legend>
          <Input label="Dirección" name="address" defaultValue={current?.address ?? ''} />
          <div className="form-row">
            <Input
              label="Ciudad"
              name="city"
              required
              defaultValue={current?.city ?? ''}
              error={fieldError('city')}
            />
            <Input label="Región" name="region" defaultValue={current?.region ?? ''} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Contacto</legend>
          <div className="form-row">
            <Input
              label="Teléfono"
              name="phone"
              defaultValue={current?.phone ?? ''}
              error={fieldError('phone')}
            />
            <Input
              label="Correo"
              name="email"
              type="email"
              defaultValue={current?.email ?? ''}
              error={fieldError('email')}
            />
          </div>
          <Input
            label="Página web"
            name="website"
            type="url"
            defaultValue={current?.website ?? ''}
            error={fieldError('website')}
          />
          <Input
            label="Horarios de atención"
            name="hours"
            defaultValue={current?.hours ?? ''}
            placeholder="Lunes a sábado de 9:00 a 18:00"
          />
        </fieldset>

        <fieldset>
          <legend>Redes sociales</legend>
          <div className="form-row">
            <Input
              label="Facebook"
              name="facebook"
              type="url"
              defaultValue={current?.social?.facebook ?? ''}
            />
            <Input
              label="Instagram"
              name="instagram"
              type="url"
              defaultValue={current?.social?.instagram ?? ''}
            />
          </div>
          <Input label="WhatsApp" name="whatsapp" defaultValue={current?.social?.whatsapp ?? ''} />
        </fieldset>

        {error && !error.errors?.length && <ErrorMessage error={error} />}

        <Button type="submit" loading={saving}>
          {isNew ? 'Enviar para verificación' : 'Guardar cambios'}
        </Button>
      </form>
    </>
  );
}
