import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import { petsApi } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ErrorMessage from '../../components/ui/ErrorMessage.jsx';
import {
  AGE_GROUPS,
  PET_ATTRIBUTES,
  PET_STATUSES,
  SEXES,
  SIZES,
  SPECIES,
  STATUS_LABELS
} from '../../utils/constants.js';

/** Alta y edición de mascotas (§43). El mismo formulario sirve para ambas. */
export default function PetFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const pet = useAsync(() => (isEdit ? petsApi.get(id) : Promise.resolve(null)), [id]);
  const [attributes, setAttributes] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState('');

  // Al cargar una mascota existente se copian sus características al estado.
  useEffect(() => {
    if (pet.data?.attributes) setAttributes(pet.data.attributes);
  }, [pet.data]);

  const fieldError = (field) => error?.fieldError?.(field);
  const current = pet.data;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      species: form.get('species'),
      breed: form.get('breed') || undefined,
      sex: form.get('sex'),
      size: form.get('size') || undefined,
      ageGroup: form.get('ageGroup') || undefined,
      ageLabel: form.get('ageLabel') || undefined,
      birthDate: form.get('birthDate') || undefined,
      color: form.get('color') || undefined,
      weightKg: form.get('weightKg') ? Number(form.get('weightKg')) : undefined,
      description: form.get('description') || undefined,
      story: form.get('story') || undefined,
      address: form.get('address') || undefined,
      city: form.get('city'),
      region: form.get('region') || undefined,
      status: form.get('status'),
      attributes
    };
    if (!isEdit && form.get('image')) payload.image = form.get('image');

    try {
      const saved = isEdit ? await petsApi.update(id, payload) : await petsApi.create(payload);
      toast.success(isEdit ? 'Mascota actualizada.' : `${saved.name} fue registrada.`);
      navigate('/refugio/mascotas');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  async function addImage() {
    if (!newImage.trim()) return;
    try {
      await petsApi.addImage(id, { url: newImage.trim(), isPrimary: false });
      setNewImage('');
      pet.reload();
      toast.success('Fotografía agregada.');
    } catch (imageError) {
      toast.error(imageError.message);
    }
  }

  async function removeImage(imageId) {
    try {
      await petsApi.removeImage(id, imageId);
      pet.reload();
    } catch (imageError) {
      toast.error(imageError.message);
    }
  }

  if (isEdit && pet.loading) return <LoadingSpinner label="Cargando la mascota…" />;
  if (isEdit && pet.error) return <ErrorMessage error={pet.error} onRetry={pet.reload} />;

  return (
    <>
      <header className="panel-head">
        <p className="kicker">{isEdit ? 'EDITAR MASCOTA' : 'REGISTRAR MASCOTA'}</p>
        <h1>{isEdit ? `Editar a ${current?.name}` : 'Nueva mascota'}</h1>
        <p className="muted">
          Cuanta más información completes, más fácil será que alguien se enamore de ella.
        </p>
      </header>

      <form className="panel-form" onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>Datos básicos</legend>
          <div className="form-row">
            <Input
              label="Nombre"
              name="name"
              required
              defaultValue={current?.name}
              error={fieldError('name')}
            />
            <Select
              label="Especie"
              name="species"
              required
              defaultValue={current?.species ?? 'Perro'}
              options={SPECIES}
              error={fieldError('species')}
            />
          </div>

          <div className="form-row">
            <Input label="Raza" name="breed" defaultValue={current?.breed ?? ''} error={fieldError('breed')} />
            <Select
              label="Sexo"
              name="sex"
              required
              defaultValue={current?.sex ?? 'Macho'}
              options={SEXES}
              error={fieldError('sex')}
            />
          </div>

          <div className="form-row">
            <Select
              label="Tamaño"
              name="size"
              defaultValue={current?.size ?? ''}
              placeholder="Sin especificar"
              options={SIZES}
            />
            <Select
              label="Grupo etario"
              name="ageGroup"
              defaultValue={current?.ageGroup ?? ''}
              placeholder="Sin especificar"
              options={AGE_GROUPS}
            />
          </div>

          <div className="form-row">
            <Input
              label="Fecha de nacimiento"
              name="birthDate"
              type="date"
              defaultValue={current?.birthDate ?? ''}
              hint="Si la indicas, la edad se calcula automáticamente."
              error={fieldError('birthDate')}
            />
            <Input
              label="Edad aproximada"
              name="ageLabel"
              defaultValue={current?.ageLabel ?? ''}
              hint="Solo si no conoces la fecha exacta. Ej: 2 años."
            />
          </div>

          <div className="form-row">
            <Input label="Color" name="color" defaultValue={current?.color ?? ''} />
            <Input
              label="Peso (kg)"
              name="weightKg"
              type="number"
              step="0.1"
              min="0.1"
              defaultValue={current?.weightKg ?? ''}
              error={fieldError('weightKg')}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Ubicación</legend>
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
          <Input label="Dirección o referencia" name="address" defaultValue={current?.address ?? ''} />
        </fieldset>

        <fieldset>
          <legend>Descripción</legend>
          <Input
            as="textarea"
            rows={3}
            label="Descripción"
            name="description"
            defaultValue={current?.description ?? ''}
          />
          <Input
            as="textarea"
            rows={4}
            label="Historia"
            name="story"
            defaultValue={current?.story ?? ''}
          />
        </fieldset>

        <fieldset>
          <legend>Características y compatibilidad</legend>
          <div className="check-grid">
            {PET_ATTRIBUTES.map((attribute) => (
              <label key={attribute.key}>
                <input
                  type="checkbox"
                  checked={attributes[attribute.key] === true}
                  onChange={(event) =>
                    setAttributes((current) => ({
                      ...current,
                      [attribute.key]: event.target.checked
                    }))
                  }
                />
                {attribute.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Publicación</legend>
          <Select
            label="Estado"
            name="status"
            defaultValue={current?.status ?? 'DISPONIBLE'}
            options={PET_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
          />
          {!isEdit && (
            <Input
              label="URL de la fotografía principal"
              name="image"
              type="url"
              hint="Después podrás agregar más fotografías a la galería."
              error={fieldError('image')}
            />
          )}
        </fieldset>

        {error && !error.errors?.length && <ErrorMessage error={error} />}

        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={() => navigate('/refugio/mascotas')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Registrar mascota'}
          </Button>
        </div>
      </form>

      {isEdit && (
        <section className="panel-section">
          <h2>Galería</h2>
          <div className="gallery-editor">
            {current?.images?.map((image) => (
              <figure key={image.id}>
                <img src={image.url} alt="" />
                {image.isPrimary && <figcaption>Principal</figcaption>}
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label="Eliminar fotografía"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </figure>
            ))}
          </div>

          <div className="gallery-add">
            <Input
              label="Agregar fotografía por URL"
              type="url"
              value={newImage}
              onChange={(event) => setNewImage(event.target.value)}
              placeholder="https://…"
            />
            <Button variant="secondary" icon={ImagePlus} onClick={addImage} type="button">
              Agregar
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
