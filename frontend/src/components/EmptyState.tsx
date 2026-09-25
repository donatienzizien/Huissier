import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-brass-50 flex items-center justify-center mb-4">
        <Icon size={22} className="text-brass-600" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-lg text-navy-900">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1.5 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 bg-navy-700 hover:bg-navy-800 transition-colors text-white text-sm font-medium rounded-md px-4 py-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
