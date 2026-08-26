import { afterEach, describe, expect, test, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from './utils.jsx';
import App from '../App.jsx';
import Footer from '../components/layout/Footer.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { LayoutDashboard } from 'lucide-react';

/**
 * Los documentos legales tienen que ser alcanzables desde cualquier parte de
 * la aplicación: si sólo se enlazan desde el pie del sitio, quien navega
 * dentro de un panel —que no lleva pie— se queda sin ninguna vía para
 * llegar a ellos.
 */

const apiVacia = () =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) }));

afterEach(() => vi.unstubAllGlobals());

describe('Páginas legales', () => {
  test('la ruta /terminos muestra el documento', async () => {
    vi.stubGlobal('fetch', apiVacia());
    renderWithProviders(<App />, { route: '/terminos' });

    expect(
      await screen.findByRole('heading', { name: /Términos y condiciones/, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Versión 1.0/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Conducta prohibida/ })).toBeInTheDocument();
  });

  test('la ruta /privacidad muestra el documento', async () => {
    vi.stubGlobal('fetch', apiVacia());
    renderWithProviders(<App />, { route: '/privacidad' });

    expect(
      await screen.findByRole('heading', { name: /Política de Privacidad/, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tus derechos/ })).toBeInTheDocument();
    // La tabla de qué datos se tratan y con qué base legal.
    expect(screen.getByRole('columnheader', { name: 'Base legal' })).toBeInTheDocument();
  });

  test('cada documento enlaza al otro', async () => {
    vi.stubGlobal('fetch', apiVacia());
    renderWithProviders(<App />, { route: '/terminos' });

    await screen.findByRole('heading', { name: /Términos y condiciones/, level: 1 });
    expect(
      screen.getAllByRole('link', { name: /Política de Privacidad/ }).length
    ).toBeGreaterThan(0);
  });

  test('muestra los datos del responsable que devuelve la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            version: '1.0',
            contact: {
              organization: 'Refugios Unidos S.A.C.',
              email: 'privacidad@ejemplo.pe',
              address: 'Av. Siempre Viva 742',
              country: 'Perú'
            }
          }
        })
      }))
    );

    renderWithProviders(<App />, { route: '/privacidad' });

    expect(await screen.findByText('Refugios Unidos S.A.C.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacidad@ejemplo.pe' })).toHaveAttribute(
      'href',
      'mailto:privacidad@ejemplo.pe'
    );
  });

  test('el documento sigue siendo legible si la API no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('sin red'))));
    renderWithProviders(<App />, { route: '/terminos' });

    // El texto legal no depende de la API: sólo el bloque de contacto.
    expect(
      await screen.findByRole('heading', { name: /Términos y condiciones/, level: 1 })
    ).toBeInTheDocument();
  });
});

describe('Acceso a los documentos legales', () => {
  test('el pie del sitio enlaza a ambos', () => {
    renderWithProviders(<Footer />);

    const pie = screen.getByRole('contentinfo');
    expect(within(pie).getByRole('link', { name: /Términos y condiciones/ })).toHaveAttribute(
      'href',
      '/terminos'
    );
    expect(within(pie).getByRole('link', { name: /Privacidad/ })).toHaveAttribute(
      'href',
      '/privacidad'
    );
  });

  test('los paneles también los enlazan, porque no llevan pie', () => {
    vi.stubGlobal('fetch', apiVacia());

    renderWithProviders(
      <DashboardLayout
        title="Adoptante"
        links={[{ to: '/mi-cuenta', label: 'Resumen', icon: LayoutDashboard, end: true }]}
      />,
      { route: '/mi-cuenta' }
    );

    // No hay pie de sitio dentro del panel: los enlaces deben estar en la
    // propia barra lateral.
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();

    const legales = screen.getByRole('navigation', { name: 'Documentos legales' });
    expect(within(legales).getByRole('link', { name: 'Términos' })).toHaveAttribute(
      'href',
      '/terminos'
    );
    expect(within(legales).getByRole('link', { name: 'Privacidad' })).toHaveAttribute(
      'href',
      '/privacidad'
    );
  });

  test('el registro enlaza a ambos junto a las casillas de consentimiento', async () => {
    vi.stubGlobal('fetch', apiVacia());
    renderWithProviders(<App />, { route: '/registro' });

    // Se acota al bloque del formulario: el pie del sitio también los enlaza.
    const consentimiento = (
      await screen.findByRole('checkbox', { name: /acepto los/i })
    ).closest('fieldset');

    expect(within(consentimiento).getByRole('link', { name: /Términos y condiciones/ })).toHaveAttribute(
      'href',
      '/terminos'
    );
    expect(within(consentimiento).getByRole('link', { name: /Política de Privacidad/ })).toHaveAttribute(
      'href',
      '/privacidad'
    );

    // Se abren en otra pestaña para no perder lo ya escrito en el formulario.
    expect(within(consentimiento).getByRole('link', { name: /Términos y condiciones/ })).toHaveAttribute(
      'target',
      '_blank'
    );
  });
});
