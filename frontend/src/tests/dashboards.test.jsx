import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from './utils.jsx';

import AdopterDashboardPage from '../pages/adopter/AdopterDashboardPage.jsx';
import MyRequestsPage from '../pages/adopter/MyRequestsPage.jsx';
import ShelterDashboardPage from '../pages/shelter/ShelterDashboardPage.jsx';
import ShelterRequestDetailPage from '../pages/shelter/ShelterRequestDetailPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminSheltersPage from '../pages/admin/AdminSheltersPage.jsx';

/**
 * Pruebas de los tres paneles.
 *
 * La lógica que aquí importa no es de presentación: qué acciones se ofrecen
 * en cada estado, y qué se envía a la API al pulsarlas. Un botón de más en el
 * estado equivocado deja al usuario ante un 409 del servidor.
 */

const ok = (data, extra = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, data, ...extra })
});

const paged = (items) =>
  ok(items, {
    pagination: { page: 1, limit: 15, total: items.length, totalPages: 1 }
  });

/** Enruta cada petición simulada según su URL. */
function mockApi(routes) {
  return vi.fn(async (url, options = {}) => {
    const method = options.method ?? 'GET';
    const match = routes.find(
      ([pattern, verb = 'GET']) => url.includes(pattern) && verb === method
    );
    if (!match) return ok(null);
    const [, , response] = match;
    return typeof response === 'function' ? response(url, options) : (response ?? ok(null));
  });
}

/** Sesión iniciada con el rol indicado. */
function signedInAs(role) {
  localStorage.setItem('petmatch_token', 'jwt-de-prueba');
  return ['/auth/me', 'GET', ok({ id: 1, firstName: 'Ana', lastName: 'Pérez', role })];
}

afterEach(() => vi.unstubAllGlobals());

describe('Panel del adoptante', () => {
  const workspace = {
    role: 'ADOPTANTE',
    summary: { favorites: 2, requests: 3, interviews: 1, adoptions: 0, unreadNotifications: 4 },
    favorites: [],
    requests: [
      {
        id: 7,
        petName: 'Luna',
        shelterName: 'Refugio Esperanza',
        status: 'EN_REVISION',
        createdAt: '2026-08-20T10:00:00Z'
      }
    ],
    interviews: [],
    adoptions: [],
    notifications: []
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      mockApi([signedInAs('ADOPTANTE'), ['/workspace', 'GET', ok(workspace)]])
    );
  });

  test('muestra el resumen con los contadores reales', async () => {
    renderWithProviders(<AdopterDashboardPage />, { route: '/mi-cuenta' });

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();

    // Cada tarjeta enlaza a su sección y muestra su contador.
    const favoritos = screen.getByRole('link', { name: /Favoritos/ });
    expect(favoritos).toHaveAttribute('href', '/mi-cuenta/favoritos');
    expect(within(favoritos).getByText('2')).toBeInTheDocument();

    expect(
      within(screen.getByRole('link', { name: /Solicitudes/ })).getByText('3')
    ).toBeInTheDocument();
  });

  test('lista las últimas solicitudes con su estado traducido', async () => {
    renderWithProviders(<AdopterDashboardPage />, { route: '/mi-cuenta' });

    expect(await screen.findByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText('Refugio Esperanza')).toBeInTheDocument();
  });

  test('el estado vacío invita a explorar en lugar de dejar la página en blanco', async () => {
    vi.stubGlobal(
      'fetch',
      mockApi([
        signedInAs('ADOPTANTE'),
        ['/workspace', 'GET', ok({ ...workspace, requests: [], interviews: [] })]
      ])
    );

    renderWithProviders(<AdopterDashboardPage />, { route: '/mi-cuenta' });

    expect(
      await screen.findByRole('heading', { name: /Todavía no enviaste solicitudes/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explorar mascotas/ })).toHaveAttribute(
      'href',
      '/mascotas'
    );
  });

  test('filtrar por estado se envía a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi([signedInAs('ADOPTANTE'), ['/adoptions/requests', 'GET', paged([])]]);
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<MyRequestsPage />, { route: '/mi-cuenta/solicitudes' });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'APROBADA');

    await waitFor(() => {
      const llamadas = fetchMock.mock.calls.map(([url]) => url);
      expect(llamadas.some((url) => url.includes('status=APROBADA'))).toBe(true);
    });
  });
});

