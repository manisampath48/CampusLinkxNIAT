import React, { useState, useEffect } from 'react';
import niatLogoImg from '../../assets/niat-logo.png';
import { useStorage } from '../../hooks/useStorage';

interface NiatLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  alt?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
  '3xl': 'h-32 w-32 text-4xl'
};

export const NiatLogo: React.FC<NiatLogoProps> = ({ 
  size = 'md', 
  className = '',
  alt = 'NIAT'
}) => {
  const storage = useStorage();
  const branding = storage.getBrandingConfig();
  const sizeClass = sizeMap[size] || sizeMap.md;

  const [imageErrorCount, setImageErrorCount] = useState(0);

  const rawPrimaryUrl = branding?.logoUrl?.trim() || '';

  // Reset error count whenever logoUrl changes
  useEffect(() => {
    setImageErrorCount(0);
  }, [rawPrimaryUrl]);

  // Reject local blob or file URLs which only exist in the memory of the creating device
  const isInvalidCrossDeviceUrl = rawPrimaryUrl.startsWith('blob:') || rawPrimaryUrl.startsWith('file:') || (rawPrimaryUrl.startsWith('data:') && rawPrimaryUrl.length > 50000);
  let primaryUrl = isInvalidCrossDeviceUrl ? '' : rawPrimaryUrl;

  // Append logoVersion / timestamp query parameter for automatic cache-busting across devices
  if (primaryUrl && (primaryUrl.startsWith('http://') || primaryUrl.startsWith('https://'))) {
    const cacheKey = branding?.logoVersion || branding?.updatedAt || '';
    if (cacheKey && !primaryUrl.includes('logoVersion=') && !primaryUrl.includes('v=')) {
      const separator = primaryUrl.includes('?') ? '&' : '?';
      primaryUrl = `${primaryUrl}${separator}v=${encodeURIComponent(cacheKey)}`;
    }
  }

  // Build array of candidate URLs in priority order
  const candidateUrls: string[] = [];
  if (primaryUrl && !isInvalidCrossDeviceUrl) {
    candidateUrls.push(primaryUrl);
  }
  if (niatLogoImg && !candidateUrls.includes(niatLogoImg)) {
    candidateUrls.push(niatLogoImg);
  }
  if (!candidateUrls.includes('/niat-logo.png')) {
    candidateUrls.push('/niat-logo.png');
  }
  if (!candidateUrls.includes('/assets/niat-logo.png')) {
    candidateUrls.push('/assets/niat-logo.png');
  }
  if (!candidateUrls.includes('/assets/logo.png')) {
    candidateUrls.push('/assets/logo.png');
  }

  const currentSrc = candidateUrls[imageErrorCount] || null;

  const handleImageError = () => {
    setImageErrorCount(prev => prev + 1);
  };

  // If image fails to load or all URLs are exhausted, render high-res vector SVG badge
  if (!currentSrc || imageErrorCount >= candidateUrls.length) {
    return (
      <div 
        className={`bg-red-900 text-white font-black rounded-xl flex items-center justify-center shrink-0 shadow-xs ring-2 ring-red-900/20 select-none ${sizeClass} ${className}`}
        title="NIAT Logo"
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <svg className="w-1/2 h-1/2 mb-0.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4l7 3.82 7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
          <span className="text-[8px] font-black uppercase tracking-tighter">NIAT</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={`object-contain shrink-0 rounded-xl ${sizeClass} ${className}`}
      onError={handleImageError}
    />
  );
};


