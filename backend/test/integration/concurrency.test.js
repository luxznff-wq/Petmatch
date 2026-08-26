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
 * Peticiones simultáneas.
 *
 * Las reglas del flujo se comprueban leyendo y después escribiendo, con
 * varios `await` de por medio. Sin protección, dos peticiones que llegan a la
 * vez leen el mismo estado, las dos se dan por válidas y las dos escriben.
 */

/** Lanza `n` peticiones a la vez y cuenta los códigos obtenidos. */
async function enParalelo(n, hacer) {
  const respuestas = await Promise.all(Array.from({ length: n }, (_, i) => hacer(i)));
  return respuestas.reduce((conteo, r) => {
    conteo[r.status] = (conteo[r.status] ?? 0) + 1;
    return conteo;
  }, {});
}

/** Escenario con una solicitud recién creada. */
async function escenario() {
  const admin = await createAdmin();
  const { owner } = await createVerifiedShelter(admin);
  const pet = (
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
  ).body.data;
  const adopter = await registerUser({ email: `conc.${Date.now()}@example.com` });
  const request = (
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201)
  ).body.data;

  return { admin, owner, pet, adopter, request };
}

const mover = (token, id, status) =>
  api.patch(`/api/adoptions/requests/${id}/status`).set(auth(token)).send({ status });

describe('Solicitudes simultáneas', () => {
  beforeEach(resetDatabase);

  test('sólo se crea una solicitud aunque se envíen varias a la vez', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'duplicada@example.com' });

    const codigos = await enParalelo(5, () =>
      api.post('/api/adoptions/requests').set(auth(adopter.token)).send(requestPayload(pet.id))
    );

    assert.equal(codigos[201], 1, 'sólo una debe crearse');
    assert.equal(codigos[409], 4, 'el resto debe rechazarse como duplicada');

    const listado = await api.get('/api/adoptions/requests').set(auth(owner.token)).expect(200);
    assert.equal(listado.body.pagination.total, 1);
  });
});

describe('Cambios de estado simultáneos', () => {
  beforeEach(resetDatabase);

  test('sólo prospera uno de varios cambios idénticos', async () => {
    const { owner, request } = await escenario();

    const codigos = await enParalelo(5, () => mover(owner.token, request.id, 'EN_REVISION'));

    assert.equal(codigos[200], 1, 'sólo uno debe aplicarse');
    assert.equal(codigos[409], 4, 'el resto debe verse como conflicto');
  });

  test('el aviso que recibe el adoptante coincide con el estado final', async () => {
    const { owner, adopter, request } = await escenario();
    await mover(owner.token, request.id, 'EN_REVISION').expect(200);

    // Aprobar y rechazar a la vez. Según cómo se entrelacen, puede prosperar
    // sólo una (la otra recibe conflicto) o encadenarse las dos, porque
    // APROBADA → RECHAZADA es una transición válida. Lo que nunca puede pasar
    // es que se escriban las dos sobre la misma lectura: el estado guardado y
    // el último aviso tienen que contar la misma historia.
    const [aprobar, rechazar] = await Promise.all([
      mover(owner.token, request.id, 'APROBADA'),
      mover(owner.token, request.id, 'RECHAZADA')
    ]);

    const aplicados = [aprobar, rechazar].filter((r) => r.status === 200);
    const conflictos = [aprobar, rechazar].filter((r) => r.status === 409);
    assert.equal(aplicados.length + conflictos.length, 2, 'no debe haber otros códigos');

    const estadoFinal = (
      await api.get(`/api/adoptions/requests/${request.id}`).set(auth(owner.token)).expect(200)
    ).body.data.status;

    const avisos = (
      await api.get('/api/notifications').set(auth(adopter.token)).expect(200)
    ).body.data.items;

    // El aviso más reciente sobre el desenlace debe corresponder al estado
    // realmente guardado, no al de una escritura que se perdió.
    const ultimo = avisos.find((n) => /fue aprobada|fue rechazada/i.test(n.message));
    const esperado = estadoFinal === 'APROBADA' ? /fue aprobada/i : /fue rechazada/i;
    assert.match(ultimo.message, esperado);

    // Y hay exactamente un aviso por cada cambio que sí se aplicó.
    const desenlaces = avisos.filter((n) => /fue aprobada|fue rechazada/i.test(n.message));
    assert.equal(desenlaces.length, aplicados.length);
  });

  test('no se duplican las entradas de auditoría', async () => {
    const { admin, owner, request } = await escenario();
    await enParalelo(5, () => mover(owner.token, request.id, 'EN_REVISION'));

    const audit = await api.get('/api/admin/audit?limit=50').set(auth(admin.token)).expect(200);
    const entradas = audit.body.data.filter((a) => /a EN_REVISION/.test(a.action));
    assert.equal(entradas.length, 1);
  });

  test('cancelar varias veces a la vez sólo cancela una', async () => {
    const { adopter, request } = await escenario();

    const codigos = await enParalelo(4, () =>
      api.delete(`/api/adoptions/requests/${request.id}`).set(auth(adopter.token))
    );

    assert.equal(codigos[204], 1);
    assert.equal(codigos[409], 3);
  });
});

describe('Cierre de adopción simultáneo', () => {
  beforeEach(resetDatabase);

  test('varias peticiones a la vez crean una sola adopción', async () => {
    const { owner, pet, request } = await escenario();
    for (const status of ['EN_REVISION', 'APROBADA']) {
      await mover(owner.token, request.id, status).expect(200);
    }

    const codigos = await enParalelo(5, () =>
      api.post('/api/adoptions').set(auth(owner.token)).send({ requestId: request.id })
    );

    assert.equal(codigos[201], 1);
    assert.equal(codigos[409], 4);

    const historial = await api.get('/api/adoptions').set(auth(owner.token)).expect(200);
    assert.equal(historial.body.pagination.total, 1);

    const mascota = await api.get(`/api/pets/${pet.id}`).expect(200);
    assert.equal(mascota.body.data.status, 'ADOPTADA');
  });
});

describe('Favoritos y galería simultáneos', () => {
  beforeEach(resetDatabase);

  test('marcar el mismo favorito varias veces guarda uno solo', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'favconc@example.com' });

    await enParalelo(5, () => api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)));

    const favoritos = await api.get('/api/favorites').set(auth(adopter.token)).expect(200);
    assert.equal(favoritos.body.data.length, 1);
  });

  test('nunca queda más de una fotografía principal', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;

    await enParalelo(5, (i) =>
      api
        .post(`/api/pets/${pet.id}/images`)
        .set(auth(owner.token))
        .send({ url: `https://example.com/${i}.jpg`, isPrimary: true })
    );

    const galeria = await api.get(`/api/pets/${pet.id}/images`).expect(200);
    const principales = galeria.body.data.filter((image) => image.isPrimary);
    assert.equal(principales.length, 1, 'el índice parcial garantiza una sola principal');
  });
});
