import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, samplePet } from './utils.jsx';
import ExplorePage from '../pages/ExplorePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';

/** Respuesta HTTP simulada con el sobre de la API. */
const jsonResponse = (data, { status = 200, extra = {} } = {}) => ({
  ok: status < 400,
  status,
  json: async () => (status < 400 ? { success: true, data, ...extra } : { success: false, ...data })
});

const paginated = (items, pagination = {}) =>
  jsonResponse(items, {
    extra: {
      pagination: {
        page: 1,
        limit: 12,
        total: items.length,
        totalPages: 1,
        ...pagination
      }
    }
  });

describe('ExplorePage', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url) => {
      if (url.includes('/shelters')) return paginated([]);
      return paginated([samplePet({ id: 1, name: 'Luna' }), samplePet({ id: 2, name: 'Max' })]);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('carga el listado y muestra el total de resultados', async () => {
    renderWithProviders(<ExplorePage />, { route: '/mascotas' });

    expect(await screen.findByRole('heading', { name: 'Luna' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Max' })).toBeInTheDocument();
    expect(screen.getByText(/2 mascotas coinciden con tu búsqueda/)).toBeInTheDocument();
  });

  test('pide al servidor sólo mascotas disponibles por defecto', async () => {
    renderWithProviders(<ExplorePage />, { route: '/mascotas' });
    await screen.findByRole('heading', { name: 'Luna' });

    const petCall = fetchMock.mock.calls.find(([url]) => url.includes('/pets'));
    expect(petCall[0]).toContain('status=DISPONIBLE');
    expect(petCall[0]).toContain('limit=12');
  });

  test('lee los filtros de la URL y los envía a la API', async () => {
    renderWithProviders(<ExplorePage />, {
      route: '/mascotas?species=Gato&sex=Hembra&vaccinated=true&sort=name-asc'
    });
    await screen.findByRole('heading', { name: 'Luna' });

    const petCall = fetchMock.mock.calls.find(([url]) => url.includes('/pets'));
    expect(petCall[0]).toContain('species=Gato');
    expect(petCall[0]).toContain('sex=Hembra');
    expect(petCall[0]).toContain('vaccinated=true');
    expect(petCall[0]).toContain('sort=name-asc');
  });

  test('el panel de filtros se abre y muestra las características', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExplorePage />, { route: '/mascotas' });
    await screen.findByRole('heading', { name: 'Luna' });

    await user.click(screen.getByRole('button', { name: /Todos los filtros/ }));

    expect(screen.getByLabelText('Especie')).toBeInTheDocument();
    expect(screen.getByLabelText('Tamaño')).toBeInTheDocument();
    expect(screen.getByLabelText('Compatible con niños')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Características' })).toBeInTheDocument();
  });

  test('muestra el error de la API con opción de reintentar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Servicio no disponible' }, { status: 500 }))
    );

    renderWithProviders(<ExplorePage />, { route: '/mascotas' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible');
  });
});

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('envía las credenciales y guarda el token', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        token: 'jwt-de-prueba',
        user: { id: 1, firstName: 'Ana', lastName: 'Pérez', role: 'ADOPTANTE' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<LoginPage />, { route: '/ingresar' });

    await user.type(screen.getByLabelText(/Correo electrónico/), 'ana@example.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'Clave123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(localStorage.getItem('petmatch_token')).toBe('jwt-de-prueba'));

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/auth/login');
    expect(JSON.parse(options.body)).toEqual({
      email: 'ana@example.com',
      password: 'Clave123'
    });
  });

  test('muestra el mensaje de error del servidor', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ message: 'El correo o contraseña son incorrectos' }, { status: 401 })
      )
    );

    renderWithProviders(<LoginPage />, { route: '/ingresar' });

    await user.type(screen.getByLabelText(/Correo electrónico/), 'ana@example.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o contraseña son incorrectos'
    );
  });
});

describe('ProtectedRoute', () => {
  test('redirige al login cuando no hay sesión', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/mi-cuenta" element={<p>Contenido privado</p>} />
        </Route>
        <Route path="/ingresar" element={<p>Pantalla de acceso</p>} />
      </Routes>,
      { route: '/mi-cuenta' }
    );

    expect(await screen.findByText('Pantalla de acceso')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  test('con sesión de otro rol redirige a su propio panel', async () => {
    localStorage.setItem('petmatch_token', 'jwt-de-prueba');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ id: 9, firstName: 'Rosa', lastName: 'Flores', role: 'REFUGIO' })
      )
    );

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
          <Route path="/admin" element={<p>Panel administrativo</p>} />
        </Route>
        <Route path="/refugio" element={<p>Panel del refugio</p>} />
      </Routes>,
      { route: '/admin' }
    );

    expect(await screen.findByText('Panel del refugio')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
