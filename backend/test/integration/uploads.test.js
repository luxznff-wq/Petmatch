import test, { after, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  api,
  auth,
  createAdmin,
  createVerifiedShelter,
  petPayload,
  registerUser,
  resetDatabase
} from '../helpers.js';
import { uploadDir } from '../../src/middleware/upload.js';

/**
 * PNG mínimo válido de 1x1 píxel. Se usa como carga real para que multer
 * detecte el tipo a partir de la cabecera del archivo, no de su nombre.
 */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** Archivos presentes en el directorio de subidas. */
const storedFiles = async () => (existsSync(uploadDir) ? readdir(uploadDir) : []);

describe('Subida de fotografías', () => {
  beforeEach(resetDatabase);

  // Las pruebas escriben en disco: se limpia lo que dejan.
  after(async () => {
    for (const file of await storedFiles()) {
      await rm(join(uploadDir, file), { force: true });
    }
  });

  /** Refugio verificado con una mascota lista para recibir fotos. */
  async function scenario() {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    return { admin, owner, pet };
  }

  test('el refugio sube un archivo y queda en la galería', async () => {
    const { owner, pet } = await scenario();

    const response = await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(owner.token))
      .attach('image', PNG_1X1, { filename: 'luna.png', contentType: 'image/png' })
      .expect(201);

    const image = response.body.data;
    assert.match(image.url, /^\/uploads\//);
    assert.equal(image.mimeType, 'image/png');
    assert.ok(image.sizeBytes > 0);
    assert.ok(image.storageKey, 'debe guardarse la referencia al archivo');

    // El nombre original no se conserva: se genera uno propio.
    assert.ok(!image.storageKey.includes('luna'), 'el nombre debe generarse, no heredarse');

    const gallery = await api.get(`/api/pets/${pet.id}/images`).expect(200);
    assert.equal(gallery.body.data.length, 1);
  });

  test('el archivo se sirve por su URL pública', async () => {
    const { owner, pet } = await scenario();
    const image = (
      await api
        .post(`/api/pets/${pet.id}/images/upload`)
        .set(auth(owner.token))
        .attach('image', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201)
    ).body.data;

    const file = await api.get(image.url).expect(200);
    assert.match(file.headers['content-type'], /image\/png/);
    assert.equal(file.headers['x-content-type-options'], 'nosniff');
  });

  test('marcar la nueva como principal desmarca la anterior', async () => {
    const { owner, pet } = await scenario();

    await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(owner.token))
      .field('isPrimary', 'true')
      .attach('image', PNG_1X1, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);

    await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(owner.token))
      .field('isPrimary', 'true')
      .attach('image', PNG_1X1, { filename: 'b.png', contentType: 'image/png' })
      .expect(201);

    const gallery = await api.get(`/api/pets/${pet.id}/images`).expect(200);
    assert.equal(gallery.body.data.filter((image) => image.isPrimary).length, 1);
  });

  test('rechaza formatos que no son imagen', async () => {
    const { owner, pet } = await scenario();

    const response = await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(owner.token))
      .attach('image', Buffer.from('<?php echo 1; ?>'), {
        filename: 'malicioso.php',
        contentType: 'application/x-php'
      })
      .expect(422);

    assert.match(response.body.message, /Formato no admitido/i);
  });

  test('rechaza contenido que no es una imagen aunque el tipo declarado lo sea', async () => {
    const { owner, pet } = await scenario();
    const before = (await storedFiles()).length;

    // El Content-Type lo elige quien sube: se comprueba la firma real.
    const response = await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(owner.token))
      .attach('image', Buffer.from('<script>alert(1)</script> esto no es una imagen'), {
        filename: 'disfrazado.png',
        contentType: 'image/png'
      })
      .expect(422);

    assert.match(response.body.message, /no es una imagen válida/i);
    assert.equal((await storedFiles()).length, before, 'el archivo rechazado no debe quedarse');
  });

  test('rechaza archivos que superan el tamaño máximo', async () => {
    const { owner, pet } = await scenario();
    const enorme = Buffer.alloc(6 * 1024 * 1024, 1);

    const response = await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(owner.token))
      .attach('image', enorme, { filename: 'grande.png', contentType: 'image/png' })
      .expect(422);

    assert.match(response.body.message, /supera el máximo/i);
  });

  test('exige sesión y permisos sobre la mascota', async () => {
    const { admin, pet } = await scenario();
    const intruso = await createVerifiedShelter(admin, {
      owner: { email: 'intruso@example.com' },
      shelter: { name: 'Refugio intruso' }
    });
    const adoptante = await registerUser({ email: 'curioso@example.com' });

    await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .attach('image', PNG_1X1, { filename: 'x.png', contentType: 'image/png' })
      .expect(401);

    await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(adoptante.token))
      .attach('image', PNG_1X1, { filename: 'x.png', contentType: 'image/png' })
      .expect(403);

    const before = (await storedFiles()).length;
    await api
      .post(`/api/pets/${pet.id}/images/upload`)
      .set(auth(intruso.owner.token))
      .attach('image', PNG_1X1, { filename: 'x.png', contentType: 'image/png' })
      .expect(403);

    // El archivo del refugio ajeno no debe quedarse en disco.
    assert.equal((await storedFiles()).length, before, 'no debe dejar archivos huérfanos');
  });

  test('eliminar la fotografía borra también el archivo', async () => {
    const { owner, pet } = await scenario();
    const image = (
      await api
        .post(`/api/pets/${pet.id}/images/upload`)
        .set(auth(owner.token))
        .attach('image', PNG_1X1, { filename: 'borrar.png', contentType: 'image/png' })
        .expect(201)
    ).body.data;

    assert.ok((await storedFiles()).includes(image.storageKey));

    await api
      .delete(`/api/pets/${pet.id}/images/${image.id}`)
      .set(auth(owner.token))
      .expect(204);

    assert.ok(
      !(await storedFiles()).includes(image.storageKey),
      'el archivo debe desaparecer del almacenamiento'
    );
  });

  test('las imágenes por URL externa siguen funcionando', async () => {
    const { owner, pet } = await scenario();

    const response = await api
      .post(`/api/pets/${pet.id}/images`)
      .set(auth(owner.token))
      .send({ url: 'https://example.com/externa.jpg', isPrimary: true })
      .expect(201);

    assert.equal(response.body.data.storageKey, null);
    assert.equal(response.body.data.url, 'https://example.com/externa.jpg');
  });
});
