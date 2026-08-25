/** Indicador de carga con texto accesible. */
export default function LoadingSpinner({ label = 'Cargando…', inline = false }) {
  return (
    <div className={inline ? 'spinner-inline' : 'spinner-block'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span className={inline ? 'sr-only' : 'spinner-label'}>{label}</span>
    </div>
  );
}
