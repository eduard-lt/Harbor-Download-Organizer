import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  closeLabel?: string;
  role?: 'dialog' | 'alertdialog';
  /** Show the close (X) button in the header. */
  dismissible?: boolean;
}

/**
 * Shared modal frame: solid raised panel over a light scrim, focus trapped.
 * Portaled to <body>: the frosted sheet's backdrop-filter would otherwise become
 * the containing block for the fixed scrim and clip it to the sheet.
 */
export function Dialog({ open, title, onClose, children, footer, wide, closeLabel = 'Close', role = 'dialog', dismissible = true }: DialogProps) {
  const ref = useModalFocus(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <div className="scrim" onMouseDown={event => { if (event.target === event.currentTarget && dismissible) onClose(); }}>
      <div ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''}`} role={role} aria-modal="true"
        aria-labelledby={`${id}-title`} tabIndex={-1}>
        <div className="dialog-head">
          <h2 id={`${id}-title`}>{title}</h2>
          {dismissible && (
            <button type="button" className="icon-btn" aria-label={closeLabel} onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
