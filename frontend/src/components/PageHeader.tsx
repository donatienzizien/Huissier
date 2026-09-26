import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  accent?: 'navy' | 'brass' | 'wine' | 'gold';
  action?: ReactNode;
}

const ACCENTS = {
  navy: {
    badge: 'bg-white/70',
    icon: 'text-navy-700',
    panel: 'bg-gradient-to-br from-navy-50 via-navy-50 to-brass-50 border-navy-100',
  },
  brass: {
    badge: 'bg-white/70',
    icon: 'text-brass-600',
    panel: 'bg-gradient-to-br from-brass-50 via-brass-50 to-navy-50 border-brass-100',
  },
  wine: {
    badge: 'bg-white/70',
    icon: 'text-wine-600',
    panel: 'bg-gradient-to-br from-wine-50 via-wine-50 to-brass-50 border-wine-100',
  },
  gold: {
    badge: 'bg-white/70',
    icon: 'text-gold-700',
    panel: 'bg-gradient-to-br from-gold-50 via-gold-50 to-brass-50 border-gold-100',
  },
};

export default function PageHeader({ icon: Icon, title, subtitle, accent = 'navy', action }: Props) {
  const colors = ACCENTS[accent];
  return (
    <div className={`flex items-start justify-between flex-wrap gap-4 mb-7 rounded-xl border ${colors.panel} px-6 py-5`}>
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl ${colors.badge} backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon size={19} className={colors.icon} strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-navy-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-navy-500/80 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
