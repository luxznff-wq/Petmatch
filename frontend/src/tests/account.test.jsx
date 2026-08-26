import { afterEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from './utils.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';

const jsonResponse = (data, { status = 200 } = {}) => ({
  ok: status < 400,
  status,
  json: async () => (status < 400 ? { success: true, data } : { success: false, ...data })
});

describe('Registro con aceptación legal', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('muestra ambos documentos enlazados', () => {
    renderWithProviders(<RegisterPage />, { route: '/registro' });

    expect(screen.getByRole('link', { name: /Términos y condiciones/ })).toHaveAttribute(
      'href',
      '/terminos'
    );
    expect(screen.getByRole('link', { name: /Política de Privacidad/ })).toHaveAttribute(
      'href',
      '/privacidad'
    );
  });

  test('las casillas empiezan desmarcadas', () => {
    renderWithProviders(<RegisterPage />, { route: '/registro' });

    // El consentimiento debe ser un acto afirmativo: nada premarcado.
    expect(screen.getByRole('checkbox', { name: /acepto los/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /He leído la/i })).not.toBeChecked();
  });

  test('envía la aceptación al servidor', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ token: 'jwt', user: { id: 1, firstName: 'Ana', role: 'ADOPTANTE' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<RegisterPage />, { route: '/registro' });

    await user.type(screen.getByLabelText(/^Nombre/), 'Ana');
    await user.type(screen.getByLabelText(/Apellidos/), 'Pérez');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'ana@example.com');
    await user.type(screen.getByLabelText(/Ciudad/), 'Lima');
    await user.type(screen.getByLabelText(/Contraseña/), 'Clave123');
    await user.click(screen.getByRole('checkbox', { name: /acepto los/i }));
    await user.click(screen.getByRole('checkbox', { name: /He leído la/i }));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.acceptedTerms).toBe(true);
    expect(body.acceptedPrivacy).toBe(true);
  });
});

describe('Recuperación de contraseña', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('confirma el envío sin revelar si el correo existe', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ sent: true })));

    renderWithProviders(<ForgotPasswordPage />, { route: '/recuperar' });

    await user.type(screen.getByLabelText(/Correo electrónico/), 'quien@example.com');
    await user.click(screen.getByRole('button', { name: /Enviarme el enlace/ }));

    expect(await screen.findByRole('heading', { name: /Revisa tu correo/ })).toBeInTheDocument();
    expect(screen.getByText(/Si esa dirección corresponde a una cuenta/)).toBeInTheDocument();
  });

  test('avisa si falta el token en el enlace', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/restablecer' });
    expect(screen.getByRole('heading', { name: /Falta el enlace/ })).toBeInTheDocument();
  });

  test('comprueba que ambas contraseñas coinciden antes de gastar el enlace', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse({ updated: true }));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<ResetPasswordPage />, {
      route: `/restablecer?token=${'t'.repeat(40)}`
    });

    await user.type(screen.getByLabelText(/Nueva contraseña/), 'ClaveNueva9');
    await user.type(screen.getByLabelText(/Repite la contraseña/), 'Distinta9');
    await user.click(screen.getByRole('button', { name: /Guardar contraseña/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('no coinciden');
    // El enlace es de un solo uso: no debe consumirse por un error de tecleo.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('envía el token y la contraseña nueva cuando todo es correcto', async () => {
    const user = userEvent.setup();
    const token = 't'.repeat(40);
    const fetchMock = vi.fn(async () => jsonResponse({ updated: true }));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/restablecer" element={<ResetPasswordPage />} />
        <Route path="/ingresar" element={<p>Pantalla de acceso</p>} />
      </Routes>,
      { route: `/restablecer?token=${token}` }
    );

    await user.type(screen.getByLabelText(/Nueva contraseña/), 'ClaveNueva9');
    await user.type(screen.getByLabelText(/Repite la contraseña/), 'ClaveNueva9');
    await user.click(screen.getByRole('button', { name: /Guardar contraseña/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/account/reset-password');
    expect(JSON.parse(options.body)).toEqual({ token, newPassword: 'ClaveNueva9' });

    // Tras el cambio, lleva al inicio de sesión.
    expect(await screen.findByText('Pantalla de acceso')).toBeInTheDocument();
  });
});
