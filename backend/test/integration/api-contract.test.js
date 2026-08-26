import test, { beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { api, auth, registerUser, resetDatabase } from '../helpers.js';
import { openapi } from '../../src/docs/openapi.js';

describe('Contrato de la API', () => {
  beforeEach(resetDatabase);

  test('/api/health informa el motor de persistencia', async () => {
    const response = await api.get('/api/health').expect(200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'ok');
    assert.ok(['postgresql', 'memory'].includes(response.body.data.database));
  });

  test('las respuestas correctas usan el sobre { success, data }', async () => {
    const response = await api.get('/api/stats').expect(200);
    assert.deepEqual(Object.keys(response.body).sort(), ['data', 'success']);
    assert.equal(response.body.success, true);
  });

  test('los listados incluyen el bloque de paginación', async () => {
    const response = await api.get('/api/pets').expect(200);
    assert.deepEqual(
      Object.keys(response.body.pagination).sort(),
      ['limit', 'page', 'total', 'totalPages']
    );
  });

  test('los errores usan { success: false, message }', async () => {
    const response = await api.get('/api/pets/999999').expect(404);
    assert.equal(response.body.success, false);
    assert.equal(typeof response.body.message, 'string');
    assert.equal(response.body.data, undefined);
  });

  test('una ruta inexistente devuelve 404 con mensaje descriptivo', async () => {
    const response = await api.get('/api/no-existe').expect(404);
    assert.match(response.body.message, /Ruta no encontrada/);
  });

  test('el JSON malformado se responde como 400, no como 500', async () => {
    const response = await api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    assert.equal(response.body.success, false);
  });

  test('el límite de página tiene un tope', async () => {
    await api.get('/api/pets?limit=5000').expect(422);
    const response = await api.get('/api/pets?limit=50').expect(200);
    assert.equal(response.body.pagination.limit, 50);
  });

  test('expone la especificación OpenAPI', async () => {
    const response = await api.get('/api/docs/openapi.json').expect(200);
    assert.equal(response.body.openapi, '3.0.3');
    assert.equal(response.body.info.title, 'PetMatch API');
    assert.ok(Object.keys(response.body.paths).length >= 40);
  });

  test('la especificación documenta todas las rutas de la especificación funcional', () => {
    const required = [
      '/auth/register',
      '/auth/login',
      '/auth/logout',
      '/auth/me',
      '/users',
      '/users/{id}',
      '/users/{id}/status',
      '/pets',
      '/pets/{id}',
      '/pets/{id}/status',
      '/pets/{id}/images',
      '/pets/{id}/images/{imageId}',
      '/favorites',
      '/favorites/{petId}',
      '/adoptions/requests',
      '/adoptions/requests/{id}',
      '/adoptions/requests/{id}/status',
      '/adoptions/requests/{id}/interviews',
      '/interviews/{id}',
      '/adoptions',
      '/adoptions/{id}',
      '/shelters',
      '/shelters/{id}',
      '/shelters/{id}/status',
      '/notifications',
      '/notifications/{id}/read',
      '/notifications/read-all',
      '/reports/adoptions',
      '/reports/pets',
      '/reports/requests',
      '/reports/shelters',
      // Cuenta y documentos legales
      '/legal',
      '/account/forgot-password',
      '/account/reset-password',
      '/account/verify-email',
      '/account/me/export',
      '/account/me',
      '/pets/{id}/images/upload'
    ];

    const missing = required.filter((path) => !openapi.paths[path]);
    assert.deepEqual(missing, [], `faltan rutas en OpenAPI: ${missing.join(', ')}`);
  });

  test('rechaza peticiones desde orígenes no autorizados', async () => {
    await api.get('/api/pets').set('Origin', 'https://sitio-malicioso.com').expect(500);
    await api.get('/api/pets').set('Origin', 'http://localhost:5173').expect(200);
  });

  test('no filtra detalles internos en los mensajes de error', async () => {
    const adopter = await registerUser();
    const response = await api
      .get('/api/users/999999')
      .set(auth(adopter.token))
      .expect(403);
    assert.ok(!/SELECT|postgres|stack/i.test(response.body.message));
  });
});
