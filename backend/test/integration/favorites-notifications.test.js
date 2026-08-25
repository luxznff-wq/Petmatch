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

async function scenario() {
  const admin = await createAdmin();
  const { owner } = await createVerifiedShelter(admin);
  const pet = (
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
  ).body.data;
  const adopter = await registerUser({ email: `fav.${Date.now()}@example.com` });
  return { admin, owner, pet, adopter };
}

describe('Favoritos', () => {
  beforeEach(resetDatabase);

  test('agrega, lista y quita favoritos', async () => {
    const { pet, adopter } = await scenario();

    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);
    // Repetir la operación es idempotente, no duplica.
    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);

    const list = await api.get('/api/favorites').set(auth(adopter.token)).expect(200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].id, pet.id);

    const ids = await api.get('/api/favorites/ids').set(auth(adopter.token)).expect(200);
    assert.deepEqual(ids.body.data, [pet.id]);

    await api.delete(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(204);
    await api.delete(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(404);

    const empty = await api.get('/api/favorites').set(auth(adopter.token)).expect(200);
    assert.equal(empty.body.data.length, 0);
  });

  test('sólo el adoptante gestiona favoritos y la mascota debe existir', async () => {
    const { owner, pet, adopter } = await scenario();

    await api.post(`/api/favorites/${pet.id}`).expect(401);
    await api.post(`/api/favorites/${pet.id}`).set(auth(owner.token)).expect(403);
    await api.post('/api/favorites/999999').set(auth(adopter.token)).expect(404);
  });
});

describe('Notificaciones', () => {
  beforeEach(resetDatabase);

  test('avisa al adoptante y al refugio al enviarse una solicitud', async () => {
    const { owner, pet, adopter } = await scenario();

    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    const adopterInbox = await api.get('/api/notifications').set(auth(adopter.token)).expect(200);
    assert.match(adopterInbox.body.data.items[0].message, /solicitud para Toby fue enviada/i);
    assert.equal(adopterInbox.body.data.unread, 1);

    const shelterInbox = await api.get('/api/notifications').set(auth(owner.token)).expect(200);
    assert.match(shelterInbox.body.data.items[0].message, /envió una solicitud/i);
  });

  test('avisa a quienes tenían la mascota en favoritos cuando deja de estar disponible', async () => {
    const { owner, pet, adopter } = await scenario();
    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);

    await api
      .patch(`/api/pets/${pet.id}/status`)
      .set(auth(owner.token))
      .send({ status: 'NO_DISPONIBLE' })
      .expect(200);

    const inbox = await api.get('/api/notifications').set(auth(adopter.token)).expect(200);
    assert.ok(
      inbox.body.data.items.some((item) => /ya no está disponible/i.test(item.message)),
      'debe existir el aviso de favorito no disponible'
    );
  });

  test('marca notificaciones como leídas de una en una y todas juntas', async () => {
    const { pet, adopter } = await scenario();
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    const inbox = await api.get('/api/notifications').set(auth(adopter.token)).expect(200);
    const [first] = inbox.body.data.items;

    const read = await api
      .patch(`/api/notifications/${first.id}/read`)
      .set(auth(adopter.token))
      .expect(200);
    assert.equal(read.body.data.read, true);

    await api.patch('/api/notifications/read-all').set(auth(adopter.token)).expect(200);

    const after = await api.get('/api/notifications').set(auth(adopter.token)).expect(200);
    assert.equal(after.body.data.unread, 0);
  });

  test('no deja marcar como leída la notificación de otro usuario', async () => {
    const { pet, adopter } = await scenario();
    const other = await registerUser({ email: 'ajeno.notif@example.com' });

    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    const inbox = await api.get('/api/notifications').set(auth(adopter.token)).expect(200);
    await api
      .patch(`/api/notifications/${inbox.body.data.items[0].id}/read`)
      .set(auth(other.token))
      .expect(404);
  });
});

describe('Panel del usuario', () => {
  beforeEach(resetDatabase);

  test('devuelve los datos propios de cada rol', async () => {
    const { admin, owner, pet, adopter } = await scenario();
    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    const adopterPanel = await api.get('/api/workspace').set(auth(adopter.token)).expect(200);
    assert.equal(adopterPanel.body.data.role, 'ADOPTANTE');
    assert.equal(adopterPanel.body.data.summary.favorites, 1);
    assert.equal(adopterPanel.body.data.summary.requests, 1);

    const shelterPanel = await api.get('/api/workspace').set(auth(owner.token)).expect(200);
    assert.equal(shelterPanel.body.data.role, 'REFUGIO');
    assert.equal(shelterPanel.body.data.summary.pets, 1);
    assert.equal(shelterPanel.body.data.summary.requestsPending, 1);
    assert.equal(shelterPanel.body.data.requests[0].adopterName, 'Ana Pérez');

    const adminPanel = await api.get('/api/workspace').set(auth(admin.token)).expect(200);
    assert.equal(adminPanel.body.data.role, 'ADMINISTRADOR');
    assert.ok(adminPanel.body.data.summary.users >= 3);
    assert.ok(Array.isArray(adminPanel.body.data.audit));
  });

  test('un refugio sin perfil recibe un panel vacío en lugar de un error', async () => {
    const owner = await registerUser({ role: 'REFUGIO', email: 'sinperfil@example.com' });
    const panel = await api.get('/api/workspace').set(auth(owner.token)).expect(200);
    assert.equal(panel.body.data.shelter, null);
    assert.deepEqual(panel.body.data.pets, []);
  });
});
