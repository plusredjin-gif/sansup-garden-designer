import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  tip?: string;
  onClick?: () => void;
  vertical?: boolean;
};

export default function IconButton({ icon: Icon, label, shortcut, active, disabled, tip, onClick }: Props) {
  const title = tip ?? (shortcut ? `${label} (${shortcut})` : label);
  return (
    <button
      type="button"
      className={`icon-btn ${active ? "active" : ""}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className="icon-label">{label}</span>
    </button>
  );
}
