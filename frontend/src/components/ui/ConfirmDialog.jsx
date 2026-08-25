import Modal from './Modal.jsx';
import Button from './Button.jsx';

/** Confirmación para acciones destructivas o irreversibles. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
