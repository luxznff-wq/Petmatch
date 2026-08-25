import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Elementos que pueden recibir el foco dentro del diálogo. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal accesible.
 *
 * Bloquea el desplazamiento del fondo, cierra con Escape o clic fuera, y
 * **retiene el foco dentro del diálogo**: mientras está abierto, Tab y
 * Shift+Tab recorren en ciclo sus elementos sin escapar al contenido de
 * detrás. Al cerrarse devuelve el foco a donde estaba.
 */
export default function Modal({ open, onClose, title, description, size = 'md', children }) {
  const panelRef = useRef(null);

  /**
   * Elementos enfocables del diálogo, en orden de tabulación.
   *
   * Se descartan los ocultos por atributo. No se usa `offsetParent` ni nada
   * que dependa del cálculo de estilos: además de ser frágil, no existe en
   * entornos sin layout como el de las pruebas.
   */
  const focusables = useCallback(
    () =>
      Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) ?? []).filter(
        (element) => !element.hasAttribute('hidden') && element.ariaHidden !== 'true'
      ),
    []
  );

  useEffect(() => {
    if (!open) return undefined;

    // Se recuerda quién tenía el foco para restaurarlo al cerrar.
    const previouslyFocused = document.activeElement;

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      // El ciclo se cierra a mano: sin esto el foco saltaría al fondo.
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // El foco entra al primer control útil; si no hay ninguno, al panel.
    const [firstFocusable] = focusables();
    (firstFocusable ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose, focusables]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} aria-hidden="true" />
        </button>
        {title && <h2 className="modal-title">{title}</h2>}
        {description && <p className="modal-description">{description}</p>}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
