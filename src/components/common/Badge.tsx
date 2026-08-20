import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { CampusName } from '../../types';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 'sm', showText = true }) => {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className="inline-flex items-center gap-1 bg-red-50 text-red-900 border border-red-200/80 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0">
      <ShieldCheck className={`${iconSizes[size]} text-red-800`} />
      {showText && <span>NIAT Verified</span>}
    </span>
  );
};

export const CampusBadge: React.FC<{ campus: CampusName; size?: 'sm' | 'md' }> = ({ campus, size = 'sm' }) => {
  const safeCampus = typeof campus === 'string' ? campus : '';

  return (
    <span className={`inline-flex items-center gap-1 border font-semibold rounded-full bg-neutral-100 text-neutral-800 border-neutral-200 ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}>
      <Sparkles className="w-3 h-3 text-red-800 opacity-80" />
      <span>{safeCampus || 'Campus'}</span>
    </span>
  );
};
