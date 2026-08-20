import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Building2, 
  UserPlus, 
  Filter, 
  Clock, 
  Check, 
  Plus, 
  Globe2, 
  Users, 
  Layers, 
  Rocket, 
  Award, 
  MessageSquare,
  X,
  Bookmark,
  Heart,
  Eye,
  Video
} from 'lucide-react';
import { CampusName, ShowcaseCategory, StudentShowcase, UserProfile } from '../types';
import { storage } from '../services/storage';
import { ShowcaseCard } from '../components/studentHub/ShowcaseCard';
import { ShowcaseDetailModal } from '../components/studentHub/ShowcaseDetailModal';
import { CreateShowcaseModal } from '../components/studentHub/CreateShowcaseModal';

interface StudentHubPageProps {
  currentUser: UserProfile | null;
  onViewProfile?: (userId: string) => void;
  onNavigateToMessages?: (userId: string) => void;
}

const CATEGORIES: ('All' | ShowcaseCategory)[] = [
  'All',
  'Web Application',
  'Mobile Application',
  'AI / ML',
  'Generative AI',
  'Automation',
  'Hackathon',
  'Developer Tool',
  'Other'
];

export const StudentHubPage: React.FC<StudentHubPageProps> = ({
  currentUser,
  onViewProfile,
  onNavigateToMessages
}) => {
  // Filter States
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ShowcaseCategory>('All');
  const [selectedCampus, setSelectedCampus] = useState<string>('All');
  const [lookingForOnly, setLookingForOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [myOnly, setMyOnly] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'views' | 'expiring'>('recent');

  // Pagination state
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Selected Showcase for detail modal
  const [selectedShowcase, setSelectedShowcase] = useState<StudentShowcase | null>(null);

  // Create / Edit modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingShowcase, setEditingShowcase] = useState<StudentShowcase | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State tracker for reactive updates on like/save
  const [version, setVersion] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch all showcases from storage (including expired if requested)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allShowcases = useMemo(() => {
    return storage.getStudentShowcases(activeTab === 'archived');
  }, [activeTab, version]);

  // User's own showcase if logged in
  const userActiveShowcase = currentUser ? storage.getUserActiveShowcase(currentUser.uid) : undefined;

  // Filter & Sort Logic
  const filteredShowcases = useMemo(() => {
    const now = Date.now();
    let result = allShowcases.filter(sc => {
      if (!sc) return false;

      // Filter by active vs archived status
      const isExpired = sc.status === 'expired' || new Date(sc.expiresAt).getTime() <= now;
      if (activeTab === 'active' && isExpired) return false;
      if (activeTab === 'archived' && !isExpired) return false;

      // Campus filter
      if (selectedCampus !== 'All' && sc.campus !== selectedCampus) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && sc.category !== selectedCategory) {
        return false;
      }

      // Saved only
      if (savedOnly && !storage.isSavedShowcase(sc.id)) {
        return false;
      }

      // My showcases only
      if (myOnly && currentUser && sc.userId !== currentUser.uid && sc.ownerUid !== currentUser.uid) {
        return false;
      }

      // Looking for teammates filter
      if (lookingForOnly && (!sc.lookingFor || sc.lookingFor.length === 0)) {
        return false;
      }

      // Specific skill filter
      if (selectedSkill) {
        const hasSkill = sc.skills?.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase())) ||
                         sc.technologies?.some(t => t.toLowerCase().includes(selectedSkill.toLowerCase())) ||
                         sc.teammateSkills?.some(ts => ts.toLowerCase().includes(selectedSkill.toLowerCase()));
        if (!hasSkill) return false;
      }

      // Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = sc.studentName?.toLowerCase().includes(q);
        const matchesTitle = sc.projectTitle?.toLowerCase().includes(q);
        const matchesDesc = sc.projectDescription?.toLowerCase().includes(q);
        const matchesCampus = sc.campus?.toLowerCase().includes(q);
        const matchesCategory = sc.category?.toLowerCase().includes(q);
        const matchesSkills = sc.skills?.some(s => s.toLowerCase().includes(q)) ||
                              sc.technologies?.some(t => t.toLowerCase().includes(q));
        const matchesLookingFor = sc.lookingFor?.some(l => l.toLowerCase().includes(q));

        return matchesName || matchesTitle || matchesDesc || matchesCampus || matchesCategory || matchesSkills || matchesLookingFor;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'expiring') {
        const expA = new Date(a.expiresAt).getTime();
        const expB = new Date(b.expiresAt).getTime();
        return expA - expB;
      }
      if (sortBy === 'likes') {
        const likesA = a.likesCount || a.likes?.length || 0;
        const likesB = b.likesCount || b.likes?.length || 0;
        return likesB - likesA;
      }
      if (sortBy === 'views') {
        const viewsA = Number(a.viewsCount) || 0;
        const viewsB = Number(b.viewsCount) || 0;
        return viewsB - viewsA;
      }
      // 'recent'
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return result;
  }, [allShowcases, activeTab, selectedCampus, selectedCategory, savedOnly, myOnly, currentUser, lookingForOnly, selectedSkill, searchQuery, sortBy]);

  // Paginated slice
  const paginatedShowcases = useMemo(() => {
    return filteredShowcases.slice(0, visibleCount);
  }, [filteredShowcases, visibleCount]);

  // Handle Connect
  const handleConnect = (sc: StudentShowcase) => {
    if (!currentUser) {
      showToast("Please sign in to connect with students.");
      return;
    }
    try {
      storage.sendConnectionRequest(sc.userId);
      showToast(`Connection request sent to ${sc.studentName}!`);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to send connection request.");
    }
  };

  // Handle Delete / Moderate Showcase
  const handleDeleteShowcase = async (showcaseId: string) => {
    if (!confirm("Are you sure you want to remove this showcase?")) return;
    try {
      await storage.deleteStudentShowcase(showcaseId);
      setVersion(v => v + 1);
      showToast("Showcase removed successfully.");
      if (selectedShowcase?.id === showcaseId) {
        setSelectedShowcase(null);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to delete showcase.");
    }
  };

  // Handle Showcase Submit
  const handleShowcaseSubmit = async (data: Omit<StudentShowcase, 'id' | 'createdAt' | 'expiresAt' | 'status' | 'userId' | 'ownerUid'>) => {
    if (editingShowcase) {
      await storage.updateStudentShowcase(editingShowcase.id, data);
      setVersion(v => v + 1);
      showToast("Project showcase updated successfully!");
    } else {
      await storage.createStudentShowcase(data);
      setVersion(v => v + 1);
      showToast("Your 30-Day Project Showcase is now live across NIAT!");
    }
    setEditingShowcase(null);
  };

  // Quick skill pills
  const popularSkills = ['React', 'Python', 'AI/ML', 'Node.js', 'TypeScript', 'Flutter', 'Tailwind', 'Next.js'];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)} 
            className="text-neutral-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div 
        className="relative rounded-3xl p-6 sm:p-10 overflow-hidden shadow-lg border border-[#FFE59A]"
        style={{
          background: 'linear-gradient(135deg, #FFF4C7 0%, #FFE59A 55%, #F4C542 100%)'
        }}
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-amber-300/30 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-amber-300/80 text-xs font-extrabold text-[#171717] shadow-xs">
            <Video className="w-3.5 h-3.5 text-[#9E1B1B]" />
            <span>Student Application & Project Video Showcase</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#171717] leading-tight">
            NIAT Student Hub
          </h1>

          <p className="text-sm sm:text-base font-medium text-neutral-800 leading-relaxed">
            Discover and demonstrate student-built web applications, mobile apps, AI systems, and technical projects across all NIAT campuses. Connect with creators and recruit teammates for hackathons and products.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-[#171717]">
            <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-amber-200/90 shadow-xs">
              <Building2 className="w-4 h-4 text-[#9E1B1B]" />
              <span>Annamacharya • NRI • Chalapathi</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#FFE59A] px-3.5 py-2 rounded-xl border border-[#F4C542] shadow-xs">
              <Clock className="w-4 h-4 text-[#171717]" />
              <span>30-Day Featured Video Demos</span>
            </span>
          </div>
        </div>
      </div>

      {/* User's Own Active Showcase Status Card */}
      {currentUser && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="p-3 bg-red-50 text-red-900 rounded-2xl border border-red-100 shrink-0">
              <Rocket className="w-6 h-6" />
            </div>
            <div className="space-y-1 min-w-0">
              {userActiveShowcase ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-neutral-900">
                      Your Active Showcase: "{userActiveShowcase.projectTitle}"
                    </h3>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Live across NIAT
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 font-medium line-clamp-1">
                    {userActiveShowcase.projectDescription}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-black text-neutral-900">
                    Publish Your 30-Day Project & Video Showcase
                  </h3>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                    Demonstrate your live application, website, or technical project with a short video demo to students across all 3 NIAT campuses.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-end">
            {userActiveShowcase ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedShowcase(userActiveShowcase)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  View Yours
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingShowcase(userActiveShowcase);
                    setIsCreateModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Update Showcase</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingShowcase(null);
                  setIsCreateModalOpen(true);
                }}
                className="w-full md:w-auto px-6 py-3 bg-red-900 hover:bg-red-950 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Showcase Your Project</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-5">
        
        {/* Top Search & Filter Toggles */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(12);
              }}
              placeholder="Search by project name, creator, category, or technology..."
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVisibleCount(12);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            {/* Looking for Teammates filter */}
            <button
              type="button"
              onClick={() => {
                setLookingForOnly(!lookingForOnly);
                setVisibleCount(12);
              }}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                lookingForOnly
                  ? 'bg-red-900 text-white border-red-900 shadow-2xs'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Looking for Teammates</span>
            </button>

            {/* Saved Showcases filter */}
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setSavedOnly(!savedOnly);
                  setVisibleCount(12);
                }}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  savedOnly
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved</span>
              </button>
            )}

            {/* My Showcases filter */}
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setMyOnly(!myOnly);
                  setVisibleCount(12);
                }}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  myOnly
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
              >
                <span>My Showcases</span>
              </button>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-2 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-800">
              <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="likes">Most Liked</option>
                <option value="views">Most Viewed</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
          </div>
        </div>

        {/* Project Categories Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-black text-neutral-400 uppercase tracking-wider mr-1 shrink-0">Category:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setVisibleCount(12);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-red-900 text-white border-red-900 shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-transparent'
              }`}
            >
              {cat === 'All' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* Campus Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-black text-neutral-400 uppercase tracking-wider mr-1 shrink-0">Campus:</span>
          {['All', 'Annamacharya × NIAT', 'NRI × NIAT', 'Chalapathi × NIAT'].map((campusName) => (
            <button
              key={campusName}
              type="button"
              onClick={() => {
                setSelectedCampus(campusName);
                setVisibleCount(12);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                selectedCampus === campusName
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-transparent'
              }`}
            >
              {campusName === 'All' ? 'All Campuses' : campusName}
            </button>
          ))}
        </div>

        {/* Popular Skill Pills */}
        <div className="flex items-center gap-2 flex-wrap border-t border-neutral-100 pt-3">
          <span className="text-xs font-black text-neutral-400 uppercase tracking-wider mr-1 shrink-0">Technology:</span>
          {selectedSkill && (
            <button
              type="button"
              onClick={() => {
                setSelectedSkill('');
                setVisibleCount(12);
              }}
              className="px-3 py-1 bg-neutral-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <span>Clear ({selectedSkill})</span>
              <X className="w-3 h-3" />
            </button>
          )}
          {popularSkills.map((sk) => (
            <button
              key={sk}
              type="button"
              onClick={() => {
                setSelectedSkill(selectedSkill === sk ? '' : sk);
                setVisibleCount(12);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                selectedSkill === sk
                  ? 'bg-red-50 text-red-900 border-red-200 font-extrabold'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/60'
              }`}
            >
              {sk}
            </button>
          ))}
        </div>

      </div>

      {/* Showcases Grid Header & Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('active');
                setVisibleCount(12);
              }}
              className={`pb-2 text-sm font-black transition-colors relative cursor-pointer ${
                activeTab === 'active' ? 'text-red-900' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <span>Active 30-Day Showcases</span>
              {activeTab === 'active' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-900 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('archived');
                setVisibleCount(12);
              }}
              className={`pb-2 text-sm font-black transition-colors relative cursor-pointer ${
                activeTab === 'archived' ? 'text-red-900' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <span>Past & Archived Showcases</span>
              {activeTab === 'archived' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-900 rounded-full" />
              )}
            </button>
          </div>

          <span className="text-xs font-extrabold text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
            Showing {filteredShowcases.length} {activeTab === 'active' ? 'active' : 'archived'} {filteredShowcases.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {paginatedShowcases.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedShowcases.map((showcase) => (
                <ShowcaseCard
                  key={showcase.id}
                  showcase={showcase}
                  currentUser={currentUser}
                  connectionState={storage.getConnectionState(showcase.userId)}
                  onViewDetails={(sc) => setSelectedShowcase(sc)}
                  onViewProfile={onViewProfile}
                  onConnect={handleConnect}
                  onOpenMessage={onNavigateToMessages}
                  onEditShowcase={(sc) => {
                    setEditingShowcase(sc);
                    setIsCreateModalOpen(true);
                  }}
                  onDeleteShowcase={handleDeleteShowcase}
                  onLikeToggle={() => setVersion(v => v + 1)}
                  onSaveToggle={() => setVersion(v => v + 1)}
                />
              ))}
            </div>

            {/* Pagination Load-More Button */}
            {filteredShowcases.length > visibleCount && (
              <div className="pt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="px-8 py-3 bg-white hover:bg-neutral-50 text-neutral-900 text-xs font-black rounded-2xl border border-neutral-300 shadow-xs transition-all hover:shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>Load More Projects</span>
                  <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-lg text-[10px]">
                    +{filteredShowcases.length - visibleCount} remaining
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-neutral-200/80 space-y-5 max-w-xl mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 bg-red-50 text-red-900 rounded-3xl flex items-center justify-center mx-auto border border-red-100/80">
              <Video className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-neutral-900">
                {(searchQuery || selectedCampus !== 'All' || selectedCategory !== 'All' || lookingForOnly || savedOnly || myOnly || selectedSkill)
                  ? 'No matching application showcases found'
                  : activeTab === 'active'
                  ? 'No project showcases yet'
                  : 'No past or archived showcases yet'}
              </h3>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed max-w-md mx-auto">
                {(searchQuery || selectedCampus !== 'All' || selectedCategory !== 'All' || lookingForOnly || savedOnly || myOnly || selectedSkill)
                  ? 'Try adjusting your search query, category, campus filter, or skill selection to see more results.'
                  : activeTab === 'active'
                  ? 'Be the first NIAT student to showcase your live application, website, or AI project video across NIAT campuses.'
                  : 'Expired showcases will appear here once active 30-day cycles complete.'}
              </p>
            </div>

            {(searchQuery || selectedCampus !== 'All' || selectedCategory !== 'All' || lookingForOnly || savedOnly || myOnly || selectedSkill) ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedCampus('All');
                  setLookingForOnly(false);
                  setSavedOnly(false);
                  setMyOnly(false);
                  setSelectedSkill('');
                  setVisibleCount(12);
                }}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            ) : activeTab === 'active' && (
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    showToast("Please sign in to showcase your project.");
                    return;
                  }
                  setEditingShowcase(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-6 py-3 bg-red-900 hover:bg-red-950 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Showcase Your Project</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedShowcase && (
        <ShowcaseDetailModal
          showcase={selectedShowcase}
          currentUser={currentUser}
          connectionState={storage.getConnectionState(selectedShowcase.userId)}
          onClose={() => setSelectedShowcase(null)}
          onViewProfile={onViewProfile}
          onConnect={handleConnect}
          onOpenMessage={onNavigateToMessages}
        />
      )}

      {isCreateModalOpen && currentUser && (
        <CreateShowcaseModal
          currentUser={currentUser}
          initialShowcase={editingShowcase}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleShowcaseSubmit}
        />
      )}

    </div>
  );
};
