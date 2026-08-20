import React from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Building, 
  BookOpen, 
  Layers, 
  Lock 
} from 'lucide-react';
import { UserProfile } from '../../types';

interface AcademicIdentityCardProps {
  profile: UserProfile;
}

export const AcademicIdentityCard: React.FC<AcademicIdentityCardProps> = ({ profile }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
      
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-red-900" />
          <span>Academic Identity</span>
        </h3>
        <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
          <Lock className="w-2.5 h-2.5" />
          <span>Official Record</span>
        </span>
      </div>

      <div className="space-y-3 pt-1">
        
        {/* Campus */}
        <div className="flex items-start gap-2.5 text-xs">
          <Building className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Institution</p>
            <p className="font-bold text-neutral-900">{profile.campus}</p>
          </div>
        </div>

        {/* Branch / Course */}
        <div className="flex items-start gap-2.5 text-xs">
          <BookOpen className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Course & Specialization</p>
            <p className="font-bold text-neutral-900">{profile.branch} {profile.course ? `(${profile.course})` : ''}</p>
          </div>
        </div>

        {/* Year & Section */}
        <div className="flex items-start gap-2.5 text-xs">
          <Layers className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Batch & Class Section</p>
            <p className="font-bold text-neutral-900">
              {profile.year} {profile.section ? `• Section ${profile.section}` : ''}
            </p>
          </div>
        </div>

        {/* Verification Status */}
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-neutral-800">NIAT Status</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Verified Student
          </span>
        </div>

      </div>

    </div>
  );
};
