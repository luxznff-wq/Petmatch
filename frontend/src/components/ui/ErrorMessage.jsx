import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button.jsx';

/** Mensaje de error con reintento opcional (§77). */
export default function ErrorMessage({ error, onRetry, title = 'Algo salió mal' }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="error-panel" role="alert">
      <AlertTriangle size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" icon={RotateCw} onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
