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

describe('Refugios', () => {
  beforeEach(resetDatabase);

  test('el listado público sólo muestra refugios verificados', async () => {
    const admin = await createAdmin();
    await createVerifiedShelter(admin, {
      owner: { email: 'verificado@example.com' },
      shelter: { name: 'Refugio Verificado' }
    });

    const pendingOwner = await registerUser({ role: 'REFUGIO', email: 'pendiente@example.com' });
    await api
      .post('/api/shelters')
      .set(auth(pendingOwner.token))
      .send({ name: 'Refugio Pendiente', city: 'Cusco' })
      .expect(201);

    const publicList = await api.get('/api/shelters').expect(200);
    assert.deepEqual(publicList.body.data.map((shelter) => shelter.name), ['Refugio Verificado']);

    // El administrador sí ve los pendientes (§48).
    const adminList = await api.get('/api/shelters').set(auth(admin.token)).expect(200);
    assert.equal(adminList.body.pagination.total, 2);

    const onlyPending = await api
      .get('/api/shelters?status=PENDIENTE')
      .set(auth(admin.token))
      .expect(200);
    assert.deepEqual(onlyPending.body.data.map((shelter) => shelter.name), ['Refugio Pendiente']);
  });

  test('el perfil público incluye contadores y mascotas disponibles', async () => {
    const admin = await createAdmin();
    const { owner, shelter } = await createVerifiedShelter(admin);

    await api.post('/api/pets').set(auth(owner.token)).send(petPayload({ name: 'Uno' })).expect(201);
    await api
      .post('/api/pets')
      .set(auth(owner.token))
      .send(petPayload({ name: 'Dos', status: 'NO_DISPONIBLE' }))
      .expect(201);

    const profile = await api.get(`/api/shelters/${shelter.id}`).expect(200);
    assert.equal(profile.body.data.petCount, 2);
    assert.equal(profile.body.data.availablePetCount, 1);
    assert.equal(profile.body.data.adoptionCount, 0);
    assert.deepEqual(profile.body.data.pets.map((pet) => pet.name), ['Uno']);
  });

  test('cada refugio administra sólo su propio perfil', async () => {
    const admin = await createAdmin();
    const first = await createVerifiedShelter(admin, { owner: { email: 'a@example.com' } });
    const second = await createVerifiedShelter(admin, {
      owner: { email: 'b@example.com' },
      shelter: { name: 'Segundo' }
    });

    await api
      .put(`/api/shelters/${first.shelter.id}`)
      .set(auth(second.owner.token))
      .send({ name: 'Robado', city: 'Lima' })
      .expect(403);

    await api
      .put(`/api/shelters/${first.shelter.id}`)
      .set(auth(first.owner.token))
      .send({ name: 'Refugio renombrado', city: 'Lima' })
      .expect(200);

    // Sólo el administrador cambia el estado (§41).
    await api
      .patch(`/api/shelters/${first.shelter.id}/status`)
      .set(auth(first.owner.token))
      .send({ status: 'VERIFICADO' })
      .expect(403);
  });

  test('no permite registrar dos refugios con la misma cuenta', async () => {
    const owner = await registerUser({ role: 'REFUGIO' });
    await api
      .post('/api/shelters')
      .set(auth(owner.token))
      .send({ name: 'Primero', city: 'Lima' })
      .expect(201);

    const duplicate = await api
      .post('/api/shelters')
      .set(auth(owner.token))
      .send({ name: 'Segundo', city: 'Lima' })
      .expect(409);
    assert.match(duplicate.body.message, /Ya administras/i);
  });
});

