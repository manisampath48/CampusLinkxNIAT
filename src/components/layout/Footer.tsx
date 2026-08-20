import React from 'react';
import { Building2, Heart, ShieldCheck } from 'lucide-react';
import { NiatLogo } from '../common/NiatLogo';

export const Footer: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-neutral-200 mt-12 py-10 px-4 sm:px-6 lg:px-8 text-neutral-600 text-xs w-full">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        
        {/* Col 1 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <NiatLogo size="sm" />
            <span className="font-extrabold text-base text-neutral-900 tracking-tight">CampusLink</span>
          </div>
          <p className="text-neutral-500 leading-relaxed">
            Private student networking & project collaboration platform exclusively for NIAT students.
          </p>
          <p className="text-neutral-400 text-[11px]">
            "One network. Every NIAT student."
          </p>
        </div>

        {/* Col 2 */}
        <div>
          <h4 className="font-bold text-neutral-900 mb-3 text-sm">Initial Launch Campuses</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-900" />
              <span>Annamacharya × NIAT (Kadapa)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-900" />
              <span>NRI × NIAT (Vijayawada)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-900" />
              <span>Chalapathi × NIAT (Guntur)</span>
            </li>
          </ul>
        </div>

        {/* Col 3 */}
        <div>
          <h4 className="font-bold text-neutral-900 mb-3 text-sm">Platform Features</h4>
          <ul className="space-y-2">
            <li><button onClick={() => onNavigate?.('campus')} className="hover:text-neutral-900 cursor-pointer">Student Directory & Campus Hub</button></li>
            <li><button onClick={() => onNavigate?.('opportunities')} className="hover:text-neutral-900 cursor-pointer">Projects & Teams</button></li>
            <li><button onClick={() => onNavigate?.('opportunities')} className="hover:text-neutral-900 cursor-pointer">Hackathons & Opportunities</button></li>
            <li><button onClick={() => onNavigate?.('student-hub')} className="hover:text-neutral-900 cursor-pointer">NIAT Student Hub</button></li>
          </ul>
        </div>

        {/* Col 4 */}
        <div className="space-y-3">
          <h4 className="font-bold text-neutral-900 mb-3 text-sm">Security & Verification</h4>
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Approved Student Verification</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Only verified NIAT Student IDs are permitted to register.
            </p>
          </div>
        </div>

      </div>

      <div className="w-full max-w-7xl mx-auto mt-8 pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-400">
        <p>© {new Date().getFullYear()} CampusLink • Designed for NIAT Students.</p>
        <div className="flex items-center gap-1">
          <span>Built with</span>
          <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" />
          <span>for inter-campus collaboration</span>
        </div>
      </div>
    </footer>
  );
};
