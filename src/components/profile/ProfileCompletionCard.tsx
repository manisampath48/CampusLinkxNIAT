import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  ChevronRight, 
  Lock, 
  Globe2, 
  ShieldCheck 
} from 'lucide-react';
import { UserProfile } from '../../types';
import { calculateProfileCompletion } from './profileConstants';

interface ProfileCompletionCardProps {
  profile: UserProfile;
  userProjectsCount: number;
  onEditSection: (tabKey: string) => void;
  onToggleVisibility: (newVisibility: 'public' | 'private') => void;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  profile,
  userProjectsCount,
  onEditSection,
  onToggleVisibility
}) => {
  const { percentage, completedItems } = calculateProfileCompletion(profile, userProjectsCount);

  // Map checklist keys to editor tab
  const getTabKeyForChecklist = (key: string) => {
    switch (key) {
      case 'avatar': return 'cover';
      case 'bio': return 'about';
      case 'skills': return 'skills';
      case 'interests': return 'skills';
      case 'github': return 'socials';
      case 'linkedin': return 'socials';
      case 'portfolio': return 'socials';
      case 'projects': return 'projects';
      case 'achievements': return 'achievements';
      case 'hackathons': return 'hackathons';
      default: return 'about';
    }
  };

  const isPublic = profile.visibility !== 'private';

  return (
    <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-5">
      
      {/* Header with percentage */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Profile Completion</span>
          </h3>
          <span className="text-sm font-black text-red-900">{percentage}%</span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200/60">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${
              percentage >= 80 
                ? 'bg-emerald-600' 
                : percentage >= 50 
                  ? 'bg-red-900' 
                  : 'bg-amber-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <p className="text-[11px] text-neutral-500 font-medium mt-2">
          {percentage === 100 
            ? 'Your profile is fully completed and highlighted across CampusLink!'
            : 'Complete your profile to help students and project leads discover your skills.'
          }
        </p>
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5 pt-1 border-t border-neutral-100">
        {completedItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onEditSection(getTabKeyForChecklist(item.key))}
            className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-neutral-300 group-hover:text-red-800 shrink-0 transition-colors" />
              )}
              <span className={`text-xs font-semibold ${item.done ? 'text-neutral-700 line-through opacity-75' : 'text-neutral-900 font-bold'}`}>
                {item.label}
              </span>
            </div>
            {!item.done && (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-900 group-hover:translate-x-0.5 transition-all" />
            )}
          </button>
        ))}
      </div>

      {/* Profile Visibility Toggle */}
      <div className="pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            {isPublic ? (
              <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="text-xs font-bold text-neutral-900">Profile Visibility</span>
          </div>

          <button
            onClick={() => onToggleVisibility(isPublic ? 'private' : 'public')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              isPublic 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
            }`}
          >
            {isPublic ? 'Public to NIAT' : 'Private (Connections Only)'}
          </button>
        </div>
        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
          {isPublic 
            ? 'Visible to verified NIAT students across participating campuses.'
            : 'Only accepted student connections can view your full profile.'
          }
        </p>
      </div>

      {/* Trust & Verification note */}
      <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200/80 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-red-900 shrink-0 mt-0.5" />
        <p className="text-[11px] text-neutral-600 font-medium leading-normal">
          Official academic credentials and student identity are protected and verified by CampusLink administration.
        </p>
      </div>

    </div>
  );
};
