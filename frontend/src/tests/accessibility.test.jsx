import { describe, expect, test, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from './utils.jsx';
import Modal from '../components/ui/Modal.jsx';
import ErrorBoundary from '../components/layout/ErrorBoundary.jsx';

describe('Modal', () => {
  const Contenido = () => (
    <>
      <button type="button">Primero</button>
      <input aria-label="Campo" />
      <button type="button">Último</button>
    </>
  );

  test('no renderiza nada mientras está cerrado', () => {
    renderWithRouter(
      <Modal open={false} onClose={vi.fn()} title="Oculto">
        <Contenido />
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('se anuncia como diálogo modal accesible', () => {
    renderWithRouter(
      <Modal open onClose={vi.fn()} title="Solicitud de adopción" description="Completa el formulario">
        <Contenido />
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Solicitud de adopción');
    expect(screen.getByText('Completa el formulario')).toBeInTheDocument();
  });

  test('mueve el foco al primer control al abrirse', () => {
    renderWithRouter(
      <Modal open onClose={vi.fn()} title="Diálogo">
        <Contenido />
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  });

  test('el foco no se escapa del diálogo al tabular', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <button type="button">Fondo</button>
        <Modal open onClose={vi.fn()} title="Diálogo">
          <Contenido />
        </Modal>
      </>
    );

    const dialog = screen.getByRole('dialog');
    const ultimo = screen.getByRole('button', { name: 'Último' });
    const cerrar = screen.getByRole('button', { name: 'Cerrar' });

    // Desde el último elemento, Tab vuelve al primero en lugar de salir.
    ultimo.focus();
    await user.tab();
    expect(cerrar).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement);

    // Y Shift+Tab desde el primero salta al último.
    await user.tab({ shift: true });
    expect(ultimo).toHaveFocus();

    // En ningún momento el foco llegó al botón del fondo.
    expect(screen.getByRole('button', { name: 'Fondo' })).not.toHaveFocus();
  });

  test('cierra con Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(
      <Modal open onClose={onClose} title="Diálogo">
        <Contenido />
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('bloquea el desplazamiento del fondo mientras está abierto', () => {
    const { unmount } = renderWithRouter(
      <Modal open onClose={vi.fn()} title="Diálogo">
        <Contenido />
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

describe('ErrorBoundary', () => {
  /** Componente que revienta durante el render. */
  const Explota = () => {
    throw new Error('Fallo simulado de render');
  };

  test('muestra la pantalla de error en vez de dejarla en blanco', () => {
    // React registra el error en consola aunque se capture: se silencia para
    // no ensuciar la salida de las pruebas.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithRouter(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Algo se rompió/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toBeInTheDocument();
    expect(screen.getByText('Fallo simulado de render')).toBeInTheDocument();

    consoleError.mockRestore();
  });

  test('deja pasar el contenido cuando no hay error', () => {
    renderWithRouter(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Todo bien')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
