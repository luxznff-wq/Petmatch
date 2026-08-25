import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

/**
 * Envuelve el resultado de `render` para que `rerender` vuelva a aplicar los
 * mismos proveedores. Sin esto, un `rerender` dejaría al componente fuera del
 * router y fallaría cualquier <Link>.
 */
function withWrapper(result, wrap) {
  return { ...result, rerender: (ui) => result.rerender(wrap(ui)) };
}

/** Renderiza un componente con router y proveedores, como en la aplicación real. */
export function renderWithProviders(ui, { route = '/' } = {}) {
  const wrap = (element) => (
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ToastProvider>{element}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
  return withWrapper(render(wrap(ui)), wrap);
}

/** Renderiza sólo con router: para componentes de presentación. */
export function renderWithRouter(ui, { route = '/' } = {}) {
  const wrap = (element) => <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>;
  return withWrapper(render(wrap(ui)), wrap);
}

/** Mascota de ejemplo con la forma exacta que devuelve la API. */
export const samplePet = (overrides = {}) => ({
  id: 1,
  shelterId: 3,
  shelterName: 'Refugio Esperanza',
  name: 'Luna',
  species: 'Gato',
  breed: 'Mestiza',
  sex: 'Hembra',
  size: 'Pequeño',
  ageGroup: 'Joven',
  ageLabel: '2 años',
  city: 'Arequipa',
  status: 'DISPONIBLE',
  image: 'https://example.com/luna.jpg',
  attributes: { vaccinated: true, sociable: true },
  tags: ['Vacunado', 'Sociable'],
  ...overrides
});
