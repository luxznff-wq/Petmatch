import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * Tabla de datos reutilizable por los paneles de refugio y administración.
 *
 * `columns` describe cada columna con `{ key, header, render?, className? }`.
 * En pantallas estrechas cada celda muestra su encabezado mediante
 * `data-label`, de modo que la tabla se lee como una lista de tarjetas.
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  loading = false,
  empty,
  caption
}) {
  if (loading) return <LoadingSpinner label="Cargando datos…" />;
  if (!rows || rows.length === 0) {
    return empty ?? <EmptyState title="Sin resultados" description="No hay datos para mostrar." />;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.header} className={column.className}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
