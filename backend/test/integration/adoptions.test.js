import test, { beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  auth,
  createAdmin,
  createVerifiedShelter,
  petPayload,
  registerUser,
  requestPayload,
  resetDatabase
} from '../helpers.js';

/** Escenario base: administrador, refugio verificado, mascota y adoptante. */
async function scenario() {
  const admin = await createAdmin();
  const { owner, shelter } = await createVerifiedShelter(admin);
  const pet = (
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
  ).body.data;
  const adopter = await registerUser({ email: `adoptante.${Date.now()}@example.com` });
  return { admin, owner, shelter, pet, adopter };
}

const move = (token, requestId, status) =>
  api
    .patch(`/api/adoptions/requests/${requestId}/status`)
    .set(auth(token))
    .send({ status });

describe('Solicitudes de adopción', () => {
  beforeEach(resetDatabase);

  test('el flujo completo lleva la mascota a ADOPTADA', async () => {
    const { owner, pet, adopter } = await scenario();

    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    assert.equal(request.status, 'PENDIENTE');

    // §22: al empezar la revisión la mascota queda reservada.
    await move(owner.token, request.id, 'EN_REVISION').expect(200);
    let current = await api.get(`/api/pets/${pet.id}`).expect(200);
    assert.equal(current.body.data.status, 'EN_PROCESO');

    await move(owner.token, request.id, 'ENTREVISTA').expect(200);

    const interview = await api
      .post(`/api/adoptions/requests/${request.id}/interviews`)
      .set(auth(owner.token))
      .send({
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        modality: 'Videollamada',
        notes: 'Primera conversación'
      })
      .expect(201);

    await api
      .put(`/api/interviews/${interview.body.data.id}`)
      .set(auth(owner.token))
      .send({ result: 'Aprobada' })
      .expect(200);

    await move(owner.token, request.id, 'APROBADA').expect(200);

    const adoption = await api
      .post('/api/adoptions')
      .set(auth(owner.token))
      .send({ requestId: request.id, notes: 'Entrega realizada en el refugio' })
      .expect(201);

    assert.match(adoption.body.data.code, /^ADP-\d{5}$/);
    assert.equal(adoption.body.data.petName, pet.name);

    current = await api.get(`/api/pets/${pet.id}`).expect(200);
    assert.equal(current.body.data.status, 'ADOPTADA');

    const detail = await api
      .get(`/api/adoptions/requests/${request.id}`)
      .set(auth(adopter.token))
      .expect(200);
    assert.equal(detail.body.data.status, 'ADOPCION_COMPLETADA');
    assert.equal(detail.body.data.interviews.length, 1);
  });

  test('bloquea las transiciones que no permite el flujo', async () => {
    const { owner, pet, adopter } = await scenario();
    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    // PENDIENTE no puede saltar directamente a APROBADA.
    const invalid = await move(owner.token, request.id, 'APROBADA').expect(409);
    assert.match(invalid.body.message, /Transición no permitida/i);

    // El estado terminal no admite más cambios.
    await move(owner.token, request.id, 'RECHAZADA').expect(200);
    await move(owner.token, request.id, 'EN_REVISION').expect(409);
  });

  test('no permite completar la adopción sin aprobación previa', async () => {
    const { owner, pet, adopter } = await scenario();
    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    const conflict = await api
      .post('/api/adoptions')
      .set(auth(owner.token))
      .send({ requestId: request.id })
      .expect(409);
    assert.match(conflict.body.message, /aprobada/i);
  });

  test('libera la mascota al rechazar si no queda otra solicitud en curso', async () => {
    const { owner, pet, adopter } = await scenario();
    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    await move(owner.token, request.id, 'EN_REVISION').expect(200);
    await move(owner.token, request.id, 'RECHAZADA').expect(200);

    const released = await api.get(`/api/pets/${pet.id}`).expect(200);
    assert.equal(released.body.data.status, 'DISPONIBLE');
  });

  test('mantiene la mascota reservada si otra solicitud sigue viva', async () => {
    const { owner, pet, adopter } = await scenario();
    const second = await registerUser({ email: 'segunda@example.com' });

    const first = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;
    const other = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(second.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    await move(owner.token, first.id, 'EN_REVISION').expect(200);
    await move(owner.token, other.id, 'EN_REVISION').expect(200);
    await move(owner.token, first.id, 'RECHAZADA').expect(200);

    const stillReserved = await api.get(`/api/pets/${pet.id}`).expect(200);
    assert.equal(stillReserved.body.data.status, 'EN_PROCESO');
  });

  test('al completar una adopción cierra las solicitudes rivales', async () => {
    const { owner, pet, adopter } = await scenario();
    const rival = await registerUser({ email: 'rival@example.com' });

    const winner = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;
    const loser = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(rival.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    await move(owner.token, winner.id, 'EN_REVISION').expect(200);
    await move(owner.token, winner.id, 'APROBADA').expect(200);
    await api
      .post('/api/adoptions')
      .set(auth(owner.token))
      .send({ requestId: winner.id })
      .expect(201);

    const rejected = await api
      .get(`/api/adoptions/requests/${loser.id}`)
      .set(auth(rival.token))
      .expect(200);
    assert.equal(rejected.body.data.status, 'RECHAZADA');
  });

  describe('reglas de creación (§35)', () => {
    test('exige sesión y rol de adoptante', async () => {
      const { owner, pet } = await scenario();
      await api.post('/api/adoptions/requests').send(requestPayload(pet.id)).expect(401);
      await api
        .post('/api/adoptions/requests')
        .set(auth(owner.token))
        .send(requestPayload(pet.id))
        .expect(403);
    });

    test('rechaza mascotas inexistentes, no disponibles y adoptadas', async () => {
      const { owner, pet, adopter } = await scenario();

      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(999999))
        .expect(404);

      await api
        .patch(`/api/pets/${pet.id}/status`)
        .set(auth(owner.token))
        .send({ status: 'NO_DISPONIBLE' })
        .expect(200);

      const unavailable = await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(409);
      assert.match(unavailable.body.message, /ya no está disponible/i);

      await api
        .patch(`/api/pets/${pet.id}/status`)
        .set(auth(owner.token))
        .send({ status: 'ADOPTADA' })
        .expect(200);

      const adopted = await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(409);
      assert.match(adopted.body.message, /ya fue adoptada/i);
    });

    test('no permite solicitudes duplicadas activas', async () => {
      const { pet, adopter } = await scenario();

      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201);

      const duplicate = await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(409);
      assert.match(duplicate.body.message, /solicitud activa/i);
    });

    test('valida el formulario completo', async () => {
      const { pet, adopter } = await scenario();

      const incomplete = await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send({ petId: pet.id, motivation: 'corto' })
        .expect(422);
      const fields = incomplete.body.errors.map((issue) => issue.field);
      assert.ok(fields.includes('applicant'));
      assert.ok(fields.includes('motivation'));

      // §32: la declaración es obligatoria.
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id, { declarationAccepted: false }))
        .expect(422);

      // §30: declarar experiencia previa obliga a describirla.
      const missingExperience = await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id, { hadPetsBefore: true }))
        .expect(422);
      assert.ok(
        missingExperience.body.errors.some((issue) => issue.field === 'experience')
      );

      // §28: menores de edad no pueden adoptar.
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id, { applicant: { ...requestPayload(pet.id).applicant, age: 15 } }))
        .expect(422);
    });
  });

  describe('permisos y visibilidad', () => {
    test('cada rol ve sólo lo que le corresponde', async () => {
      const { admin, owner, pet, adopter } = await scenario();
      const intruder = await registerUser({ email: 'curioso@example.com' });

      const request = (
        await api
          .post('/api/adoptions/requests')
          .set(auth(adopter.token))
          .send(requestPayload(pet.id))
          .expect(201)
      ).body.data;

      // Otro adoptante no la encuentra.
      await api
        .get(`/api/adoptions/requests/${request.id}`)
        .set(auth(intruder.token))
        .expect(404);

      const mine = await api
        .get('/api/adoptions/requests')
        .set(auth(intruder.token))
        .expect(200);
      assert.equal(mine.body.pagination.total, 0);

      const shelterView = await api
        .get('/api/adoptions/requests')
        .set(auth(owner.token))
        .expect(200);
      assert.equal(shelterView.body.pagination.total, 1);

      const adminView = await api
        .get('/api/adoptions/requests')
        .set(auth(admin.token))
        .expect(200);
      assert.equal(adminView.body.pagination.total, 1);
    });

    test('otro refugio no puede revisar ni entrevistar una solicitud ajena', async () => {
      const { admin, owner, pet, adopter } = await scenario();
      const rivalShelter = await createVerifiedShelter(admin, {
        owner: { email: 'rival.refugio@example.com' },
        shelter: { name: 'Refugio rival' }
      });

      const request = (
        await api
          .post('/api/adoptions/requests')
          .set(auth(adopter.token))
          .send(requestPayload(pet.id))
          .expect(201)
      ).body.data;

      await move(rivalShelter.owner.token, request.id, 'EN_REVISION').expect(403);

      await move(owner.token, request.id, 'EN_REVISION').expect(200);
      await move(owner.token, request.id, 'ENTREVISTA').expect(200);

      await api
        .post(`/api/adoptions/requests/${request.id}/interviews`)
        .set(auth(rivalShelter.owner.token))
        .send({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), modality: 'Presencial' })
        .expect(403);
    });

    test('un refugio no puede editar la entrevista de otro refugio', async () => {
      const { admin, owner, pet, adopter } = await scenario();
      const rivalShelter = await createVerifiedShelter(admin, {
        owner: { email: 'entrometido@example.com' },
        shelter: { name: 'Refugio entrometido' }
      });

      const request = (
        await api
          .post('/api/adoptions/requests')
          .set(auth(adopter.token))
          .send(requestPayload(pet.id))
          .expect(201)
      ).body.data;

      await move(owner.token, request.id, 'EN_REVISION').expect(200);
      await move(owner.token, request.id, 'ENTREVISTA').expect(200);

      const interview = (
        await api
          .post(`/api/adoptions/requests/${request.id}/interviews`)
          .set(auth(owner.token))
          .send({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), modality: 'Presencial' })
          .expect(201)
      ).body.data;

      await api
        .put(`/api/interviews/${interview.id}`)
        .set(auth(rivalShelter.owner.token))
        .send({ result: 'No aprobada' })
        .expect(403);

      // El adoptante puede consultarla pero no modificarla.
      const agenda = await api.get('/api/interviews').set(auth(adopter.token)).expect(200);
      assert.equal(agenda.body.data.length, 1);
      await api
        .put(`/api/interviews/${interview.id}`)
        .set(auth(adopter.token))
        .send({ result: 'Aprobada' })
        .expect(403);
    });

    test('un refugio ajeno no puede registrar la adopción', async () => {
      const { admin, owner, pet, adopter } = await scenario();
      const rivalShelter = await createVerifiedShelter(admin, {
        owner: { email: 'ladron@example.com' },
        shelter: { name: 'Refugio ladrón' }
      });

      const request = (
        await api
          .post('/api/adoptions/requests')
          .set(auth(adopter.token))
          .send(requestPayload(pet.id))
          .expect(201)
      ).body.data;

      await move(owner.token, request.id, 'EN_REVISION').expect(200);
      await move(owner.token, request.id, 'APROBADA').expect(200);

      await api
        .post('/api/adoptions')
        .set(auth(rivalShelter.owner.token))
        .send({ requestId: request.id })
        .expect(403);
    });
  });

  describe('cancelación', () => {
    test('el adoptante puede cancelar mientras el estado lo permita', async () => {
      const { owner, pet, adopter } = await scenario();
      const request = (
        await api
          .post('/api/adoptions/requests')
          .set(auth(adopter.token))
          .send(requestPayload(pet.id))
          .expect(201)
      ).body.data;

      await api
        .delete(`/api/adoptions/requests/${request.id}`)
        .set(auth(adopter.token))
        .expect(204);

      const cancelled = await api
        .get(`/api/adoptions/requests/${request.id}`)
        .set(auth(adopter.token))
        .expect(200);
      assert.equal(cancelled.body.data.status, 'CANCELADA');

      // Tras cancelar puede volver a solicitar la misma mascota.
      const again = (
        await api
          .post('/api/adoptions/requests')
          .set(auth(adopter.token))
          .send(requestPayload(pet.id))
          .expect(201)
      ).body.data;

      await move(owner.token, again.id, 'EN_REVISION').expect(200);
      await move(owner.token, again.id, 'ENTREVISTA').expect(200);

      // Ya en entrevista, la cancelación deja de estar permitida.
      await api
        .delete(`/api/adoptions/requests/${again.id}`)
        .set(auth(adopter.token))
        .expect(409);
    });
  });
});
