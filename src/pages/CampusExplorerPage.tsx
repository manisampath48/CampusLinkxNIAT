import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Search, 
  Filter, 
  UserPlus, 
  Check, 
  MessageSquare, 
  X, 
  Sparkles,
  Compass,
  Briefcase
} from 'lucide-react';
import { CampusName, UserProfile } from '../types';
import { useStorage } from '../hooks/useStorage';
import { VerifiedBadge, CampusBadge } from '../components/common/Badge';

interface CampusExplorerPageProps {
  initialCampus?: CampusName | null;
  onViewStudentProfile: (profile: UserProfile) => void;
  onOpenMessage: (otherUser: UserProfile) => void;
}

export const CampusExplorerPage: React.FC<CampusExplorerPageProps> = ({
  initialCampus = null,
  onViewStudentProfile,
  onOpenMessage
}) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const profiles = storage.getProfiles();
  const campuses = storage.getCampuses();

  // Active sub-tab inside Campus Hub
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'directory' | 'collaborators'>(
    initialCampus ? 'directory' : 'overview'
  );

  // Selected campus filter
  const [selectedCampus, setSelectedCampus] = useState<CampusName | null>(
    initialCampus || 'Annamacharya × NIAT'
  );

  // Update selected campus if prop changes
  useEffect(() => {
    if (initialCampus) {
      setSelectedCampus(initialCampus);
      setActiveSubTab('directory');
    }
  }, [initialCampus]);

  // Secondary Directory Filters
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collaborator Skill Filter
  const [selectedSkill, setSelectedSkill] = useState<string>('All');

  // Filtered students for Directory
  const filteredStudents = storage.filterStudents(
    selectedCampus,
    yearFilter,
    sectionFilter,
    branchFilter,
    searchQuery
  );

  const campusesList: CampusName[] = [
    "Annamacharya × NIAT",
    "NRI × NIAT",
    "Chalapathi × NIAT"
  ];

  const activeCampusData = campuses.find(c => c.name === (selectedCampus || 'Annamacharya × NIAT')) || campuses[0];
  const campusStudents = profiles.filter(p => p.campus === (selectedCampus || 'Annamacharya × NIAT'));

  // Popular skills list for collaborator finder
  const popularSkills = ['All', 'React', 'TypeScript', 'Node.js', 'Python', 'UI/UX', 'AI/ML', 'Java', 'Tailwind', 'Flutter', 'Data Science'];

  const collaboratorStudents = profiles.filter(p => {
    const matchesCampus = !selectedCampus || p.campus === selectedCampus;
    const matchesSkill = selectedSkill === 'All' || p.skills.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase()));
    return matchesCampus && matchesSkill;
  });

  const handleClearFilters = () => {
    setYearFilter('All');
    setSectionFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
  };

  const handleSelectCampusAndSwitchToDirectory = (campus: CampusName) => {
    setSelectedCampus(campus);
    setActiveSubTab('directory');
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header & Sub-Navigation Tabs */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 border border-red-200 text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus Hub & Peer Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Campus Hub
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
              Explore active NIAT launch campuses, connect with verified students, and find project collaborators across all campuses.
            </p>
          </div>

          {/* Quick Active Campus Tag */}
          {selectedCampus && (
            <div className="shrink-0 flex items-center gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <Building2 className="w-4 h-4 text-red-900 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] text-neutral-400 font-bold uppercase">Active Campus</p>
                <p className="text-xs font-extrabold text-neutral-900">{selectedCampus}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sub-Tab Navigation Controls */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Campus Overview</span>
          </button>

          <button
            onClick={() => setActiveSubTab('directory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'directory'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Discover Students & Directory</span>
            <span className="bg-red-950 text-white text-[10px] px-1.5 py-0.5 rounded-md font-extrabold">
              {profiles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('collaborators')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'collaborators'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Find Collaborators</span>
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: CAMPUS OVERVIEW ==================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in">
          
          {/* Campus Selector Buttons */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Select Campus to Inspect Details & Directory:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {campuses.map((c) => {
                const isSelected = c.name === selectedCampus;
                return (
                  <button
                    key={c.name}
                    onClick={() => setSelectedCampus(c.name)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/10'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className={`w-4 h-4 ${isSelected ? 'text-red-400' : 'text-neutral-500'}`} />
                      <span className="font-extrabold text-xs">{c.name}</span>
                    </div>
                    <p className={`text-[11px] ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {c.location}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Campus Detail Banner */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="h-52 relative p-6 flex flex-col justify-end text-white overflow-hidden bg-neutral-900">
              {activeCampusData?.image && (
                <img
                  src={activeCampusData.image}
                  alt={activeCampusData.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 transition-all duration-500 hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200";
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-transparent" />
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
                <div>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest bg-red-950/80 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-red-800/40">
                    Partner Campus Hub
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black mt-1">{activeCampusData.name}</h2>
                  <p className="text-xs text-neutral-300 flex items-center gap-1 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{activeCampusData.location}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleSelectCampusAndSwitchToDirectory(selectedCampus || 'Annamacharya × NIAT')}
                  className="px-5 py-2.5 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md self-start sm:self-auto cursor-pointer transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Browse Student Directory →</span>
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Active Verified Students</span>
                <p className="text-2xl font-black text-neutral-900">{campusStudents.length} Students</p>
                <p className="text-xs text-neutral-500">Registered on CampusLink</p>
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Featured Programs</span>
                <p className="text-sm font-bold text-neutral-900">{activeCampusData.highlights?.join(' • ') || "CSE • AI & ML • Data Science"}</p>
                <p className="text-xs text-neutral-500">Engineering Streams</p>
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Verification Status</span>
                <p className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Database Active</span>
                </p>
                <p className="text-xs text-neutral-500">Student ID Verification Online</p>
              </div>
            </div>
          </div>

          {/* Featured Students in this Campus */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-neutral-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-red-900" />
                <span>Featured Students at {selectedCampus}</span>
              </h3>
              <button
                onClick={() => setActiveSubTab('directory')}
                className="text-xs font-bold text-red-900 hover:underline flex items-center gap-1"
              >
                <span>View Full Directory</span>
                <span>→</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campusStudents.map((st) => (
                <div
                  key={st.uid}
                  onClick={() => onViewStudentProfile(st)}
                  className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-white hover:shadow-md cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={st.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                      alt={st.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900">{st.name}</h4>
                      <p className="text-[11px] text-neutral-500">{st.year} • {st.branch}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {st.skills.slice(0, 3).map(sk => (
                      <span key={sk} className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md font-semibold">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: DISCOVER STUDENTS & DIRECTORY ==================== */}
      {activeSubTab === 'directory' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Controls Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
            
            {/* Selected Campus Selector Header */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                1. Select Campus Filter:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => setSelectedCampus(null)}
                  className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedCampus === null
                      ? 'bg-red-900 text-white border-red-900 shadow-md'
                      : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-4 h-4 ${selectedCampus === null ? 'text-red-200' : 'text-neutral-500'}`} />
                    <span>All Campuses</span>
                  </div>
                  {selectedCampus === null && <Check className="w-4 h-4 text-white" />}
                </button>

                {campusesList.map((campus) => {
                  const isSelected = selectedCampus === campus;
                  return (
                    <button
                      key={campus}
                      onClick={() => setSelectedCampus(campus)}
                      className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-red-900 text-white border-red-900 shadow-md ring-2 ring-red-900/10'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-red-200' : 'text-neutral-500'}`} />
                        <span className="truncate">{campus}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary Filters */}
            <div className="pt-4 border-t border-neutral-100 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-red-900" />
                  <span>2. Refine Search Filters:</span>
                </label>

                {(yearFilter !== 'All' || sectionFilter !== 'All' || branchFilter !== 'All' || searchQuery) && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-semibold text-red-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Year */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1">Year of Study</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="All">All Years</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1">Section</label>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1">Branch / Stream</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="All">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="AI & ML">AI & ML</option>
                    <option value="Data Science">Data Science</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                  </select>
                </div>

                {/* Search Query */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1">Search Name or Skill</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Ananya, React, Python..."
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Directory Results */}
          <div className="space-y-4">
            
            {/* Status Bar */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-neutral-900">
                  {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'} found
                </span>
                <span className="text-xs text-neutral-500">
                  {selectedCampus ? (
                    <>in <strong className="text-neutral-900">{selectedCampus}</strong></>
                  ) : (
                    <>across <strong className="text-neutral-900">All Campuses</strong></>
                  )}
                  {yearFilter !== 'All' && ` • ${yearFilter}`}
                  {sectionFilter !== 'All' && ` • Sec ${sectionFilter}`}
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                Verified Records Only
              </span>
            </div>

            {/* Cards Grid */}
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
                <p className="text-sm font-bold text-neutral-800">No students found matching these filters.</p>
                <p className="text-xs text-neutral-500">Try resetting the year/section filters or searching another keyword.</p>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student) => {
                  const connState = storage.getConnectionState(student.uid);
                  const isSelf = currentUser?.uid === student.uid;

                  return (
                    <div
                      key={student.uid}
                      className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        
                        {/* Top Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={student.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                              alt={student.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-100 shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3
                                  onClick={() => onViewStudentProfile(student)}
                                  className="text-base font-bold text-neutral-900 hover:text-red-900 cursor-pointer"
                                >
                                  {student.name}
                                </h3>
                                <VerifiedBadge size="sm" showText={false} />
                              </div>
                              <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                                {student.year} • Sec {student.section} ({student.branch})
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Campus Badge */}
                        <CampusBadge campus={student.campus} size="sm" />

                        {/* Bio */}
                        <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                          {student.bio || "NIAT student collaborating on web development & engineering projects."}
                        </p>

                        {/* Skills Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {student.skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-[11px] font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {student.skills.length > 4 && (
                            <span className="text-[10px] text-neutral-400 font-semibold self-center">
                              +{student.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onViewStudentProfile(student)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>

                        {!isSelf && (
                          <div className="flex items-center gap-2">
                            {connState === 'none' && (
                              <button
                                onClick={() => storage.sendConnectionRequest(student.uid)}
                                className="px-3 py-1.5 rounded-xl bg-red-900 hover:bg-red-950 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Connect</span>
                              </button>
                            )}

                            {connState === 'pending_sent' && (
                              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                Request Sent
                              </span>
                            )}

                            {connState === 'pending_received' && (
                              <button
                                onClick={() => storage.acceptConnectionRequest(student.uid)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                            )}

                            {connState === 'accepted' && (
                              <button
                                onClick={() => onOpenMessage(student)}
                                className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Message</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: FIND COLLABORATORS ==================== */}
      {activeSubTab === 'collaborators' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Find Project Partners by Skillset</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Filter verified students ready to collaborate on hackathons, web apps, and team projects.
                </p>
              </div>

              {selectedCampus && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700">
                  {selectedCampus}
                </span>
              )}
            </div>

            {/* Skill tags selector */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
                Filter Skill:
              </span>
              {popularSkills.map((sk) => {
                const isActive = selectedSkill === sk;
                return (
                  <button
                    key={sk}
                    onClick={() => setSelectedSkill(sk)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collaborator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaboratorStudents.map((st) => {
              const connState = storage.getConnectionState(st.uid);
              const isSelf = currentUser?.uid === st.uid;

              return (
                <div
                  key={st.uid}
                  className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={st.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                        alt={st.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
                      <div>
                        <h4
                          onClick={() => onViewStudentProfile(st)}
                          className="font-bold text-sm text-neutral-900 hover:text-red-900 cursor-pointer"
                        >
                          {st.name}
                        </h4>
                        <p className="text-xs text-neutral-500">{st.year} • {st.branch}</p>
                      </div>
                    </div>

                    <CampusBadge campus={st.campus} size="sm" />

                    <div className="flex flex-wrap gap-1.5">
                      {st.skills.map((sk) => (
                        <span
                          key={sk}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            selectedSkill !== 'All' && sk.toLowerCase().includes(selectedSkill.toLowerCase())
                              ? 'bg-red-100 text-red-900 border border-red-200'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => onViewStudentProfile(st)}
                      className="text-xs font-bold text-neutral-700 hover:text-neutral-900"
                    >
                      View Profile
                    </button>

                    {!isSelf && (
                      <div>
                        {connState === 'none' && (
                          <button
                            onClick={() => storage.sendConnectionRequest(st.uid)}
                            className="px-3 py-1.5 rounded-xl bg-red-900 text-white text-xs font-bold hover:bg-red-950 flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Connect</span>
                          </button>
                        )}
                        {connState === 'accepted' && (
                          <button
                            onClick={() => onOpenMessage(st)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Message</span>
                          </button>
                        )}
                        {connState === 'pending_sent' && (
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                            Request Sent
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
