import test, { beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  auth,
  createAdmin,
  createVerifiedShelter,
  petPayload,
  resetDatabase
} from '../helpers.js';
import { limitWrites } from '../../src/middleware/rate-limit.js';

describe('Búsqueda de texto', () => {
  beforeEach(resetDatabase);

  /** Catálogo con acentos y un refugio identificable por su nombre. */
  async function seedSearchable() {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin, {
      shelter: { name: 'Huellitas Perú', city: 'Lima' }
    });

    const catalogue = [
      petPayload({ name: 'Ramón', breed: 'Pastor Alemán', city: 'Arequipa' }),
      petPayload({ name: 'Max', breed: 'Labrador', city: 'Lima' }),
      petPayload({ name: 'Nube', breed: 'Mestiza', city: 'Cusco', region: 'Cusco' })
    ];
    for (const pet of catalogue) {
      await api.post('/api/pets').set(auth(owner.token)).send(pet).expect(201);
    }
    return { admin, owner };
  }

  const names = (response) => response.body.data.map((pet) => pet.name).sort();

  test('encuentra por nombre, raza, ciudad, región y refugio', async () => {
    await seedSearchable();

    assert.deepEqual(names(await api.get('/api/pets?search=labrador').expect(200)), ['Max']);
    assert.deepEqual(names(await api.get('/api/pets?search=cusco').expect(200)), ['Nube']);
    // El nombre del refugio alcanza a las tres mascotas.
    assert.equal(
      (await api.get('/api/pets?search=huellitas').expect(200)).body.pagination.total,
      3
    );
  });

  test('ignora acentos en ambos sentidos', async () => {
    await seedSearchable();

    // Buscar sin acento encuentra lo acentuado…
    assert.deepEqual(names(await api.get('/api/pets?search=ramon').expect(200)), ['Ramón']);
    assert.deepEqual(names(await api.get('/api/pets?search=aleman').expect(200)), ['Ramón']);
    assert.equal((await api.get('/api/pets?search=peru').expect(200)).body.pagination.total, 3);

    // …y buscar con acento también.
    assert.deepEqual(names(await api.get('/api/pets?search=Ramón').expect(200)), ['Ramón']);
  });

  test('no distingue mayúsculas y admite coincidencias parciales', async () => {
    await seedSearchable();

    assert.deepEqual(names(await api.get('/api/pets?search=LABRA').expect(200)), ['Max']);
    assert.deepEqual(names(await api.get('/api/pets?search=brador').expect(200)), ['Max']);
  });

  test('se combina con el resto de filtros', async () => {
    await seedSearchable();

    const combined = await api.get('/api/pets?search=huellitas&city=Lima').expect(200);
    assert.deepEqual(names(combined), ['Max']);
  });

  test('el texto buscable sigue al refugio cuando cambia de nombre', async () => {
    const admin = await createAdmin();
    const { owner, shelter } = await createVerifiedShelter(admin, {
      shelter: { name: 'Nombre Antiguo', city: 'Lima' }
    });
    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201);

    assert.equal((await api.get('/api/pets?search=antiguo').expect(200)).body.pagination.total, 1);

    await api
      .put(`/api/shelters/${shelter.id}`)
      .set(auth(owner.token))
      .send({ name: 'Nombre Nuevo', city: 'Lima' })
      .expect(200);

    assert.equal((await api.get('/api/pets?search=nuevo').expect(200)).body.pagination.total, 1);
    assert.equal((await api.get('/api/pets?search=antiguo').expect(200)).body.pagination.total, 0);
  });

  test('el texto buscable se actualiza al editar la mascota', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api
        .post('/api/pets')
        .set(auth(owner.token))
        .send(petPayload({ name: 'Original', breed: 'Beagle' }))
        .expect(201)
    ).body.data;

    await api
      .put(`/api/pets/${pet.id}`)
      .set(auth(owner.token))
      .send(petPayload({ name: 'Editado', breed: 'Husky' }))
      .expect(200);

    assert.equal((await api.get('/api/pets?search=husky').expect(200)).body.pagination.total, 1);
    assert.equal((await api.get('/api/pets?search=beagle').expect(200)).body.pagination.total, 0);
  });
});

describe('Límites de peticiones', () => {
  beforeEach(resetDatabase);

  test('la API declara los límites en las cabeceras estándar', async () => {
    const response = await api.get('/api/pets').expect(200);
    assert.ok(
      response.headers['ratelimit'] || response.headers['ratelimit-policy'],
      'debe anunciarse el límite vigente'
    );
  });

  test('la documentación no consume la cuota de la API', async () => {
    const response = await api.get('/api/docs/openapi.json').expect(200);
    assert.equal(response.headers['ratelimit'], undefined);
  });

  /**
   * Las lecturas siguen de largo y llaman a `next` en el acto; las escrituras
   * pasan por el limitador, que consulta su almacén y por tanto continúa de
   * forma asíncrona. Esa diferencia distingue ambos caminos sin depender de
   * los detalles internos de express-rate-limit.
   */
  const continuesSynchronously = (method) => {
    let called = false;
    const response = {
      setHeader: () => {},
      getHeader: () => undefined,
      on: () => {},
      status: () => response,
      json: () => response
    };
    limitWrites({ method, ip: '10.0.0.9', headers: {} }, response, () => {
      called = true;
    });
    return called;
  };

  test('las lecturas no pasan por el límite de escrituras', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      assert.equal(continuesSynchronously(method), true, `${method} debe seguir de largo`);
    }
  });

  test('las escrituras sí pasan por el límite', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(continuesSynchronously(method), false, `${method} debe pasar por el limitador`);
    }
  });
});
