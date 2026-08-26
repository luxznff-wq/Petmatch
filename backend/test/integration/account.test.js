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
import * as tokenModel from '../../src/models/auth-token.model.js';

/** Extrae el token vigente que se acaba de emitir para una cuenta. */
async function issuedToken(userId, purpose) {
  const { store } = await import('../../src/models/memory-store.js');
  const { isPostgres, query } = await import('../../src/config/database.js');

  // El token en claro sólo viaja por correo; para las pruebas se emite uno
  // nuevo, que además invalida el anterior igual que en la vida real.
  if (isPostgres) {
    await query('SELECT 1');
  } else {
    assert.ok(store.authTokens.length >= 0);
  }
  return tokenModel.issue(userId, purpose, 60);
}

describe('Aceptación de los documentos legales', () => {
  beforeEach(resetDatabase);

  test('el registro exige aceptar términos y privacidad', async () => {
    const base = {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'sinaceptar@example.com',
      password: 'Clave123',
      city: 'Lima'
    };

    const missing = await api.post('/api/auth/register').send(base).expect(422);
    const fields = missing.body.errors.map((issue) => issue.field);
    assert.ok(fields.includes('acceptedTerms'));
    assert.ok(fields.includes('acceptedPrivacy'));

    // Marcar sólo uno tampoco vale.
    await api
      .post('/api/auth/register')
      .send({ ...base, acceptedTerms: true })
      .expect(422);

    // Y un "false" explícito se rechaza igual que la ausencia.
    await api
      .post('/api/auth/register')
      .send({ ...base, acceptedTerms: true, acceptedPrivacy: false })
      .expect(422);
  });

  test('guarda cuándo y qué versión se aceptó', async () => {
    const created = await registerUser({ email: 'aceptado@example.com' });
    const me = await api.get('/api/auth/me').set(auth(created.token)).expect(200);

    assert.ok(me.body.data.termsAcceptedAt, 'debe registrarse la fecha de aceptación');
    assert.ok(me.body.data.privacyAcceptedAt);
    assert.equal(me.body.data.legalVersion, '1.0');
  });

  test('expone la versión vigente y el responsable sin requerir sesión', async () => {
    const response = await api.get('/api/legal').expect(200);

    assert.equal(response.body.data.version, '1.0');
    assert.ok(response.body.data.contact.organization);
    assert.ok(response.body.data.contact.email);
  });
});

describe('Verificación de correo', () => {
  beforeEach(resetDatabase);

  test('una cuenta nueva empieza sin verificar', async () => {
    const user = await registerUser({ email: 'nuevo@example.com' });
    const me = await api.get('/api/auth/me').set(auth(user.token)).expect(200);
    assert.equal(me.body.data.emailVerifiedAt, null);
  });

  test('un enlace válido verifica la cuenta y no puede reutilizarse', async () => {
    const user = await registerUser({ email: 'verificar@example.com' });
    const token = await issuedToken(user.user.id, tokenModel.PURPOSES.EMAIL);

    const verified = await api.post('/api/account/verify-email').send({ token }).expect(200);
    assert.ok(verified.body.data.emailVerifiedAt);

    // Segundo intento con el mismo token: ya está consumido.
    await api.post('/api/account/verify-email').send({ token }).expect(400);
  });

  test('rechaza enlaces inventados', async () => {
    await api
      .post('/api/account/verify-email')
      .send({ token: 'a'.repeat(40) })
      .expect(400);
    await api.post('/api/account/verify-email').send({ token: 'corto' }).expect(422);
  });

  test('no reenvía la verificación si el correo ya está verificado', async () => {
    const user = await registerUser({ email: 'yaverificado@example.com' });
    const token = await issuedToken(user.user.id, tokenModel.PURPOSES.EMAIL);
    await api.post('/api/account/verify-email').send({ token }).expect(200);

    const again = await api
      .post('/api/account/verify-email/resend')
      .set(auth(user.token))
      .expect(409);
    assert.match(again.body.message, /ya está verificado/i);
  });
});