describe('Panel del refugio', () => {
  const base = {
    role: 'REFUGIO',
    shelter: { id: 3, name: 'Refugio Esperanza', city: 'Arequipa', status: 'VERIFICADO' },
    summary: {
      pets: 7,
      petsAvailable: 5,
      petsInProcess: 1,
      petsAdopted: 1,
      petsUnavailable: 0,
      requestsPending: 2,
      requestsUnderReview: 1,
      requestsInterview: 0,
      adoptionsThisMonth: 1,
      adoptionsTotal: 4
    },
    pets: [],
    requests: [],
    interviews: [],
    adoptions: [],
    notifications: []
  };

  const render = (workspace) => {
    vi.stubGlobal('fetch', mockApi([signedInAs('REFUGIO'), ['/workspace', 'GET', ok(workspace)]]));
    return renderWithProviders(<ShelterDashboardPage />, { route: '/refugio' });
  };

  test('un refugio sin perfil ve la invitación a registrarlo', async () => {
    render({ ...base, shelter: null, summary: null });

    expect(
      await screen.findByRole('heading', { name: /Todavía no registraste tu refugio/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Registrar mi refugio/ })).toHaveAttribute(
      'href',
      '/refugio/perfil'
    );
  });

  test('un refugio pendiente no puede publicar todavía', async () => {
    render({ ...base, shelter: { ...base.shelter, status: 'PENDIENTE' } });

    expect(await screen.findByText(/pendiente de verificación/i)).toBeInTheDocument();

    // Registrar mascota se muestra pero inhabilitado: así se entiende que la
    // opción existe y sólo falta la verificación. Debe ser un botón real
    // deshabilitado, no un enlace: un <a> ignoraría `disabled` y dejaría
    // entrar al formulario para acabar en un 403 al guardar.
    const accion = screen.getByRole('button', { name: /Registrar mascota/ });
    expect(accion).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Registrar mascota/ })).not.toBeInTheDocument();
  });

  test('un refugio suspendido ve el aviso correspondiente', async () => {
    render({ ...base, shelter: { ...base.shelter, status: 'SUSPENDIDO' } });

    expect(await screen.findByText(/está suspendido/i)).toBeInTheDocument();
    expect(screen.getByText('Suspendido')).toBeInTheDocument();
  });

  test('un refugio verificado ve sus métricas y puede publicar', async () => {
    render(base);

    expect(await screen.findByRole('heading', { name: 'Refugio Esperanza' })).toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();
    expect(screen.queryByText(/pendiente de verificación/i)).not.toBeInTheDocument();

    const disponibles = screen.getByText('Disponibles').closest('.dashboard-card');
    expect(within(disponibles).getByText('5')).toBeInTheDocument();
  });
});

describe('Revisión de una solicitud', () => {
  const request = (status, extra = {}) => ({
    id: 12,
    petId: 4,
    petName: 'Luna',
    adopterName: 'Juan Pérez',
    status,
    createdAt: '2026-08-20T10:00:00Z',
    applicant: {
      name: 'Juan Pérez Vega',
      age: 34,
      phone: '+51 999',
      email: 'juan@example.com',
      address: 'Av. 1',
      city: 'Lima'
    },
    housing: {
      type: 'Casa',
      hasYard: true,
      livesAlone: false,
      hasOtherPets: false,
      hasChildren: true
    },
    hadPetsBefore: false,
    motivation: 'Quiero darle un hogar.',
    interviews: [],
    ...extra
  });

  const render = (data) => {
    vi.stubGlobal(
      'fetch',
      mockApi([signedInAs('REFUGIO'), ['/adoptions/requests/12', 'GET', ok(data)]])
    );
    return renderWithProviders(
      <Routes>
        <Route path="/refugio/solicitudes/:id" element={<ShelterRequestDetailPage />} />
      </Routes>,
      { route: '/refugio/solicitudes/12' }
    );
  };

  test('en PENDIENTE sólo ofrece revisar o rechazar', async () => {
    render(request('PENDIENTE'));

    expect(await screen.findByRole('button', { name: /Enviar a revisión/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechazar/ })).toBeInTheDocument();

    // Aprobar desde PENDIENTE lo rechazaría el servidor: no debe ofrecerse.
    expect(screen.queryByRole('button', { name: /^Aprobar$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar adopción/ })).not.toBeInTheDocument();
  });

  test('en ENTREVISTA permite agendar', async () => {
    render(request('ENTREVISTA'));

    expect(await screen.findByRole('button', { name: /Programar entrevista/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Aprobar$/ })).toBeInTheDocument();
  });

  test('sólo en APROBADA ofrece registrar la adopción', async () => {
    render(request('APROBADA'));

    expect(await screen.findByRole('button', { name: /Registrar adopción/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar a revisión/ })).not.toBeInTheDocument();
  });

  test('una solicitud cerrada no ofrece ninguna acción', async () => {
    render(request('ADOPCION_COMPLETADA'));

    expect(await screen.findByText(/Esta adopción ya fue registrada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar|Rechazar|Registrar/ })).not.toBeInTheDocument();
  });

  test('avanzar el estado envía la transición correcta', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi([
      signedInAs('REFUGIO'),
      ['/adoptions/requests/12', 'GET', ok(request('PENDIENTE'))],
      ['/adoptions/requests/12/status', 'PATCH', ok(request('EN_REVISION'))]
    ]);
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/refugio/solicitudes/:id" element={<ShelterRequestDetailPage />} />
      </Routes>,
      { route: '/refugio/solicitudes/12' }
    );

    await user.click(await screen.findByRole('button', { name: /Enviar a revisión/ }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
      expect(patch).toBeTruthy();
      expect(JSON.parse(patch[1].body)).toEqual({ status: 'EN_REVISION' });
    });
  });

  test('muestra los datos declarados por el solicitante', async () => {
    render(request('PENDIENTE'));

    expect(await screen.findByText('Juan Pérez Vega')).toBeInTheDocument();
    expect(screen.getByText('34 años')).toBeInTheDocument();
    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Quiero darle un hogar.')).toBeInTheDocument();
  });
});

