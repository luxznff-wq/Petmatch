import test, { beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  auth,
  createAdmin,
  createVerifiedShelter,
  petPayload,
  registerUser,
  resetDatabase
} from '../helpers.js';

describe('Mascotas', () => {
  beforeEach(resetDatabase);

  test('un refugio verificado registra una mascota y aparece en el listado', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);

    const created = await api
      .post('/api/pets')
      .set(auth(owner.token))
      .send(petPayload({ name: 'Toby', breed: 'Beagle', attributes: { vaccinated: true } }))
      .expect(201);

    assert.equal(created.body.data.name, 'Toby');
    assert.equal(created.body.data.status, 'DISPONIBLE');
    assert.equal(created.body.data.attributes.vaccinated, true);
    assert.deepEqual(created.body.data.tags, ['Vacunado']);

    const list = await api.get('/api/pets').expect(200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.pagination.total, 1);
    assert.equal(list.body.pagination.totalPages, 1);
  });

  test('un refugio sin perfil o sin verificar no puede publicar', async () => {
    const unregistered = await registerUser({ role: 'REFUGIO' });
    const conflict = await api
      .post('/api/pets')
      .set(auth(unregistered.token))
      .send(petPayload())
      .expect(409);
    assert.match(conflict.body.message, /registrar el perfil/i);

    await api
      .post('/api/shelters')
      .set(auth(unregistered.token))
      .send({ name: 'Refugio nuevo', city: 'Lima' })
      .expect(201);

    const pending = await api
      .post('/api/pets')
      .set(auth(unregistered.token))
      .send(petPayload())
      .expect(403);
    assert.match(pending.body.message, /pendiente de verificación/i);
  });

  test('un refugio suspendido no puede seguir gestionando sus mascotas', async () => {
    const admin = await createAdmin();
    const { owner, shelter } = await createVerifiedShelter(admin);

    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;

    await api
      .patch(`/api/shelters/${shelter.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);

    await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(403);
    await api
      .patch(`/api/pets/${pet.id}/status`)
      .set(auth(owner.token))
      .send({ status: 'NO_DISPONIBLE' })
      .expect(403);
  });

  test('un adoptante no puede crear ni editar mascotas', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const adopter = await registerUser();

    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;

    await api.post('/api/pets').set(auth(adopter.token)).send(petPayload()).expect(403);
    await api.put(`/api/pets/${pet.id}`).set(auth(adopter.token)).send(petPayload()).expect(403);
    await api.delete(`/api/pets/${pet.id}`).set(auth(adopter.token)).expect(403);
  });

  test('un refugio no puede administrar las mascotas de otro refugio', async () => {
    const admin = await createAdmin();
    const first = await createVerifiedShelter(admin, {
      owner: { email: 'uno@example.com' },
      shelter: { name: 'Refugio Uno' }
    });
    const second = await createVerifiedShelter(admin, {
      owner: { email: 'dos@example.com' },
      shelter: { name: 'Refugio Dos' }
    });

    const pet = (
      await api.post('/api/pets').set(auth(first.owner.token)).send(petPayload()).expect(201)
    ).body.data;

    const forbidden = await api
      .put(`/api/pets/${pet.id}`)
      .set(auth(second.owner.token))
      .send(petPayload({ name: 'Secuestrado' }))
      .expect(403);
    assert.match(forbidden.body.message, /tu refugio/i);

    // El administrador sí puede intervenir (§49).
    await api
      .patch(`/api/pets/${pet.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'NO_DISPONIBLE' })
      .expect(200);
  });

  test('devuelve 404 para una mascota inexistente', async () => {
    await api.get('/api/pets/9999').expect(404);
    await api.get('/api/pets/no-es-un-id').expect(404);
  });

  test('valida los datos de la mascota', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);

    const invalid = await api
      .post('/api/pets')
      .set(auth(owner.token))
      .send({ name: 'A', species: 'Dinosaurio', sex: 'Otro', city: '', weightKg: -3 })
      .expect(422);

    const fields = invalid.body.errors.map((issue) => issue.field);
    assert.ok(fields.includes('name'));
    assert.ok(fields.includes('species'));
    assert.ok(fields.includes('sex'));
    assert.ok(fields.includes('weightKg'));
  });

  test('deriva el grupo etario a partir de la fecha de nacimiento', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);

    const puppyBirth = new Date();
    puppyBirth.setMonth(puppyBirth.getMonth() - 5);

    const puppy = await api
      .post('/api/pets')
      .set(auth(owner.token))
      .send(petPayload({ name: 'Bebé', birthDate: puppyBirth.toISOString().slice(0, 10) }))
      .expect(201);

    assert.equal(puppy.body.data.ageGroup, 'Cachorro');
    assert.match(puppy.body.data.ageLabel, /mes/);

    await api
      .post('/api/pets')
      .set(auth(owner.token))
      .send(petPayload({ name: 'Futuro', birthDate: '2099-01-01' }))
      .expect(422);
  });

  describe('búsqueda, filtros, orden y paginación', () => {
    /** Publica un catálogo conocido y devuelve el token del refugio. */
    async function seedCatalogue() {
      const admin = await createAdmin();
      const { owner } = await createVerifiedShelter(admin, {
        shelter: { name: 'Refugio Central', city: 'Lima' }
      });

      const catalogue = [
        petPayload({ name: 'Ada', species: 'Gato', sex: 'Hembra', size: 'Pequeño', city: 'Arequipa', breed: 'Siamés' }),
        petPayload({ name: 'Beto', species: 'Perro', sex: 'Macho', size: 'Grande', city: 'Lima', breed: 'Labrador', attributes: { vaccinated: true } }),
        petPayload({ name: 'Ciro', species: 'Perro', sex: 'Macho', size: 'Mediano', city: 'Lima', breed: 'Beagle' }),
        petPayload({ name: 'Dora', species: 'Conejo', sex: 'Hembra', size: 'Pequeño', city: 'Cusco' }),
        petPayload({ name: 'Elsa', species: 'Gato', sex: 'Hembra', size: 'Pequeño', city: 'Lima', status: 'ADOPTADA' })
      ];

      for (const pet of catalogue) {
        await api.post('/api/pets').set(auth(owner.token)).send(pet).expect(201);
      }
      return { admin, owner };
    }

    test('filtra por especie, sexo, tamaño y ciudad', async () => {
      await seedCatalogue();

      const dogs = await api.get('/api/pets?species=Perro').expect(200);
      assert.equal(dogs.body.pagination.total, 2);

      const females = await api.get('/api/pets?sex=Hembra').expect(200);
      assert.deepEqual(
        females.body.data.map((pet) => pet.name).sort(),
        ['Ada', 'Dora', 'Elsa']
      );

      const smallInLima = await api.get('/api/pets?size=Pequeño&city=Lima').expect(200);
      assert.deepEqual(smallInLima.body.data.map((pet) => pet.name), ['Elsa']);
    });

    test('filtra por estado y por características', async () => {
      await seedCatalogue();

      const available = await api.get('/api/pets?status=DISPONIBLE').expect(200);
      assert.equal(available.body.pagination.total, 4);

      const vaccinated = await api.get('/api/pets?vaccinated=true').expect(200);
      assert.deepEqual(vaccinated.body.data.map((pet) => pet.name), ['Beto']);
    });

    test('busca por nombre, raza, ciudad y refugio', async () => {
      await seedCatalogue();

      const byBreed = await api.get('/api/pets?search=labrador').expect(200);
      assert.deepEqual(byBreed.body.data.map((pet) => pet.name), ['Beto']);

      const byCity = await api.get('/api/pets?search=cusco').expect(200);
      assert.deepEqual(byCity.body.data.map((pet) => pet.name), ['Dora']);

      const byShelter = await api.get('/api/pets?search=Central').expect(200);
      assert.equal(byShelter.body.pagination.total, 5);
    });

    test('ordena y pagina los resultados', async () => {
      await seedCatalogue();

      const alphabetical = await api.get('/api/pets?sort=name-asc').expect(200);
      assert.deepEqual(
        alphabetical.body.data.map((pet) => pet.name),
        ['Ada', 'Beto', 'Ciro', 'Dora', 'Elsa']
      );

      const reversed = await api.get('/api/pets?sort=name-desc').expect(200);
      assert.equal(reversed.body.data[0].name, 'Elsa');

      const firstPage = await api.get('/api/pets?limit=2&page=1&sort=name-asc').expect(200);
      assert.deepEqual(firstPage.body.data.map((pet) => pet.name), ['Ada', 'Beto']);
      assert.deepEqual(firstPage.body.pagination, {
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3
      });

      const lastPage = await api.get('/api/pets?limit=2&page=3&sort=name-asc').expect(200);
      assert.deepEqual(lastPage.body.data.map((pet) => pet.name), ['Elsa']);
    });

    test('rechaza filtros con valores no permitidos', async () => {
      await api.get('/api/pets?species=Dragón').expect(422);
      await api.get('/api/pets?sort=aleatorio').expect(422);
    });
  });

  describe('galería de fotografías', () => {
    test('agrega, lista y elimina fotografías respetando la principal', async () => {
      const admin = await createAdmin();
      const { owner } = await createVerifiedShelter(admin);
      const pet = (
        await api
          .post('/api/pets')
          .set(auth(owner.token))
          .send(petPayload({ image: 'https://example.com/uno.jpg' }))
          .expect(201)
      ).body.data;

      assert.equal(pet.image, 'https://example.com/uno.jpg');

      const second = await api
        .post(`/api/pets/${pet.id}/images`)
        .set(auth(owner.token))
        .send({ url: 'https://example.com/dos.jpg', isPrimary: true })
        .expect(201);

      const images = await api.get(`/api/pets/${pet.id}/images`).expect(200);
      assert.equal(images.body.data.length, 2);
      assert.equal(images.body.data.filter((image) => image.isPrimary).length, 1);
      assert.equal(images.body.data[0].url, 'https://example.com/dos.jpg');

      await api
        .delete(`/api/pets/${pet.id}/images/${second.body.data.id}`)
        .set(auth(owner.token))
        .expect(204);

      const remaining = await api.get(`/api/pets/${pet.id}/images`).expect(200);
      assert.equal(remaining.body.data.length, 1);
    });

    test('rechaza URLs inválidas y fotografías de otros refugios', async () => {
      const admin = await createAdmin();
      const { owner } = await createVerifiedShelter(admin, { owner: { email: 'a@example.com' } });
      const other = await createVerifiedShelter(admin, {
        owner: { email: 'b@example.com' },
        shelter: { name: 'Otro refugio' }
      });

      const pet = (
        await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
      ).body.data;

      await api
        .post(`/api/pets/${pet.id}/images`)
        .set(auth(owner.token))
        .send({ url: 'no-es-una-url' })
        .expect(422);

      await api
        .post(`/api/pets/${pet.id}/images`)
        .set(auth(other.owner.token))
        .send({ url: 'https://example.com/robada.jpg' })
        .expect(403);
    });
  });
});