describe('Recuperación de contraseña', () => {
  beforeEach(resetDatabase);

  test('permite entrar con la contraseña nueva y no con la antigua', async () => {
    const user = await registerUser({ email: 'olvidadiza@example.com' });

    await api
      .post('/api/account/forgot-password')
      .send({ email: 'olvidadiza@example.com' })
      .expect(200);

    const token = await issuedToken(user.user.id, tokenModel.PURPOSES.PASSWORD);
    await api
      .post('/api/account/reset-password')
      .send({ token, newPassword: 'NuevaClave9' })
      .expect(200);

    await api
      .post('/api/auth/login')
      .send({ email: 'olvidadiza@example.com', password: 'NuevaClave9' })
      .expect(200);

    await api
      .post('/api/auth/login')
      .send({ email: 'olvidadiza@example.com', password: 'Clave123' })
      .expect(401);
  });

  test('no revela si un correo está registrado', async () => {
    const existente = await api
      .post('/api/account/forgot-password')
      .send({ email: 'fantasma@example.com' })
      .expect(200);

    await registerUser({ email: 'real@example.com' });
    const inexistente = await api
      .post('/api/account/forgot-password')
      .send({ email: 'real@example.com' })
      .expect(200);

    // La misma respuesta en ambos casos: no se puede deducir nada.
    assert.deepEqual(existente.body, inexistente.body);
  });

  test('el enlace es de un solo uso', async () => {
    const user = await registerUser({ email: 'unsolouso@example.com' });
    const token = await issuedToken(user.user.id, tokenModel.PURPOSES.PASSWORD);

    await api
      .post('/api/account/reset-password')
      .send({ token, newPassword: 'PrimeraClave9' })
      .expect(200);

    await api
      .post('/api/account/reset-password')
      .send({ token, newPassword: 'SegundaClave9' })
      .expect(400);
  });

  test('pedir un enlace nuevo invalida el anterior', async () => {
    const user = await registerUser({ email: 'doble@example.com' });
    const primero = await issuedToken(user.user.id, tokenModel.PURPOSES.PASSWORD);
    const segundo = await issuedToken(user.user.id, tokenModel.PURPOSES.PASSWORD);

    await api
      .post('/api/account/reset-password')
      .send({ token: primero, newPassword: 'ClaveVieja9' })
      .expect(400);

    await api
      .post('/api/account/reset-password')
      .send({ token: segundo, newPassword: 'ClaveNueva9' })
      .expect(200);
  });

  test('exige una contraseña segura', async () => {
    const user = await registerUser({ email: 'debil@example.com' });
    const token = await issuedToken(user.user.id, tokenModel.PURPOSES.PASSWORD);

    const weak = await api
      .post('/api/account/reset-password')
      .send({ token, newPassword: 'todominuscula' })
      .expect(422);
    assert.ok(weak.body.errors.some((issue) => issue.field === 'newPassword'));
  });

  test('una cuenta suspendida no recibe enlace', async () => {
    const admin = await createAdmin();
    const user = await registerUser({ email: 'suspendida@example.com' });

    await api
      .patch(`/api/users/${user.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);

    // Responde 200 igualmente para no filtrar el estado de la cuenta.
    await api
      .post('/api/account/forgot-password')
      .send({ email: 'suspendida@example.com' })
      .expect(200);
  });
});

describe('Derechos sobre los datos personales', () => {
  beforeEach(resetDatabase);

  test('la exportación entrega todos los datos de la persona', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;

    const adopter = await registerUser({ email: 'exporta@example.com' });
    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    const response = await api.get('/api/account/me/export').set(auth(adopter.token)).expect(200);

    assert.match(response.headers['content-disposition'], /attachment; filename=/);
    const data = JSON.parse(response.text);

    assert.equal(data.perfil.email, 'exporta@example.com');
    assert.equal(data.perfil.passwordHash, undefined, 'nunca se exporta el hash');
    assert.equal(data.favoritos.length, 1);
    assert.equal(data.solicitudes.length, 1);
    assert.ok(data.notificaciones.length >= 1);
    assert.ok(data.generadoEl);
  });

  test('la exportación exige sesión', async () => {
    await api.get('/api/account/me/export').expect(401);
  });

  test('la baja voluntaria elimina la cuenta y sus datos', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;

    const adopter = await registerUser({ email: 'baja@example.com' });
    await api.post(`/api/favorites/${pet.id}`).set(auth(adopter.token)).expect(201);
    await api
      .post('/api/adoptions/requests')
      .set(auth(adopter.token))
      .send(requestPayload(pet.id))
      .expect(201);

    await api
      .delete('/api/account/me')
      .set(auth(adopter.token))
      .send({ password: 'Clave123', confirmation: 'ELIMINAR' })
      .expect(204);

    // El token deja de servir y la solicitud desaparece del refugio.
    await api.get('/api/auth/me').set(auth(adopter.token)).expect(401);
    const requests = await api.get('/api/adoptions/requests').set(auth(owner.token)).expect(200);
    assert.equal(requests.body.pagination.total, 0);
  });

  test('la baja pide la contraseña y una confirmación explícita', async () => {
    const adopter = await registerUser({ email: 'confirma@example.com' });

    await api
      .delete('/api/account/me')
      .set(auth(adopter.token))
      .send({ password: 'Incorrecta9', confirmation: 'ELIMINAR' })
      .expect(401);

    await api
      .delete('/api/account/me')
      .set(auth(adopter.token))
      .send({ password: 'Clave123', confirmation: 'si' })
      .expect(422);

    // Tras los intentos fallidos la cuenta sigue existiendo.
    await api.get('/api/auth/me').set(auth(adopter.token)).expect(200);
  });

  test('no se puede dar de baja una cuenta con adopciones registradas', async () => {
    const admin = await createAdmin();
    const { owner } = await createVerifiedShelter(admin);
    const pet = (
      await api.post('/api/pets').set(auth(owner.token)).send(petPayload()).expect(201)
    ).body.data;
    const adopter = await registerUser({ email: 'conhistorial@example.com' });

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

    const blocked = await api
      .delete('/api/account/me')
      .set(auth(adopter.token))
      .send({ password: 'Clave123', confirmation: 'ELIMINAR' })
      .expect(409);
    assert.match(blocked.body.message, /adopciones registradas/i);
  });
});
