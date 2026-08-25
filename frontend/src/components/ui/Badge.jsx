import { statusLabel, statusTone } from '../../utils/format.js';

/**
 * Etiqueta de estado. Si se pasa `status`, deriva texto y color del catálogo
 * compartido para que un mismo estado se vea igual en toda la aplicación.
 */
export default function Badge({ status, tone, children, className = '' }) {
  const resolvedTone = tone ?? (status ? statusTone(status) : 'neutral');
  return (
    <span className={`badge badge-${resolvedTone} ${className}`}>
      {children ?? statusLabel(status)}
    </span>
  );
}
