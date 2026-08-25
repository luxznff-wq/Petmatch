import { describe, expect, test, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter, samplePet } from './utils.jsx';
import PetCard from '../components/pets/PetCard.jsx';
import PetGrid from '../components/pets/PetGrid.jsx';
import Badge from '../components/ui/Badge.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';

describe('PetCard', () => {
  test('muestra los datos que exige la especificación §11', () => {
    renderWithRouter(<PetCard pet={samplePet()} />);

    expect(screen.getByRole('heading', { name: 'Luna' })).toBeInTheDocument();
    expect(screen.getByText(/Gato · Hembra · 2 años/)).toBeInTheDocument();
    expect(screen.getByText('Mestiza')).toBeInTheDocument();
    expect(screen.getByText(/Arequipa/)).toBeInTheDocument();
    expect(screen.getByText(/Refugio Esperanza/)).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conocer a Luna/ })).toHaveAttribute(
      'href',
      '/mascotas/1'
    );
    expect(screen.getByAltText('Fotografía de Luna')).toBeInTheDocument();
  });

  test('el botón de favorito refleja e informa su estado', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    const { rerender } = renderWithRouter(
      <PetCard pet={samplePet()} isFavorite={false} onToggleFavorite={onToggle} />
    );

    const button = screen.getByRole('button', { name: /Agregar a Luna a favoritos/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(onToggle).toHaveBeenCalledWith(1);

    rerender(
      <PetCard pet={samplePet()} isFavorite onToggleFavorite={onToggle} />
    );
    expect(
      screen.getByRole('button', { name: /Quitar a Luna de favoritos/ })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('sin manejador de favoritos no se muestra el corazón', () => {
    renderWithRouter(<PetCard pet={samplePet()} />);
    expect(screen.queryByRole('button', { name: /favoritos/ })).not.toBeInTheDocument();
  });

  test('refleja el estado real de la mascota, no siempre "Disponible"', () => {
    renderWithRouter(<PetCard pet={samplePet({ status: 'ADOPTADA' })} />);
    expect(screen.getByText('Adoptada')).toBeInTheDocument();
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();
  });
});

describe('PetGrid', () => {
  test('muestra el estado de carga', () => {
    renderWithRouter(<PetGrid loading />);
    expect(screen.getByRole('status')).toHaveTextContent(/Buscando mascotas/);
  });

  test('muestra el estado vacío cuando no hay resultados', () => {
    renderWithRouter(<PetGrid pets={[]} />);
    expect(screen.getByRole('heading', { name: /No encontramos mascotas/ })).toBeInTheDocument();
  });

  test('renderiza una tarjeta por mascota', () => {
    renderWithRouter(
      <PetGrid
        pets={[samplePet({ id: 1, name: 'Luna' }), samplePet({ id: 2, name: 'Max' })]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Luna' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Max' })).toBeInTheDocument();
  });
});

describe('Badge', () => {
  test('traduce cada estado a su etiqueta en español', () => {
    const { rerender } = renderWithRouter(<Badge status="EN_REVISION" />);
    expect(screen.getByText('En revisión')).toBeInTheDocument();

    rerender(<Badge status="ADOPCION_COMPLETADA" />);
    expect(screen.getByText('Adopción completada')).toBeInTheDocument();

    rerender(<Badge status="NO_DISPONIBLE" />);
    expect(screen.getByText('No disponible')).toBeInTheDocument();
  });

  test('permite texto propio', () => {
    renderWithRouter(<Badge tone="success">Aprobada</Badge>);
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  test('no se muestra con una sola página', () => {
    const { container } = renderWithRouter(
      <Pagination page={1} totalPages={1} onChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('deshabilita anterior en la primera página y siguiente en la última', () => {
    const { rerender } = renderWithRouter(
      <Pagination page={1} totalPages={3} onChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  test('marca la página actual y notifica el cambio', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithRouter(<Pagination page={2} totalPages={5} total={60} onChange={onChange} />);

    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('60 resultados')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'status', header: 'Estado', render: (row) => <Badge status={row.status} /> }
  ];

  test('pinta encabezados y filas', () => {
    renderWithRouter(
      <DataTable
        columns={columns}
        rows={[
          { id: 1, name: 'Luna', status: 'DISPONIBLE' },
          { id: 2, name: 'Max', status: 'ADOPTADA' }
        ]}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3); // encabezado + 2 filas
    expect(within(rows[1]).getByText('Luna')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Adoptada')).toBeInTheDocument();
  });

  test('usa el estado vacío indicado', () => {
    renderWithRouter(
      <DataTable columns={columns} rows={[]} empty={<EmptyState title="Nada aquí" />} />
    );
    expect(screen.getByRole('heading', { name: 'Nada aquí' })).toBeInTheDocument();
  });
});

describe('ErrorMessage', () => {
  test('no renderiza nada sin error', () => {
    const { container } = renderWithRouter(<ErrorMessage error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('muestra el mensaje y permite reintentar', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithRouter(<ErrorMessage error={new Error('La mascota no existe')} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('La mascota no existe');
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});
