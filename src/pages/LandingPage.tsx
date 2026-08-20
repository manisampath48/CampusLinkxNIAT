import React from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Briefcase, 
  Sparkles, 
  Building2, 
  Search, 
  MessageSquare, 
  CheckCircle2,
  Share2,
  Lock
} from 'lucide-react';
import { CampusCard } from '../components/common/CampusCard';
import { NiatLogo } from '../components/common/NiatLogo';
import { useStorage } from '../hooks/useStorage';

interface LandingPageProps {
  onJoinClick: () => void;
  onExploreClick: () => void;
  onSelectCampus: (campusName: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onJoinClick,
  onExploreClick,
  onSelectCampus
}) => {
  const storage = useStorage();
  const campuses = storage.getCampuses();
  return (
    <div className="space-y-16 pb-12">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 bg-gradient-to-b from-red-900/5 via-neutral-50/50 to-white border-b border-neutral-200/60">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-900 border border-red-200/80 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-2">
            <ShieldCheck className="w-4 h-4 text-red-900" />
            <span>Exclusive Private Network for NIAT Students</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <NiatLogo size="2xl" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-neutral-900 tracking-tight max-w-4xl mx-auto leading-tight">
            CampusLink
          </h1>

          <p className="text-2xl sm:text-3xl font-extrabold text-red-900 mt-2 tracking-tight">
            "One network. Every NIAT student."
          </p>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto mt-4 leading-relaxed font-normal">
            Connect with verified students across NIAT campuses, find project teammates, discover hackathons & internships, and build your professional tech network.
          </p>

          {/* CTA Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onJoinClick}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-red-900 text-white font-extrabold text-sm hover:bg-red-950 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
            >
              <span>JOIN CAMPUSLINK</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-neutral-900 border border-neutral-300 font-extrabold text-sm hover:bg-neutral-50 transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-neutral-500" />
              <span>EXPLORE THE NETWORK</span>
            </button>
          </div>

          {/* Verification Callout */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-neutral-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Student IDs Only
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              Privacy Safeguarded
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-red-900" />
              3 Connected NIAT Campuses
            </span>
          </div>

        </div>
      </section>

      {/* Launch Campuses Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Launch Campuses
          </h2>
          <p className="text-sm text-neutral-500 mt-2 max-w-xl mx-auto">
            Discover students and campus communities across our three founding NIAT partner institutions:
          </p>
        </div>

        {/* Visual Campus Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {campuses.map((campus) => (
            <CampusCard
              key={campus.name}
              campus={campus}
              onSelect={() => onSelectCampus(campus.name)}
            />
          ))}
        </div>

        {/* Inter-Campus Connecting Visual Banner */}
        <div className="mt-10 p-6 rounded-3xl bg-neutral-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Share2 className="w-5 h-5 text-red-400" />
              <span>Cross-Campus Synergy</span>
            </h3>
            <p className="text-xs text-neutral-400 max-w-xl">
              CampusLink bridges student directories and project teams across Annamacharya, NRI, and Chalapathi campuses while respecting individual campus communities.
            </p>
          </div>
          <button
            onClick={onExploreClick}
            className="shrink-0 px-6 py-3 rounded-xl bg-red-900 text-white font-bold text-xs hover:bg-red-800 transition-colors"
          >
            Find Student Teammates
          </button>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Designed for Student Growth
          </h2>
          <p className="text-sm text-neutral-500 mt-2">
            Everything you need to collaborate, learn, and launch your engineering career.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-900 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Campus Directories</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Find peers by Campus, Year (1st-4th), Section, Branch & Skills. Always filterable by campus first.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Project / Team Finder</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Post project vacancies or apply for hackathon teams across all three NIAT campuses.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Opportunity Radar</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Explore curated hackathons, GSoC, tech internships, workshops, and student scholarships.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Direct Messaging</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Connect 1-on-1 with verified peers to coordinate hackathons, peer tutoring, and project builds.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
