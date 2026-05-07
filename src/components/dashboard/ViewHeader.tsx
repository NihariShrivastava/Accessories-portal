import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface ViewHeaderProps {
  title: string;
  onBack: () => void;
  backLabel?: string;
  icon?: LucideIcon;
  description?: string;
}

export function ViewHeader({
  title,
  onBack,
  backLabel = "Back to Dashboard",
  icon: Icon,
  description
}: ViewHeaderProps) {
  return (
    <div className="space-y-6 mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
