import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { UserProfile } from '../../types';
import { VerifiedBadge, CampusBadge } from '../common/Badge';

interface ShareProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ profile, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Clean shareable student identity URL
  const shareableUrl = `${window.location.origin}/?tab=profile&student=${encodeURIComponent(profile.uid)}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareableUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy profile URL:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name} - CampusLink NIAT Student Profile`,
          text: `Connect with ${profile.name} (${profile.branch}, ${profile.year}) on CampusLink.`,
          url: shareableUrl
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-red-900" />
            <h3 className="text-base font-black text-neutral-900">Share Student Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Visual Digital Student Card Preview */}
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-red-950 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-red-800/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black tracking-widest text-red-300 uppercase">
                CampusLink • NIAT
              </span>
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Verified</span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-full ring-2 ring-white/30 bg-neutral-800 overflow-hidden flex items-center justify-center font-black text-sm">
                {profile.avatar && !profile.avatar.includes('ui-avatars.com') ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white tracking-tight">{profile.name}</h4>
                <p className="text-[11px] text-neutral-300 font-medium">
                  {profile.year} • {profile.branch} {profile.section ? `(${profile.section})` : ''}
                </p>
                <p className="text-[10px] text-red-200/80 font-bold mt-0.5">{profile.campus}</p>
              </div>
            </div>

            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-white/10 relative z-10">
                {profile.skills.slice(0, 4).map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-white/10 rounded-lg text-[10px] font-semibold text-neutral-200">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Link Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700">Internal Profile Link</label>
            <div className="flex items-center gap-2 bg-neutral-50 p-2 rounded-2xl border border-neutral-200">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-transparent text-xs text-neutral-700 font-mono px-2 outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-red-900 hover:bg-red-950 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
              Only authenticated NIAT students can access full student profiles within the network.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            Done
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to Apps</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
