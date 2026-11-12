interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

/** A native checkbox drawn as a pill. The accessible name is the label prop. */
export function Switch({ label, checked, onChange, disabled, id }: SwitchProps) {
  return (
    <label className="switch">
      <input id={id} type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled}
        onChange={event => onChange(event.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}
