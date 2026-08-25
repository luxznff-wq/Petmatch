import { useState } from 'react';
import { requestsApi } from '../../services/api.js';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import ErrorMessage from '../ui/ErrorMessage.jsx';
import { HOUSING_TYPES } from '../../utils/constants.js';

/**
 * Formulario de solicitud de adopción (§27-§32).
 *
 * Reúne datos personales, información de vivienda, experiencia previa,
 * motivación y la declaración de veracidad. Los errores de validación del
 * servidor se muestran junto al campo correspondiente.
 */
export default function AdoptionRequestForm({ pet, user, onSuccess, onCancel }) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hadPetsBefore, setHadPetsBefore] = useState(false);

  const fieldError = (field) => (error?.fieldError ? error.fieldError(field) : undefined);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      petId: pet.id,
      applicant: {
        name: form.get('name'),
        age: Number(form.get('age')),
        phone: form.get('phone'),
        email: form.get('email'),
        address: form.get('address'),
        city: form.get('city')
      },
      housing: {
        type: form.get('housingType'),
        hasYard: form.get('hasYard') === 'on',
        livesAlone: form.get('livesAlone') === 'on',
        hasOtherPets: form.get('hasOtherPets') === 'on',
        hasChildren: form.get('hasChildren') === 'on'
      },
      hadPetsBefore,
      experience: hadPetsBefore ? form.get('experience') : undefined,
      motivation: form.get('motivation'),
      declarationAccepted: form.get('declaration') === 'on'
    };

    try {
      const created = await requestsApi.create(payload);
      onSuccess(created);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="adoption-form" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Datos personales</legend>
        <div className="form-row">
          <Input
            label="Nombre completo"
            name="name"
            required
            defaultValue={[user?.firstName, user?.lastName].filter(Boolean).join(' ')}
            error={fieldError('applicant.name')}
          />
          <Input
            label="Edad"
            name="age"
            type="number"
            min="18"
            max="120"
            required
            error={fieldError('applicant.age')}
          />
        </div>
        <div className="form-row">
          <Input
            label="Teléfono"
            name="phone"
            required
            defaultValue={user?.phone ?? ''}
            error={fieldError('applicant.phone')}
          />
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            required
            defaultValue={user?.email ?? ''}
            error={fieldError('applicant.email')}
          />
        </div>
        <Input
          label="Dirección"
          name="address"
          required
          defaultValue={user?.address ?? ''}
          error={fieldError('applicant.address')}
        />
        <Input
          label="Ciudad"
          name="city"
          required
          defaultValue={user?.city ?? ''}
          error={fieldError('applicant.city')}
        />
      </fieldset>

      <fieldset>
        <legend>Información de vivienda</legend>
        <Select
          label="Tipo de vivienda"
          name="housingType"
          required
          options={HOUSING_TYPES}
          error={fieldError('housing.type')}
        />
        <div className="check-grid">
          <label>
            <input type="checkbox" name="hasYard" /> ¿Tiene patio?
          </label>
          <label>
            <input type="checkbox" name="livesAlone" /> ¿Vive solo/a?
          </label>
          <label>
            <input type="checkbox" name="hasOtherPets" /> ¿Tiene otras mascotas?
          </label>
          <label>
            <input type="checkbox" name="hasChildren" /> ¿Hay niños en casa?
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Experiencia con mascotas</legend>
        <div className="radio-row" role="radiogroup" aria-label="¿Ha tenido mascotas anteriormente?">
          <span>¿Ha tenido mascotas anteriormente?</span>
          <label>
            <input
              type="radio"
              name="hadPets"
              checked={hadPetsBefore}
              onChange={() => setHadPetsBefore(true)}
            />
            Sí
          </label>
          <label>
            <input
              type="radio"
              name="hadPets"
              checked={!hadPetsBefore}
              onChange={() => setHadPetsBefore(false)}
            />
            No
          </label>
        </div>

        {hadPetsBefore && (
          <Input
            as="textarea"
            rows={3}
            label="Cuéntanos sobre tu experiencia"
            name="experience"
            required
            error={fieldError('experience')}
          />
        )}
      </fieldset>

      <fieldset>
        <legend>Motivación</legend>
        <Input
          as="textarea"
          rows={4}
          label={`¿Por qué deseas adoptar a ${pet.name}?`}
          name="motivation"
          required
          minLength={20}
          hint="Mínimo 20 caracteres."
          error={fieldError('motivation')}
        />
      </fieldset>

      <label className="declaration">
        <input type="checkbox" name="declaration" required />
        Declaro que la información proporcionada es verdadera.
      </label>
      {fieldError('declarationAccepted') && (
        <small className="field-error" role="alert">
          {fieldError('declarationAccepted')}
        </small>
      )}

      {error && !error.errors?.length && <ErrorMessage error={error} />}

      <div className="modal-actions">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          Enviar solicitud
        </Button>
      </div>
    </form>
  );
}
