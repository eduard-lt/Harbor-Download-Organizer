import { Dialog } from './Dialog';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} title={title} onClose={onCancel} role="alertdialog" dismissible={false}
      footer={<>
        <button type="button" className="btn" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={`btn ${isDestructive ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </>}>
      <div className="dialog-body"><p>{message}</p></div>
    </Dialog>
  );
}
