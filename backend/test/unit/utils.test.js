import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { ageGroupFromMonths, ageLabelFromMonths, monthsSince, resolveAge } from '../../src/utils/age.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, resolvePagination } from '../../src/utils/pagination.js';
import { QueryBuilder } from '../../src/utils/sql.js';
import { TRANSITIONS } from '../../src/services/adoption-request.service.js';

describe('utils/age', () => {
  const now = new Date('2026-08-25T00:00:00Z');

  test('calcula los meses cumplidos', () => {
    assert.equal(monthsSince('2026-08-25', now), 0);
    assert.equal(monthsSince('2026-07-26', now), 0, 'aún no cumple el mes');
    assert.equal(monthsSince('2026-07-25', now), 1);
    assert.equal(monthsSince('2024-08-25', now), 24);
  });

  test('clasifica el grupo etario según la especificación §15', () => {
    assert.equal(ageGroupFromMonths(0), 'Cachorro');
    assert.equal(ageGroupFromMonths(11), 'Cachorro');
    assert.equal(ageGroupFromMonths(12), 'Joven');
    assert.equal(ageGroupFromMonths(35), 'Joven');
    assert.equal(ageGroupFromMonths(36), 'Adulto');
    assert.equal(ageGroupFromMonths(95), 'Adulto');
    assert.equal(ageGroupFromMonths(96), 'Senior');
    assert.equal(ageGroupFromMonths(null), null);
  });

  test('genera etiquetas legibles en español', () => {
    assert.equal(ageLabelFromMonths(0), 'Recién nacido');
    assert.equal(ageLabelFromMonths(1), '1 mes');
    assert.equal(ageLabelFromMonths(8), '8 meses');
    assert.equal(ageLabelFromMonths(12), '1 año');
    assert.equal(ageLabelFromMonths(30), '2 años');
  });

  test('la fecha de nacimiento tiene prioridad sobre los valores manuales', () => {
    assert.deepEqual(
      resolveAge({ birthDate: '2024-08-25', ageGroup: 'Senior', ageLabel: 'Muy viejo' }, now),
      { ageGroup: 'Joven', ageLabel: '2 años' }
    );

    assert.deepEqual(resolveAge({ ageGroup: 'Adulto', ageLabel: '5 años' }, now), {
      ageGroup: 'Adulto',
      ageLabel: '5 años'
    });

    assert.deepEqual(resolveAge({}, now), { ageGroup: null, ageLabel: null });
  });
});

describe('utils/pagination', () => {
  test('aplica los valores por defecto de la especificación §17', () => {
    assert.deepEqual(resolvePagination({}), { page: 1, limit: DEFAULT_PAGE_SIZE, offset: 0 });
  });

  test('normaliza valores inválidos', () => {
    assert.deepEqual(resolvePagination({ page: '0', limit: '-5' }), {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      offset: 0
    });
    assert.deepEqual(resolvePagination({ page: 'abc' }), {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      offset: 0
    });
  });

  test('recorta el tamaño de página al máximo permitido', () => {
    assert.equal(resolvePagination({ limit: 500 }).limit, MAX_PAGE_SIZE);
  });

  test('calcula el desplazamiento', () => {
    assert.equal(resolvePagination({ page: 3, limit: 12 }).offset, 24);
  });
});

describe('utils/sql QueryBuilder', () => {
  test('parametriza cada valor en lugar de interpolarlo', () => {
    const builder = new QueryBuilder();
    builder.where('status = ?', 'DISPONIBLE');
    builder.where('city ILIKE ?', '%lima%');

    assert.equal(builder.clause, 'status = $1 AND city ILIKE $2');
    assert.deepEqual(builder.values, ['DISPONIBLE', '%lima%']);
  });

  test('soporta varios marcadores en un mismo fragmento', () => {
    const builder = new QueryBuilder();
    builder.where('(name ILIKE ? OR breed ILIKE ?)', '%luna%', '%luna%');
    assert.equal(builder.clause, '(name ILIKE $1 OR breed ILIKE $2)');
  });

  test('ignora los filtros vacíos', () => {
    const builder = new QueryBuilder();
    builder.whereIfPresent('species = ?', undefined);
    builder.whereIfPresent('city = ?', '');
    builder.whereIfPresent('sex = ?', null);
    assert.equal(builder.clause, 'TRUE');
    assert.deepEqual(builder.values, []);
  });

  test('falla si el número de valores no coincide con los marcadores', () => {
    const builder = new QueryBuilder();
    assert.throws(() => builder.where('a = ? AND b = ?', 1), /no coincide/);
  });

  test('un valor con apostrofes no altera la cláusula generada', () => {
    const builder = new QueryBuilder();
    builder.where('name = ?', "'; DROP TABLE pets; --");
    assert.equal(builder.clause, 'name = $1');
    assert.deepEqual(builder.values, ["'; DROP TABLE pets; --"]);
  });
});

describe('máquina de estados de las solicitudes (§34)', () => {
  test('sólo declara transiciones hacia estados conocidos', () => {
    const states = Object.keys(TRANSITIONS);
    for (const [from, targets] of Object.entries(TRANSITIONS)) {
      for (const target of targets) {
        assert.ok(states.includes(target), `${from} → ${target} apunta a un estado inexistente`);
      }
    }
  });

  test('los estados finales no permiten salir', () => {
    assert.deepEqual(TRANSITIONS.RECHAZADA, []);
    assert.deepEqual(TRANSITIONS.CANCELADA, []);
    assert.deepEqual(TRANSITIONS.ADOPCION_COMPLETADA, []);
  });

  test('el camino feliz de la especificación es alcanzable', () => {
    assert.ok(TRANSITIONS.PENDIENTE.includes('EN_REVISION'));
    assert.ok(TRANSITIONS.EN_REVISION.includes('ENTREVISTA'));
    assert.ok(TRANSITIONS.ENTREVISTA.includes('APROBADA'));
  });

  test('no se puede saltar directamente de PENDIENTE a APROBADA', () => {
    assert.ok(!TRANSITIONS.PENDIENTE.includes('APROBADA'));
    assert.ok(!TRANSITIONS.PENDIENTE.includes('ADOPCION_COMPLETADA'));
  });
});
