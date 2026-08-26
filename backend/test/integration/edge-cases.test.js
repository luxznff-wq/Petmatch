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
 * Casos límite encontrados sondeando la API con entradas inusuales.
 * Cada bloque corresponde a un fallo real que se corrigió.
 */

/** Escenario con una solicitud lista para avanzar. */
async function conSolicitud() {
  const admin = await createAdmin();
  const { owner, shelter } = await createVerifiedShelter(admin);
  const pet = (
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
  ).body.data;
  const adopter = await registerUser({ email: `borde.${Date.now()}@example.com` });

  const request = (
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201)
  ).body.data;

  return { admin, owner, shelter, pet, adopter, request };
}

const mover = (token, id, status) =>
  api.patch(`/api/adoptions/requests/${id}/status`).set(auth(token)).send({ status });

describe('Un refugio suspendido no puede operar el flujo de adopción', () => {
  beforeEach(resetDatabase);

  /** Deja el refugio suspendido con una solicitud en curso. */
  async function suspendido() {
    const escenario = await conSolicitud();
    await mover(escenario.owner.token, escenario.request.id, 'EN_REVISION').expect(200);
    await api
      .patch(`/api/shelters/${escenario.shelter.id}/status`)
      .set(auth(escenario.admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);
    return escenario;
  }

  test('sigue viendo sus solicitudes: consultar no es actuar', async () => {
    const { owner, request } = await suspendido();

    await api.get('/api/adoptions/requests').set(auth(owner.token)).expect(200);
    await api.get(`/api/adoptions/requests/${request.id}`).set(auth(owner.token)).expect(200);
  });

  test('no puede avanzar el estado de una solicitud', async () => {
    const { owner, request } = await suspendido();

    const bloqueado = await mover(owner.token, request.id, 'APROBADA').expect(403);
    assert.match(bloqueado.body.message, /suspendido/i);
  });

  test('no puede programar entrevistas', async () => {
    const { admin, owner, request } = await suspendido();

    // Se lleva a ENTREVISTA con el administrador, que sí puede.
    await mover(admin.token, request.id, 'ENTREVISTA').expect(200);

    await api
      .post(`/api/adoptions/requests/${request.id}/interviews`)
      .set(auth(owner.token))
      .send({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), modality: 'Presencial' })
      .expect(403);
  });

  test('no puede registrar la adopción', async () => {
    const { admin, owner, request } = await suspendido();
    await mover(admin.token, request.id, 'APROBADA').expect(200);

    await api
      .post('/api/adoptions')
      .set(auth(owner.token))
      .send({ requestId: request.id })
      .expect(403);
  });

  test('el administrador sí puede seguir operando', async () => {
    const { admin, request } = await suspendido();

    await mover(admin.token, request.id, 'APROBADA').expect(200);
    await api
      .post('/api/adoptions')
      .set(auth(admin.token))
      .send({ requestId: request.id })
      .expect(201);
  });

  test('al levantarse la suspensión vuelve a operar', async () => {
    const { admin, owner, shelter, request } = await suspendido();

    await api
      .patch(`/api/shelters/${shelter.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'VERIFICADO' })
      .expect(200);

    await mover(owner.token, request.id, 'APROBADA').expect(200);
  });
});

describe('Fechas de entrevista', () => {
  beforeEach(resetDatabase);

  /** Solicitud en estado ENTREVISTA con una entrevista ya agendada. */
  async function conEntrevista() {
    const escenario = await conSolicitud();
    await mover(escenario.owner.token, escenario.request.id, 'EN_REVISION').expect(200);
    await mover(escenario.owner.token, escenario.request.id, 'ENTREVISTA').expect(200);

    const interview = (
      await api
        .post(`/api/adoptions/requests/${escenario.request.id}/interviews`)
        .set(auth(escenario.owner.token))
        .send({
          scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
          modality: 'Videollamada'
        })
        .expect(201)
    ).body.data;

    return { ...escenario, interview };
  }

  test('no se puede reprogramar una entrevista al pasado', async () => {
    const { owner, interview } = await conEntrevista();

    // Crear en el pasado ya se rechazaba; moverla ahí también debe hacerlo.
    const bloqueado = await api
      .put(`/api/interviews/${interview.id}`)
      .set(auth(owner.token))
      .send({ scheduledAt: '2020-01-01T10:00:00.000Z' })
      .expect(422);

    assert.match(bloqueado.body.message, /no puede programarse en el pasado/i);
  });

  test('sí se puede reprogramar a una fecha futura', async () => {
    const { owner, interview } = await conEntrevista();
    const nueva = new Date(Date.now() + 7 * 86_400_000).toISOString();

    const actualizada = await api
      .put(`/api/interviews/${interview.id}`)
      .set(auth(owner.token))
      .send({ scheduledAt: nueva })
      .expect(200);

    assert.equal(new Date(actualizada.body.data.scheduledAt).toISOString(), nueva);
  });

  test('registrar el resultado no exige tocar la fecha', async () => {
    const { owner, interview } = await conEntrevista();

    const actualizada = await api
      .put(`/api/interviews/${interview.id}`)
      .set(auth(owner.token))
      .send({ result: 'Aprobada' })
      .expect(200);

    assert.equal(actualizada.body.data.result, 'Aprobada');
  });
});

describe('Búsqueda con caracteres especiales', () => {
  beforeEach(resetDatabase);

  async function catalogo() {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    for (const name of ['Luna', 'Max', 'Nube']) {
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload({ name })).expect(201);
    }
    return { admin, owner };
  }

  const total = async (q) =>
    (await api.get(`/api/pets?search=${encodeURIComponent(q)}`).expect(200)).body.pagination.total;

  test('los comodines de LIKE se buscan como texto literal', async () => {
    await catalogo();

    // `%` y `_` son comodines en SQL: sin escapar devolvían el catálogo
    // entero en PostgreSQL y nada en memoria. Ahora no coinciden con nada,
    // porque ninguna mascota los tiene en su nombre.
    assert.equal(await total('%'), 0);
    assert.equal(await total('_'), 0);
    assert.equal(await total('%%'), 0);
    assert.equal(await total('%Luna%'), 0);

    // Y la búsqueda normal sigue funcionando.
    assert.equal(await total('Luna'), 1);
  });

  test('encuentra un porcentaje cuando forma parte del texto', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    await api
      .post('/api/pets')
      .set(auth(owner.token))
      .send(petPayload({ name: 'Descuento', breed: '100% mestizo' }))
      .expect(201);
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload({ name: 'Otra' })).expect(201);

    assert.equal(await total('100%'), 1, 'debe encontrar sólo la que lo contiene');
  });

  test('la barra invertida tampoco rompe la consulta', async () => {
    await catalogo();
    assert.equal(await total('\\'), 0);
    assert.equal(await total('\\%'), 0);
  });

  test('el texto con apariencia de inyección se trata como texto', async () => {
    await catalogo();

    for (const intento of ["' OR 1=1 --", "'; DROP TABLE pets; --", '" OR ""="']) {
      assert.equal(await total(intento), 0);
    }
    // Y el catálogo sigue intacto.
    assert.equal((await api.get('/api/pets').expect(200)).body.pagination.total, 3);
  });

  test('la búsqueda de usuarios y refugios también escapa los comodines', async () => {
    const admin = await createAdmin();
    await createVerifiedShelter(admin, { shelter: { name: 'Refugio Central', city: 'Lima' } });

    const usuarios = await api.get('/api/users?search=%25').set(auth(admin.token)).expect(200);
    assert.equal(usuarios.body.pagination.total, 0);

    const refugios = await api.get('/api/shelters?search=%25').set(auth(admin.token)).expect(200);
    assert.equal(refugios.body.pagination.total, 0);
  });
});

describe('Fechas independientes del huso horario', () => {
  beforeEach(resetDatabase);

  /** Fecha de hoy en UTC, que es la referencia que usa la aplicación. */
  const hoyUtc = () => new Date().toISOString().slice(0, 10);

  test('la fecha de ingreso se ancla en UTC', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);

    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;

    // `CURRENT_DATE` seguía el huso del servidor de base de datos: con la base
    // en UTC+14 registraba el día siguiente y discrepaba del modo memoria.
    assert.equal(pet.admittedAt, hoyUtc());
  });

  test('la fecha de adopción se ancla en UTC', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'utc@example.com' });
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
    const adopcion = (
      await api.post('/api/adoptions').set(auth(owner.token)).send({ requestId: request.id }).expect(201)
    ).body.data;

    assert.equal(adopcion.adoptedAt, hoyUtc());
  });

  test('una fecha sólo-día viaja sin desplazarse', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);

    // 29 de febrero: si algo la convirtiera a una marca de tiempo con huso,
    // podría volver como el 28 o el 1 de marzo.
    const pet = (
      await api
        .post('/api/pets')
        .set(auth(owner.token))
        .send(petPayload({ birthDate: '2024-02-29' }))
        .expect(201)
    ).body.data;

    assert.equal(pet.birthDate, '2024-02-29');
    assert.equal((await api.get(`/api/pets/${pet.id}`).expect(200)).body.data.birthDate, '2024-02-29');
  });

  test('el instante de una entrevista se conserva exactamente', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'instante@example.com' });
    const request = (
      await api
        .post('/api/adoptions/requests')
        .set(auth(adopter.token))
        .send(requestPayload(pet.id))
        .expect(201)
    ).body.data;

    for (const status of ['EN_REVISION', 'ENTREVISTA']) {
      await api
        .patch(`/api/adoptions/requests/${request.id}/status`)
        .set(auth(owner.token))
        .send({ status })
        .expect(200);
    }

    // Un instante concreto en UTC debe volver siendo el mismo instante, sea
    // cual sea el huso del servidor o de la base.
    const instante = '2027-03-15T14:30:00.000Z';
    const entrevista = (
      await api
        .post(`/api/adoptions/requests/${request.id}/interviews`)
        .set(auth(owner.token))
        .send({ scheduledAt: instante, modality: 'Presencial' })
        .expect(201)
    ).body.data;

    assert.equal(new Date(entrevista.scheduledAt).toISOString(), instante);
  });
});