describe('Panel administrativo', () => {
  const users = [
    {
      id: 2,
      firstName: 'Rosa',
      lastName: 'Flores',
      email: 'rosa@example.com',
      role: 'REFUGIO',
      city: 'Arequipa',
      status: 'ACTIVO',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 3,
      firstName: 'Carlos',
      lastName: 'Mendoza',
      email: 'carlos@example.com',
      role: 'ADOPTANTE',
      city: 'Lima',
      status: 'SUSPENDIDO',
      createdAt: '2026-02-01T00:00:00Z'
    }
  ];

  test('la acción ofrecida depende del estado de la cuenta', async () => {
    vi.stubGlobal('fetch', mockApi([signedInAs('ADMINISTRADOR'), ['/users', 'GET', paged(users)]]));

    renderWithProviders(<AdminUsersPage />, { route: '/admin/usuarios' });

    const filas = await screen.findAllByRole('row');
    const activa = filas.find((fila) => within(fila).queryByText('rosa@example.com'));
    const suspendida = filas.find((fila) => within(fila).queryByText('carlos@example.com'));

    expect(within(activa).getByRole('button', { name: /Suspender/ })).toBeInTheDocument();
    expect(within(suspendida).getByRole('button', { name: /Reactivar/ })).toBeInTheDocument();
  });

  test('suspender envía el estado nuevo', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi([
      signedInAs('ADMINISTRADOR'),
      ['/users', 'GET', paged(users)],
      ['/users/2/status', 'PATCH', ok({ ...users[0], status: 'SUSPENDIDO' })]
    ]);
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<AdminUsersPage />, { route: '/admin/usuarios' });

    const filas = await screen.findAllByRole('row');
    const activa = filas.find((fila) => within(fila).queryByText('rosa@example.com'));
    await user.click(within(activa).getByRole('button', { name: /Suspender/ }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([url, o]) => url.includes('/users/2/status') && o?.method === 'PATCH');
      expect(patch).toBeTruthy();
      expect(JSON.parse(patch[1].body)).toEqual({ status: 'SUSPENDIDO' });
    });
  });

  test('eliminar una cuenta pide confirmación antes de llamar a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi([signedInAs('ADMINISTRADOR'), ['/users', 'GET', paged(users)]]);
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<AdminUsersPage />, { route: '/admin/usuarios' });

    const filas = await screen.findAllByRole('row');
    const fila = filas.find((f) => within(f).queryByText('rosa@example.com'));
    await user.click(within(fila).getByRole('button', { name: /Eliminar/ }));

    // Aparece el diálogo, nombrando la cuenta concreta, y todavía no se ha
    // borrado nada.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/rosa@example.com/)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, o]) => o?.method === 'DELETE'),
      'no debe borrarse antes de confirmar'
    ).toBe(false);
  });

  test('un refugio verificado sólo puede suspenderse, no verificarse de nuevo', async () => {
    const shelters = [
      { id: 1, name: 'Refugio Esperanza', city: 'Arequipa', status: 'VERIFICADO', petCount: 7, adoptionCount: 4 },
      { id: 2, name: 'Patitas del Sol', city: 'Cusco', status: 'PENDIENTE', petCount: 0, adoptionCount: 0 }
    ];
    vi.stubGlobal(
      'fetch',
      mockApi([signedInAs('ADMINISTRADOR'), ['/shelters', 'GET', paged(shelters)]])
    );

    renderWithProviders(<AdminSheltersPage />, { route: '/admin/refugios' });

    const filas = await screen.findAllByRole('row');
    const verificado = filas.find((fila) => within(fila).queryByText('Refugio Esperanza'));
    const pendiente = filas.find((fila) => within(fila).queryByText('Patitas del Sol'));

    expect(within(verificado).queryByRole('button', { name: /Verificar/ })).not.toBeInTheDocument();
    expect(within(verificado).getByRole('button', { name: /Suspender/ })).toBeInTheDocument();

    expect(within(pendiente).getByRole('button', { name: /Verificar/ })).toBeInTheDocument();
  });
});
