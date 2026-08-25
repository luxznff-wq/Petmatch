import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

/** Estado vacío con acción sugerida. */
export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="empty-state">
      <Icon size={32} aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <Button variant="secondary" to={action.to} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
