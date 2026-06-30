import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  onClick?: () => void;
  colorClass?: string;
  iconColorClass?: string;
  rightIcon?: LucideIcon;
}

export function DashboardCard({
  icon: Icon,
  label,
  value,
  subValue,
  onClick,
  colorClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  iconColorClass: _,
  rightIcon: RightIcon = ChevronRight
}: DashboardCardProps) {
  const content = (
    <>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 text-left">
        <p className={`${value === "" ? "text-base sm:text-lg font-bold text-foreground" : "text-sm text-muted-foreground font-medium"}`}>{label}</p>
        {value !== "" && <p className="text-2xl font-bold">{value}</p>}
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
      {onClick && <RightIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
    </>
  );

  const baseClassName = "bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 transition-all group";

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClassName} hover:border-primary/50 hover:shadow-md cursor-pointer w-full`}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClassName}>
      {content}
    </div>
  );
}
