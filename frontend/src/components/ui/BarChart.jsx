/**
 * Gráfico de barras horizontales para los reportes (§44, §50).
 *
 * Se dibuja con CSS en lugar de con una librería externa: los datos son
 * agrupaciones pequeñas y así el paquete final no crece.
 */
export default function BarChart({ data = [], emptyText = 'Sin datos para mostrar.' }) {
  if (data.length === 0) return <p className="chart-empty">{emptyText}</p>;

  const max = Math.max(...data.map((bucket) => bucket.total), 1);

  return (
    <ul className="bar-chart">
      {data.map((bucket) => (
        <li key={bucket.label}>
          <span className="bar-chart-label">{bucket.label}</span>
          <span className="bar-chart-track">
            <span
              className="bar-chart-fill"
              style={{ width: `${Math.round((bucket.total / max) * 100)}%` }}
            />
          </span>
          <span className="bar-chart-value">{bucket.total}</span>
        </li>
      ))}
    </ul>
  );
}
