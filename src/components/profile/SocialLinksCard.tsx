import React from 'react';
import { 
  Github, 
  Linkedin, 
  Globe, 
  ExternalLink, 
  Link2, 
  Edit3, 
  Plus 
} from 'lucide-react';
import { UserProfile } from '../../types';
import { formatUrlForDisplay, isValidUrl } from './profileConstants';

interface SocialLinksCardProps {
  profile: UserProfile;
  isSelf: boolean;
  isPreviewMode: boolean;
  onEditSocials: () => void;
}

export const SocialLinksCard: React.FC<SocialLinksCardProps> = ({
  profile,
  isSelf,
  isPreviewMode,
  onEditSocials,
}) => {
  const links: {
    key: string;
    label: string;
    url?: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
  }[] = [
    {
      key: 'github',
      label: 'GitHub',
      url: profile.githubUrl,
      icon: <Github className="w-4 h-4" />,
      colorClass: 'text-neutral-900 group-hover:text-black',
      bgClass: 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800'
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      url: profile.linkedinUrl,
      icon: <Linkedin className="w-4 h-4" />,
      colorClass: 'text-blue-700 group-hover:text-blue-900',
      bgClass: 'bg-blue-50 hover:bg-blue-100/80 text-blue-900 border-blue-200/60'
    },
    {
      key: 'portfolio',
      label: 'Portfolio',
      url: profile.portfolioUrl,
      icon: <Globe className="w-4 h-4" />,
      colorClass: 'text-emerald-700 group-hover:text-emerald-900',
      bgClass: 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200/60'
    },
    {
      key: 'website',
      label: 'Website',
      url: profile.customWebsite,
      icon: <Link2 className="w-4 h-4" />,
      colorClass: 'text-purple-700 group-hover:text-purple-900',
      bgClass: 'bg-purple-50 hover:bg-purple-100/80 text-purple-900 border-purple-200/60'
    }
  ];

  const activeLinks = links.filter(l => Boolean(l.url && l.url.trim().length > 3));

  const formatHref = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
      
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-red-900" />
          <span>Connect With Me</span>
        </h3>

        {isSelf && !isPreviewMode && (
          <button
            onClick={onEditSocials}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
            title="Edit social links"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeLinks.length > 0 ? (
        <div className="space-y-2">
          {activeLinks.map((link) => (
            <a
              key={link.key}
              href={formatHref(link.url!)}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center justify-between p-3 rounded-2xl border border-transparent transition-all group ${link.bgClass}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={link.colorClass}>{link.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{link.label}</p>
                  <p className="text-[10px] opacity-75 truncate max-w-[170px]">
                    {formatUrlForDisplay(link.url)}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 px-2">
          <p className="text-xs text-neutral-400 italic mb-2">No external links connected yet.</p>
          {isSelf && !isPreviewMode && (
            <button
              onClick={onEditSocials}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Connect GitHub / LinkedIn</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
