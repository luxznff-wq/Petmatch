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

/**
 * Caminos administrativos y ciclo de vida de los registros.
 *
 * Cubre el comportamiento del rol ADMINISTRADOR sobre recursos ajenos y el
 * borrado en cascada, que debe ser idéntico en memoria y en PostgreSQL.
 */
describe('Administración de recursos ajenos', () => {
  beforeEach(resetDatabase);

  test('el administrador registra una mascota en nombre de un refugio', async () => {
    const admin = await createAdmin();
    const { shelter } = await createVerifiedShelter(admin);

    const created = await api
      .post('/api/pets')
      .set(auth(admin.token))
      .send(petPayload({ name: 'Publicada por admin', shelterId: shelter.id }))
      .expect(201);

    assert.equal(created.body.data.shelterId, shelter.id);
    assert.equal(created.body.data.shelterName, shelter.name);
  });

  test('sin refugio indicado, o con uno inexistente, la publicación falla', async () => {
    const admin = await createAdmin();
    await createVerifiedShelter(admin);

    const missing = await api
      .post('/api/pets')
      .set(auth(admin.token))
      .send(petPayload())
      .expect(400);
    assert.match(missing.body.message, /Indica el refugio/i);

    await api
      .post('/api/pets')
      .set(auth(admin.token))
      .send(petPayload({ shelterId: 9999 }))
      .expect(404);
  });

  test('ni el administrador publica en un refugio suspendido', async () => {
    const admin = await createAdmin();
    const { shelter } = await createVerifiedShelter(admin);

    await api
      .patch(`/api/shelters/${shelter.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);

    const blocked = await api
      .post('/api/pets')
      .set(auth(admin.token))
      .send(petPayload({ shelterId: shelter.id }))
      .expect(403);
    assert.match(blocked.body.message, /suspendido/i);
  });

  test('el refugio no puede publicar en nombre de otro refugio', async () => {
    const admin = await createAdmin();
    const mine = await createVerifiedShelter(admin, { owner: { email: 'mio@example.com' } });
    const other = await createVerifiedShelter(admin, {
      owner: { email: 'otro@example.com' },
      shelter: { name: 'Refugio ajeno' }
    });

    // El servicio ignora shelterId cuando quien publica es un refugio.
    const created = await api
      .post('/api/pets')
      .set(auth(mine.owner.token))
      .send(petPayload({ shelterId: other.shelter.id }))
      .expect(201);

    assert.equal(created.body.data.shelterId, mine.shelter.id);
  });

  test('el administrador supervisa solicitudes y entrevistas de cualquier refugio', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'supervisado@example.com' });

    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    await api.get(`/api/adoptions/requests/${request.id}`).set(auth(admin.token)).expect(200);
    await api
      .patch(`/api/adoptions/requests/${request.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'EN_REVISION' })
      .expect(200);

    const agenda = await api.get('/api/interviews').set(auth(admin.token)).expect(200);
    assert.ok(Array.isArray(agenda.body.data));
  });
});

describe('Borrado en cascada', () => {
  beforeEach(resetDatabase);

  test('eliminar al responsable arrastra su refugio y sus mascotas', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201);

    const before = await api.get('/api/pets').expect(200);
    assert.equal(before.body.pagination.total, 1);

    await api.delete(`/api/users/${owner.user.id}`).set(auth(admin.token)).expect(204);

    const after = await api.get('/api/pets').expect(200);
    assert.equal(after.body.pagination.total, 0, 'las mascotas del refugio deben desaparecer');

    const shelters = await api.get('/api/shelters').set(auth(admin.token)).expect(200);
    assert.equal(shelters.body.pagination.total, 0);
  });

  test('eliminar un adoptante arrastra sus favoritos y solicitudes', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'efimero@example.com' });

    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    await api.delete(`/api/users/${adopter.user.id}`).set(auth(admin.token)).expect(204);

    const requests = await api.get('/api/adoptions/requests').set(auth(owner.token)).expect(200);
    assert.equal(requests.body.pagination.total, 0);

    // La mascota sobrevive: sólo se borró la cuenta del adoptante.
    await api.get(`/api/pets/${pet.id}`).expect(200);
  });

  test('no se elimina una cuenta con adopciones registradas', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'historico@example.com' });

    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    for (const status of ['EN_REVISION', 'APROBADA']) {
      await api
        .patch(`/api/adoptions/requests/${request.id}/status`)
        .set(auth(owner.token))
        .send({ status })
        .expect(200);
    }
    await api
      .post('/api/adoptions')
      .set(auth(owner.token))
      .send({ requestId: request.id })
      .expect(201);

    // Ni el adoptante ni el refugio: borrarlos destruiría el historial (§38).
    const blockedAdopter = await api
      .delete(`/api/users/${adopter.user.id}`)
      .set(auth(admin.token))
      .expect(409);
    assert.match(blockedAdopter.body.message, /adopciones registradas/i);

    await api.delete(`/api/users/${owner.user.id}`).set(auth(admin.token)).expect(409);

    // Suspender sí está permitido y es la vía correcta.
    await api
      .patch(`/api/users/${adopter.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);
  });

  test('eliminar una mascota arrastra sus solicitudes', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'borrada@example.com' });

    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    await api.delete(`/api/pets/${pet.id}`).set(auth(owner.token)).expect(204);

    const requests = await api.get('/api/adoptions/requests').set(auth(adopter.token)).expect(200);
    assert.equal(requests.body.pagination.total, 0);
  });
});