describe('Panel administrativo', () => {
  beforeEach(resetDatabase);

  test('bloquea el acceso a quien no es administrador', async () => {
    const adopter = await registerUser();
    await api.get('/api/admin/dashboard').expect(401);
    await api.get('/api/admin/dashboard').set(auth(adopter.token)).expect(403);
    await api.get('/api/admin/audit').set(auth(adopter.token)).expect(403);
    await api.get('/api/users').set(auth(adopter.token)).expect(403);
  });

  test('lista, busca y filtra usuarios', async () => {
    const admin = await createAdmin();
    await registerUser({ firstName: 'Carla', email: 'carla@example.com' });
    await registerUser({ role: 'REFUGIO', email: 'refugio@example.com' });

    const all = await api.get('/api/admin/users').set(auth(admin.token)).expect(200);
    assert.equal(all.body.pagination.total, 3);

    const shelters = await api
      .get('/api/admin/users?role=REFUGIO')
      .set(auth(admin.token))
      .expect(200);
    assert.equal(shelters.body.pagination.total, 1);

    const search = await api
      .get('/api/admin/users?search=carla')
      .set(auth(admin.token))
      .expect(200);
    assert.equal(search.body.data[0].email, 'carla@example.com');
    assert.equal(search.body.data[0].passwordHash, undefined);
  });

  test('suspende y reactiva cuentas, pero no la propia', async () => {
    const admin = await createAdmin();
    const target = await registerUser({ email: 'objetivo@example.com' });

    const suspended = await api
      .patch(`/api/users/${target.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);
    assert.equal(suspended.body.data.status, 'SUSPENDIDO');

    await api
      .patch(`/api/users/${target.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'ACTIVO' })
      .expect(200);

    const self = await api
      .patch(`/api/users/${admin.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(409);
    assert.match(self.body.message, /tu propia cuenta/i);
  });

  test('registra en auditoría las acciones administrativas', async () => {
    const admin = await createAdmin();
    const { shelter } = await createVerifiedShelter(admin);

    const audit = await api.get('/api/admin/audit').set(auth(admin.token)).expect(200);
    const entry = audit.body.data.find((item) => item.entityType === 'shelter');

    assert.ok(entry, 'la verificación del refugio debe quedar registrada');
    assert.equal(entry.entityId, shelter.id);
    assert.equal(entry.userEmail, admin.user.email);
    assert.match(entry.action, /VERIFICADO/);
  });

  test('el resumen y los reportes reflejan los datos reales', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload({ species: 'Gato' })).expect(201);
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload({ species: 'Perro' })).expect(201);

    const summary = await api.get('/api/admin/dashboard').set(auth(admin.token)).expect(200);
    assert.equal(summary.body.data.pets, 2);
    assert.equal(summary.body.data.shelters, 1);

    const petsReport = await api.get('/api/reports/pets').set(auth(admin.token)).expect(200);
    assert.deepEqual(
      petsReport.body.data.bySpecies.map((bucket) => bucket.label).sort(),
      ['Gato', 'Perro']
    );

    const sheltersReport = await api.get('/api/reports/shelters').set(auth(admin.token)).expect(200);
    assert.equal(sheltersReport.body.data.total, 1);

    // El refugio ve sus propios reportes pero no el de plataforma (§44, §50).
    await api.get('/api/reports/pets').set(auth(owner.token)).expect(200);
    await api.get('/api/reports/shelters').set(auth(owner.token)).expect(403);
  });

  test('el reporte del refugio sólo cuenta sus propias mascotas', async () => {
    const admin = await createAdmin();
    const mine = await createVerifiedShelter(admin, { owner: { email: 'mio@example.com' } });
    const other = await createVerifiedShelter(admin, {
      owner: { email: 'ajeno@example.com' },
      shelter: { name: 'Ajeno' }
    });

    await api.post('/api/pets').set(auth(mine.owner.token)).send(petPayload()).expect(201);
    await api.post('/api/pets').set(auth(other.owner.token)).send(petPayload()).expect(201);
    await api.post('/api/pets').set(auth(other.owner.token)).send(petPayload()).expect(201);

    const report = await api.get('/api/reports/pets').set(auth(mine.owner.token)).expect(200);
    const total = report.body.data.byStatus.reduce((sum, bucket) => sum + bucket.total, 0);
    assert.equal(total, 1);
  });

  test('las estadísticas públicas no requieren sesión', async () => {
    const admin = await createAdmin();
    const { owner, pet } = await (async () => {
      const created = await createVerifiedShelter(admin);
      const pet = (
        await api.post('/api/pets').set(auth(created.owner.token)).send(petPayload()).expect(201)
      ).body.data;
      return { owner: created.owner, pet };
    })();

    const adopter = await registerUser({ email: 'estadistica@example.com' });
    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    await api
      .patch(`/api/adoptions/requests/${request.id}/status`)
      .set(auth(owner.token))
      .send({ status: 'EN_REVISION' })
      .expect(200);
    await api
      .patch(`/api/adoptions/requests/${request.id}/status`)
      .set(auth(owner.token))
      .send({ status: 'APROBADA' })
      .expect(200);
    await api
      .post('/api/adoptions')
      .set(auth(owner.token))
      .send({ requestId: request.id })
      .expect(201);

    const stats = await api.get('/api/stats').expect(200);
    assert.deepEqual(stats.body.data, { pets: 1, adoptions: 1, shelters: 1, cities: 1 });
  });

  test('las cifras públicas cuentan sólo los refugios que el directorio muestra', async () => {
    const admin = await createAdmin();
    await createVerifiedShelter(admin, {
      owner: { email: 'contado@example.com' },
      shelter: { name: 'Refugio Verificado' }
    });

    const pendingOwner = await registerUser({ role: 'REFUGIO', email: 'nocontado@example.com' });
    await api
      .post('/api/shelters')
      .set(auth(pendingOwner.token))
      .send({ name: 'Refugio Pendiente', city: 'Cusco' })
      .expect(201);

    const suspendedOwner = await registerUser({ role: 'REFUGIO', email: 'suspendido@example.com' });
    const suspended = (
      await api
        .post('/api/shelters')
        .set(auth(suspendedOwner.token))
        .send({ name: 'Refugio Suspendido', city: 'Piura' })
        .expect(201)
    ).body.data;
    await api
      .patch(`/api/shelters/${suspended.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);

    const stats = await api.get('/api/stats').expect(200);
    const directory = await api.get('/api/shelters').expect(200);

    assert.equal(stats.body.data.shelters, 1);
    assert.equal(stats.body.data.shelters, directory.body.data.length);

    // El panel administrativo sigue viendo el total real.
    const summary = await api.get('/api/admin/dashboard').set(auth(admin.token)).expect(200);
    assert.equal(summary.body.data.shelters, 3);
  });
});
