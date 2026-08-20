import React from 'react';
import { 
  Building2,
  Sparkles,
  Rocket,
  ArrowRight
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { UserProfile } from '../types';
import { CampusBadge } from '../components/common/Badge';
import { CampusActivityFeed } from '../components/CampusActivityFeed';

interface HomePageProps {
  onNavigateTab: (tab: string, param?: any) => void;
  onViewStudentProfile: (profile: UserProfile) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateTab, onViewStudentProfile }) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-6 lg:gap-8 pb-12 items-start w-full">
      
      {/* Main Feed Column (Expands with browser width) */}
      <div className="min-w-0 space-y-6">
        <CampusActivityFeed
          onNavigateTab={onNavigateTab}
          onViewStudentProfile={onViewStudentProfile}
        />
      </div>

      {/* Right Sidebar: Campus Highlights & Quick Opportunities (Fixed 340px-360px) */}
      <div className="space-y-6 min-w-0">
        
        {/* User Card */}
        {currentUser && (
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#8B1E1E]/20"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                }}
              />
              <div>
                <h3 className="font-extrabold text-[#1A1A1A] text-sm">{currentUser.name}</h3>
                <p className="text-xs text-[#6B6B6B] font-medium">{currentUser.year} • {currentUser.branch}</p>
              </div>
            </div>

            <CampusBadge campus={currentUser.campus} size="sm" />

            <div className="pt-3 border-t border-[#E5E5E5] flex justify-between items-center text-xs font-bold text-[#1A1A1A]">
              <button
                onClick={() => onNavigateTab('connections')}
                className="hover:text-[#8B1E1E] cursor-pointer"
              >
                My Connections ({storage.getConnections().filter(c => c.status === 'accepted').length})
              </button>
              <button
                onClick={() => onNavigateTab('profile')}
                className="text-[#8B1E1E] hover:underline font-bold cursor-pointer"
              >
                View Profile →
              </button>
            </div>
          </div>
        )}

        {/* Quick Student Hub CTA - Premium Featured Card */}
        <div 
          onClick={() => onNavigateTab('student-hub')}
          className="group relative rounded-3xl p-6 overflow-hidden transition-all duration-300 cursor-pointer border border-red-800/40 hover:border-red-600/60 shadow-md hover:shadow-xl hover:shadow-red-950/25 hover:-translate-y-0.5 bg-gradient-to-br from-[#4A0E13] via-[#33080C] to-[#1A0407]"
        >
          {/* Subtle Ambient Radial Glows & Abstract Accents */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-red-400/25 transition-all duration-500" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all duration-500" />
          
          {/* Subtle decorative geometric micro-grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-300 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />

          <div className="relative z-10 space-y-3.5">
            {/* Header Badge & Refined Icon Backplate */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-700/50 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider text-red-200 group-hover:border-red-500/60 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>30-Day Student Showcase</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-800/80 to-red-950/90 border border-red-700/50 flex items-center justify-center text-amber-300 shadow-xs group-hover:scale-105 group-hover:border-amber-400/50 transition-all duration-300">
                <Rocket className="w-4 h-4 text-amber-300" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight group-hover:text-red-100 transition-colors">
                NIAT Student Hub
              </h3>
              <p className="text-xs text-neutral-300/90 leading-relaxed font-normal">
                Showcase your skills and active projects across all 3 NIAT campuses for 30 days to build cross-campus hackathon teams.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-neutral-300">
                3 Campuses
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-neutral-300">
                Active Projects
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-amber-300/90">
                30-Day Window
              </span>
            </div>

            {/* High-Contrast Interactive CTA Button */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateTab('student-hub');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:via-red-600 hover:to-red-700 text-white text-xs font-black transition-all duration-200 cursor-pointer shadow-md shadow-red-950/40 hover:shadow-red-900/50 flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover/btn:rotate-12 transition-transform duration-300" />
                <span>Explore Student Hub</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Campus Directory Filter CTA */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#8B1E1E] font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-[#8B1E1E]" />
            <span>Campus Filtering</span>
          </div>
          <h3 className="text-base font-black text-[#1A1A1A]">Discover Campus Students</h3>
          <p className="text-xs text-[#6B6B6B] leading-relaxed font-medium">
            Filter student directories by Annamacharya, NRI, or Chalapathi campuses to find project partners in your section.
          </p>
          <button
            onClick={() => onNavigateTab('campus')}
            className="w-full py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#701818] text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            Open Student Directory
          </button>
        </div>

        {/* Active Opportunities Widget */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#1A1A1A] text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#8B1E1E]" />
              <span>Trending Opportunities</span>
            </h3>
            <button
              onClick={() => onNavigateTab('opportunities')}
              className="text-xs font-bold text-[#8B1E1E] hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>

          <div className="space-y-3">
            {storage.getOpportunities().slice(0, 3).map((opp) => (
              <div
                key={opp.id}
                onClick={() => onNavigateTab('opportunities')}
                className="p-3 bg-[#F7F7F8] hover:bg-neutral-100 rounded-2xl border border-[#E5E5E5] cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8B1E1E] bg-red-50 px-2 py-0.5 rounded-md">
                    {opp.category}
                  </span>
                  <span className="text-[10px] text-[#6B6B6B]">{opp.location}</span>
                </div>
                <h4 className="text-xs font-bold text-[#1A1A1A] line-clamp-1">{opp.title}</h4>
                <p className="text-[11px] text-[#6B6B6B] font-medium">{opp.organization}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
