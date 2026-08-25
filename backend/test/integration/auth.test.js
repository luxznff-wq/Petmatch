import test, { beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { api, auth, createAdmin, registerUser } from '../helpers.js';
import { resetDatabase } from '../helpers.js';

describe('Autenticación', () => {
  beforeEach(resetDatabase);

  test('registra un adoptante, inicia sesión y devuelve su perfil', async () => {
    const created = await registerUser({ email: 'nuevo@example.com' });
    assert.equal(created.user.role, 'ADOPTANTE');
    assert.equal(created.user.status, 'ACTIVO');
    assert.ok(created.token, 'debe devolver un token');
    assert.equal(created.user.passwordHash, undefined, 'nunca expone el hash');

    const login = await api
      .post('/api/auth/login')
      .send({ email: 'nuevo@example.com', password: 'Clave123' })
      .expect(200);

    const me = await api.get('/api/auth/me').set(auth(login.body.data.token)).expect(200);
    assert.equal(me.body.data.email, 'nuevo@example.com');
  });

  test('normaliza el correo a minúsculas', async () => {
    await registerUser({ email: 'MAYUS@example.com' });
    await api
      .post('/api/auth/login')
      .send({ email: 'mayus@example.com', password: 'Clave123' })
      .expect(200);
  });

  test('rechaza correos duplicados con 409', async () => {
    await registerUser({ email: 'repetido@example.com' });
    const response = await api
      .post('/api/auth/register')
      .send({
        firstName: 'Otra',
        lastName: 'Persona',
        email: 'repetido@example.com',
        password: 'Clave123',
        city: 'Lima'
      })
      .expect(409);
    assert.match(response.body.message, /ya está registrado/i);
  });

  test('rechaza contraseñas inseguras con 422 y detalla el campo', async () => {
    const response = await api
      .post('/api/auth/register')
      .send({
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'debil@example.com',
        password: 'todominuscula',
        city: 'Lima'
      })
      .expect(422);

    assert.equal(response.body.success, false);
    assert.ok(response.body.errors.some((issue) => issue.field === 'password'));
  });

  test('no permite registrarse como ADMINISTRADOR', async () => {
    await api
      .post('/api/auth/register')
      .send({
        firstName: 'Intruso',
        lastName: 'Malicioso',
        email: 'intruso@example.com',
        password: 'Clave123',
        city: 'Lima',
        role: 'ADMINISTRADOR'
      })
      .expect(422);
  });

  test('devuelve 401 con contraseña incorrecta y con correo inexistente', async () => {
    await registerUser({ email: 'real@example.com' });

    await api
      .post('/api/auth/login')
      .send({ email: 'real@example.com', password: 'Incorrecta9' })
      .expect(401);

    await api
      .post('/api/auth/login')
      .send({ email: 'fantasma@example.com', password: 'Clave123' })
      .expect(401);
  });

  test('rechaza tokens inválidos o ausentes', async () => {
    await api.get('/api/auth/me').expect(401);
    await api.get('/api/auth/me').set(auth('token-falso')).expect(401);
  });

  test('una cuenta suspendida deja de poder usar su token', async () => {
    const admin = await createAdmin();
    const victim = await registerUser({ email: 'suspendido@example.com' });

    await api.get('/api/auth/me').set(auth(victim.token)).expect(200);

    await api
      .patch(`/api/users/${victim.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDIDO' })
      .expect(200);

    // El JWT sigue siendo válido criptográficamente, pero el estado manda.
    const blocked = await api.get('/api/auth/me').set(auth(victim.token)).expect(403);
    assert.match(blocked.body.message, /suspendida/i);

    await api
      .post('/api/auth/login')
      .send({ email: 'suspendido@example.com', password: 'Clave123' })
      .expect(403);
  });

  test('permite cambiar la contraseña con la actual correcta', async () => {
    const user = await registerUser({ email: 'cambio@example.com' });

    await api
      .patch('/api/auth/password')
      .set(auth(user.token))
      .send({ currentPassword: 'Otra1234', newPassword: 'NuevaClave1' })
      .expect(401);

    await api
      .patch('/api/auth/password')
      .set(auth(user.token))
      .send({ currentPassword: 'Clave123', newPassword: 'NuevaClave1' })
      .expect(200);

    await api
      .post('/api/auth/login')
      .send({ email: 'cambio@example.com', password: 'NuevaClave1' })
      .expect(200);
  });
});
