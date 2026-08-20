import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Sparkles, 
  Briefcase, 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Share2, 
  Send, 
  PlusCircle, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Users, 
  X, 
  Flame, 
  Compass,
  ArrowRight,
  Globe,
  MoreVertical,
  Trash2,
  Flag,
  Pencil
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { Post, ProjectRequirement, Opportunity, UserProfile, CampusName } from '../types';
import { VerifiedBadge, CampusBadge } from './common/Badge';
import { auth } from '../lib/firebase';
import { canEditContent, canDeleteContent, canManagePost } from '../utils/postPermissions';

export type ActivityFilterType = 'all' | 'projects' | 'opportunities' | 'posts';

export type FeedItem =
  | { id: string; type: 'post'; timestamp: string; post: Post }
  | { id: string; type: 'project'; timestamp: string; project: ProjectRequirement }
  | { id: string; type: 'opportunity'; timestamp: string; opportunity: Opportunity };

interface CampusActivityFeedProps {
  onNavigateTab: (tab: string, param?: any) => void;
  onViewStudentProfile: (profile: UserProfile) => void;
}

export const CampusActivityFeed: React.FC<CampusActivityFeedProps> = ({
  onNavigateTab,
  onViewStudentProfile,
}) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const campuses = storage.getCampuses();
  const approvedStudents = storage.getApprovedStudents();
  const profiles = storage.getProfiles();

  const userCampus: string = currentUser?.campus || "Annamacharya × NIAT";

  // Selected campus state ('All' or specific campus name)
  const [selectedCampus, setSelectedCampus] = useState<string>(userCampus);
  const [filterType, setFilterType] = useState<ActivityFilterType>('all');

  // Comment input state per post
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'post' | 'project' | 'opportunity'>('post');
  const [selectedProjectForApply, setSelectedProjectForApply] = useState<ProjectRequirement | null>(null);

  // Apply Form State
  const [appliedRole, setAppliedRole] = useState('');
  const [appliedMsg, setAppliedMsg] = useState('');

  // Post form state
  const [postCategory, setPostCategory] = useState<Post['category']>('Project Request');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');

  // Project form state
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projRolesInput, setProjRolesInput] = useState('');
  const [projIsHackathon, setProjIsHackathon] = useState(false);
  const [projHackathonName, setProjHackathonName] = useState('');

  // Opportunity form state
  const [oppTitle, setOppTitle] = useState('');
  const [oppOrg, setOppOrg] = useState('');
  const [oppCat, setOppCat] = useState<Opportunity['category']>('Hackathon');
  const [oppDesc, setOppDesc] = useState('');
  const [oppLocation, setOppLocation] = useState('');
  const [oppDeadline, setOppDeadline] = useState('');
  const [oppLink, setOppLink] = useState('');
  const [oppTags, setOppTags] = useState('');

  // Delete post state
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'posts' | 'projects' | 'opportunities' } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit post state
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'posts' | 'projects' | 'opportunities'; data: any } | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editTags, setEditTags] = useState('');

  const currentAuthUid = auth.currentUser?.uid || currentUser?.uid || currentUser?.firebaseUid;

  // Toast alert
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStartEdit = (item: { id: string; type: 'posts' | 'projects' | 'opportunities'; data: any }) => {
    setUpdateError(null);
    setEditingItem(item);
    if (item.type === 'posts') {
      setEditContent(item.data.content || '');
      setEditCategory(item.data.category || 'Project Request');
      setEditImageUrl(item.data.imageUrl || '');
    } else if (item.type === 'projects') {
      setEditTitle(item.data.title || '');
      setEditContent(item.data.description || '');
    } else if (item.type === 'opportunities') {
      setEditTitle(item.data.title || '');
      setEditOrg(item.data.organization || '');
      setEditContent(item.data.description || '');
      setEditLocation(item.data.location || '');
      setEditDeadline(item.data.deadline || '');
      setEditLink(item.data.externalLink || '');
      setEditTags((item.data.tags || []).join(', '));
    }
  };

  const handleConfirmUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsUpdating(true);
    setUpdateError(null);

    try {
      if (editingItem.type === 'posts') {
        await storage.updatePost(editingItem.id, {
          content: editContent,
          category: editCategory as Post['category'],
          imageUrl: editImageUrl || undefined
        });
      } else if (editingItem.type === 'projects') {
        await storage.updateProject(editingItem.id, {
          title: editTitle,
          description: editContent
        });
      } else if (editingItem.type === 'opportunities') {
        const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
        await storage.updateOpportunity(editingItem.id, {
          title: editTitle,
          organization: editOrg,
          description: editContent,
          location: editLocation,
          deadline: editDeadline,
          externalLink: editLink,
          tags
        });
      }
      setIsUpdating(false);
      setEditingItem(null);
      showToast("Post updated successfully!");
    } catch (err: any) {
      console.error("Error during post update:", err);
      setIsUpdating(false);
      setUpdateError(err?.message || "Unable to update post. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await storage.deleteActivityItem(itemToDelete.id, itemToDelete.type);
      setIsDeleting(false);
      setItemToDelete(null);
      showToast("Post deleted successfully.");
    } catch (err: any) {
      console.error("Error during post delete:", err);
      setIsDeleting(false);
      setDeleteError(err?.message || "Unable to delete post. Please try again.");
    }
  };

  // Raw Feed Aggregation
  const posts = storage.getPosts();
  const projects = storage.getProjects();
  const opportunities = storage.getOpportunities();

  const allFeedItems: FeedItem[] = useMemo(() => {
    const postItems: FeedItem[] = posts.map(p => ({
      id: `post_${p.id}`,
      type: 'post',
      timestamp: p.createdAt,
      post: p
    }));

    const projectItems: FeedItem[] = projects.map(p => ({
      id: `proj_${p.id}`,
      type: 'project',
      timestamp: p.createdAt,
      project: p
    }));

    const oppItems: FeedItem[] = opportunities.map(o => ({
      id: `opp_${o.id}`,
      type: 'opportunity',
      timestamp: o.createdAt,
      opportunity: o
    }));

    return [...postItems, ...projectItems, ...oppItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [posts, projects, opportunities]);

  // Filtered Items by Selected Campus & Category
  const filteredItems = useMemo(() => {
    return allFeedItems.filter(item => {
      // 1. Campus Filter
      if (selectedCampus !== 'All') {
        if (item.type === 'post') {
          if (item.post.authorCampus !== selectedCampus) return false;
        } else if (item.type === 'project') {
          if (
            item.project.creatorCampus !== selectedCampus &&
            item.project.preferredCampus !== selectedCampus &&
            item.project.preferredCampus !== 'Any'
          ) return false;
        } else if (item.type === 'opportunity') {
          if (
            item.opportunity.postedByCampus !== selectedCampus &&
            !item.opportunity.location.toLowerCase().includes(selectedCampus.toLowerCase())
          ) return false;
        }
      }

      // 2. Activity Category Filter
      if (filterType === 'projects') {
        if (item.type === 'project') return true;
        if (item.type === 'post') {
          return ['Project Request', 'Collaboration', 'Resource'].includes(item.post.category);
        }
        return false;
      }

      if (filterType === 'opportunities') {
        if (item.type === 'opportunity') return true;
        if (item.type === 'post') {
          return ['Opportunity', 'Hackathon'].includes(item.post.category);
        }
        return false;
      }

      if (filterType === 'posts') {
        return item.type === 'post';
      }

      return true;
    });
  }, [allFeedItems, selectedCampus, filterType]);

  // Statistics for active campus hub banner
  const campusStats = useMemo(() => {
    const targetCampus = selectedCampus === 'All' ? userCampus : selectedCampus;
    const studentCount = approvedStudents.filter(s => selectedCampus === 'All' || s.campus === targetCampus).length;
    const openProjectsCount = projects.filter(
      p => p.status === 'open' && (selectedCampus === 'All' || p.creatorCampus === targetCampus || p.preferredCampus === targetCampus || p.preferredCampus === 'Any')
    ).length;
    const oppsCount = opportunities.filter(
      o => selectedCampus === 'All' || o.postedByCampus === targetCampus
    ).length;

    return { targetCampus, studentCount, openProjectsCount, oppsCount };
  }, [selectedCampus, userCampus, approvedStudents, projects, opportunities]);

  // Handlers
  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;
    storage.addComment(postId, commentText);
    setCommentText('');
    showToast("Comment published!");
  };

  const handleShare = (post: Post) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}#post-${post.id}`);
    }
    showToast(`Post link copied to clipboard!`);
  };

  const handleApplyToProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForApply || !appliedRole.trim()) return;

    storage.applyToProject(selectedProjectForApply.id, appliedRole, appliedMsg);
    setSelectedProjectForApply(null);
    setAppliedRole('');
    setAppliedMsg('');
    showToast(`Application sent to ${selectedProjectForApply.creatorName}!`);
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    storage.createPost(postCategory, postContent, postImageUrl.trim() || undefined);
    setPostContent('');
    setPostImageUrl('');
    setShowCreateModal(false);
    showToast("Campus post published successfully!");
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || !projDesc.trim()) return;

    const roles = (projRolesInput || '')
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    storage.createProject(
      projTitle,
      projDesc,
      roles.length > 0 ? roles : ['Developer'],
      (selectedCampus !== 'All' ? selectedCampus as CampusName : 'Any'),
      projIsHackathon,
      projHackathonName.trim() || undefined
    );

    setProjTitle('');
    setProjDesc('');
    setProjRolesInput('');
    setProjIsHackathon(false);
    setProjHackathonName('');
    setShowCreateModal(false);
    showToast("Project recruitment created on Campus Activity Feed!");
  };

  const handleCreateOpportunitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim() || !oppOrg.trim()) return;

    const tags = (oppTags || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    storage.createOpportunity(
      oppTitle,
      oppOrg,
      oppCat,
      oppDesc,
      oppLocation || 'Online / Campus',
      oppDeadline || '2026-12-31',
      oppLink || 'https://niatinsider.com',
      tags
    );

    setOppTitle('');
    setOppOrg('');
    setOppDesc('');
    setOppLocation('');
    setOppDeadline('');
    setOppLink('');
    setOppTags('');
    setShowCreateModal(false);
    showToast("Campus opportunity posted!");
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-20 right-4 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Campus Activity Feed Header & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
        
        {/* Top Control Line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-900/10 text-red-900 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
                <span>Campus Activity</span>
                <span className="text-[10px] bg-red-900 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  Live
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium">
                Projects, events, and discussions from your campus community
              </p>
            </div>
          </div>

          {/* Quick Create Action Button */}
          <button
            onClick={() => {
              setCreateModalTab('post');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-red-200" />
            <span>Post to Campus</span>
          </button>
        </div>

        {/* Campus Selection Quick Switcher Pills */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full sm:w-auto">
            
            {/* My Campus Button */}
            <button
              onClick={() => setSelectedCampus(userCampus)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCampus === userCampus
                  ? 'bg-red-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{userCampus.split(' × ')[0]} Campus</span>
            </button>

            {/* All Campuses Button */}
            <button
              onClick={() => setSelectedCampus('All')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCampus === 'All'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All NIAT Feed</span>
            </button>

            {/* Other Campus Pills */}
            {campuses.map(c => {
              if (c.name === userCampus) return null;
              const shortName = c.name.split(' × ')[0];
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedCampus(c.name)}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    selectedCampus === c.name
                      ? 'bg-red-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {shortName}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-neutral-500 font-semibold hidden md:block">
            Showing <span className="font-extrabold text-neutral-900">{filteredItems.length}</span> activity items
          </div>
        </div>

        {/* Category Toggles (All, Projects, Opportunities, Posts) */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-red-900 text-white shadow-xs'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-200" />
            <span>All Activity</span>
          </button>

          <button
            onClick={() => setFilterType('projects')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'projects'
                ? 'bg-red-900 text-white shadow-xs'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-red-200" />
            <span>Projects & Teams</span>
          </button>

          <button
            onClick={() => setFilterType('opportunities')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'opportunities'
                ? 'bg-red-900 text-white shadow-xs'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-red-200" />
            <span>Opportunities & Events</span>
          </button>

          <button
            onClick={() => setFilterType('posts')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'posts'
                ? 'bg-red-900 text-white shadow-xs'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-red-200" />
            <span>Discussions</span>
          </button>
        </div>

      </div>

      {/* Campus Community Hub Stats Banner */}
      <div className="bg-white text-neutral-900 rounded-3xl p-5 shadow-xs border border-neutral-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CampusBadge campus={selectedCampus === 'All' ? userCampus : selectedCampus} size="sm" />
              <span className="text-[10px] font-extrabold text-red-900 uppercase tracking-wider">
                Community Hub
              </span>
            </div>
            <h3 className="text-sm font-black text-neutral-900">
              {selectedCampus === 'All' ? 'All NIAT Campuses Hub' : `${selectedCampus} Campus`}
            </h3>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200 text-center">
            <div>
              <div className="text-xs font-black text-neutral-900">{campusStats.studentCount}</div>
              <div className="text-[10px] text-neutral-500 font-medium">Students</div>
            </div>
            <div className="border-x border-neutral-200 px-2">
              <div className="text-xs font-black text-red-900">{campusStats.openProjectsCount}</div>
              <div className="text-[10px] text-neutral-500 font-medium">Open Teams</div>
            </div>
            <div>
              <div className="text-xs font-black text-neutral-900">{campusStats.oppsCount}</div>
              <div className="text-[10px] text-neutral-500 font-medium">Opportunities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed List Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-neutral-200/80 text-center space-y-3 shadow-xs">
            <Compass className="w-10 h-10 text-neutral-300 mx-auto" />
            <h3 className="text-base font-bold text-neutral-800">
              No recent activity on {selectedCampus === 'All' ? 'NIAT Feed' : selectedCampus}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Be the first student to post a project request, hackathon team recruitment, or question!
            </p>
            <button
              onClick={() => {
                setCreateModalTab('project');
                setShowCreateModal(true);
              }}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start First Campus Project</span>
            </button>
          </div>
        ) : (
          filteredItems.map(item => {
            
            // --- 1. PROJECT REQUIREMENT CARD ---
            if (item.type === 'project') {
              const proj = item.project;
              const creatorProfile = profiles.find(p => p.uid === proj.creatorId);

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-900" />

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={proj.creatorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                        alt={proj.creatorName}
                        referrerPolicy="no-referrer"
                        onClick={() => creatorProfile && onViewStudentProfile(creatorProfile)}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-neutral-100 cursor-pointer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => creatorProfile && onViewStudentProfile(creatorProfile)}
                            className="font-extrabold text-sm text-neutral-900 hover:text-red-900 cursor-pointer"
                          >
                            {proj.creatorName}
                          </span>
                          <VerifiedBadge size="sm" showText={false} />
                        </div>
                        <div className="text-xs text-neutral-500 font-medium mt-0.5">
                          Posted on {new Date(proj.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <CampusBadge campus={proj.creatorCampus} size="sm" />
                        <span className="text-[10px] bg-red-50 text-red-900 font-extrabold px-2.5 py-0.5 rounded-full border border-red-200/80 uppercase tracking-wider flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-red-900" />
                          <span>Team Recruitment</span>
                        </span>
                      </div>

                      {Boolean(currentAuthUid) && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setOpenMenuPostId(openMenuPostId === proj.id ? null : proj.id)}
                            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                            title="Post options"
                            aria-label="Post options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuPostId === proj.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenMenuPostId(null)} 
                              />
                              <div className="absolute right-0 mt-1 z-20 w-44 bg-white rounded-2xl shadow-lg border border-neutral-200 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    if (navigator.clipboard?.writeText) {
                                      navigator.clipboard.writeText(window.location.href);
                                    }
                                    showToast("Project link copied to clipboard!");
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>Share Link</span>
                                </button>

                                {canEditContent(proj, currentUser) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      handleStartEdit({ id: proj.id, type: 'projects', data: proj });
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Edit Post</span>
                                  </button>
                                )}

                                {canDeleteContent(proj, currentUser) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      setDeleteError(null);
                                      setItemToDelete({ id: proj.id, type: 'projects' });
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Post</span>
                                  </button>
                                ) : !canEditContent(proj, currentUser) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      showToast("Report submitted to campus moderators.");
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                  >
                                    <Flag className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Report Post</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Title & Hackathon Banner */}
                  <div className="space-y-1.5">
                    {proj.isHackathon && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 text-red-900 text-xs font-bold border border-red-200/80">
                        <Sparkles className="w-3.5 h-3.5 text-red-900" />
                        <span>Hackathon Team: {proj.hackathonName || "Upcoming Competition"}</span>
                      </div>
                    )}
                    <h3 className="text-base font-black text-neutral-900 tracking-tight">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-neutral-700 leading-relaxed font-medium whitespace-pre-line break-words">
                      {proj.description}
                    </p>
                  </div>

                  {/* Roles Needed Chips */}
                  {proj.rolesNeeded.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Roles Seeking Collaborators:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {proj.rolesNeeded.map((role, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-200"
                          >
                            <Users className="w-3 h-3 text-neutral-500" />
                            <span>{role}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <div className="text-neutral-500 font-semibold flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-neutral-400" />
                      <span>{proj.applicantsCount || 0} Applicants</span>
                      <span>•</span>
                      <span className="text-red-900 font-bold">
                        Target Campus: {proj.preferredCampus}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedProjectForApply(proj)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Apply to Join Team</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            }

            // --- 2. OPPORTUNITY CARD ---
            if (item.type === 'opportunity') {
              const opp = item.opportunity;

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-900" />

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-900 flex items-center justify-center font-bold border border-red-200/60">
                        <Sparkles className="w-5 h-5 text-red-900" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-red-900 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {opp.category}
                        </span>
                        <h4 className="text-xs text-neutral-500 font-bold mt-0.5">{opp.organization}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CampusBadge campus={opp.postedByCampus} size="sm" />

                      {Boolean(currentAuthUid) && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setOpenMenuPostId(openMenuPostId === opp.id ? null : opp.id)}
                            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                            title="Post options"
                            aria-label="Post options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuPostId === opp.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenMenuPostId(null)} 
                              />
                              <div className="absolute right-0 mt-1 z-20 w-44 bg-white rounded-2xl shadow-lg border border-neutral-200 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    if (navigator.clipboard?.writeText) {
                                      navigator.clipboard.writeText(window.location.href);
                                    }
                                    showToast("Opportunity link copied to clipboard!");
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>Share Link</span>
                                </button>

                                {canEditContent(opp, currentUser) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      handleStartEdit({ id: opp.id, type: 'opportunities', data: opp });
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Edit Post</span>
                                  </button>
                                )}

                                {canDeleteContent(opp, currentUser) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      setDeleteError(null);
                                      setItemToDelete({ id: opp.id, type: 'opportunities' });
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Post</span>
                                  </button>
                                ) : !canEditContent(opp, currentUser) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      showToast("Report submitted to campus moderators.");
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                  >
                                    <Flag className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Report Post</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-neutral-900 tracking-tight">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                      {opp.description}
                    </p>
                  </div>

                  {/* Location & Deadline Row */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-neutral-600 flex-wrap pt-2 border-t border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-red-900" />
                      <span>{opp.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span>Deadline: {opp.deadline}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {opp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {opp.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded-md border border-neutral-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">
                      Posted by {opp.postedBy}
                    </span>

                    <button
                      onClick={() => onNavigateTab('opportunities')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>View & Apply</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            }

            // --- 3. STANDARD CAMPUS POST CARD ---
            const post = item.post;
            const isLiked = currentUser && Array.isArray(post.likes) ? post.likes.includes(currentUser.uid) : false;
            const isSaved = currentUser && Array.isArray(post.saves) ? post.saves.includes(currentUser.uid) : false;
            const authorProfile = profiles.find(p => p.uid === post.authorId);
            const isPostOwner = Boolean(currentAuthUid && post.authorId && post.authorId === currentAuthUid);

            return (
              <article
                key={item.id}
                className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4 transition-all hover:shadow-md"
              >
                {/* Author Info & Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                      alt={post.authorName}
                      referrerPolicy="no-referrer"
                      onClick={() => authorProfile && onViewStudentProfile(authorProfile)}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-neutral-100 cursor-pointer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => authorProfile && onViewStudentProfile(authorProfile)}
                          className="font-extrabold text-sm text-neutral-900 hover:text-red-900 cursor-pointer"
                        >
                          {post.authorName}
                        </span>
                        <VerifiedBadge size="sm" showText={false} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium mt-0.5">
                        <span>{post.authorYear} {post.authorBranch}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <CampusBadge campus={post.authorCampus} size="sm" />
                      <span className="text-[10px] bg-neutral-100 text-neutral-700 font-bold px-2 py-0.5 rounded-full border border-neutral-200">
                        {post.category}
                      </span>
                    </div>

                    {Boolean(currentAuthUid) && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                          className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                          title="Post options"
                          aria-label="Post options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuPostId === post.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenMenuPostId(null)} 
                            />
                            <div className="absolute right-0 mt-1 z-20 w-44 bg-white rounded-2xl shadow-lg border border-neutral-200 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuPostId(null);
                                  if (navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(window.location.href);
                                  }
                                  showToast("Post link copied to clipboard!");
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Share Link</span>
                              </button>

                              {canEditContent(post, currentUser) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    handleStartEdit({ id: post.id, type: 'posts', data: post });
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>Edit Post</span>
                                </button>
                              )}

                              {canDeleteContent(post, currentUser) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    setDeleteError(null);
                                    setItemToDelete({ id: post.id, type: 'posts' });
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Post</span>
                                </button>
                              ) : !canEditContent(post, currentUser) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    showToast("Report submitted to campus moderators.");
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                >
                                  <Flag className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>Report Post</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-sm text-neutral-800 leading-relaxed font-medium whitespace-pre-line break-words">
                  {post.content}
                </p>

                {/* Optional Image */}
                {Boolean(post.imageUrl && post.imageUrl.trim()) && (
                  <div className="rounded-2xl overflow-hidden max-h-96 bg-neutral-100 border border-neutral-200">
                    <img
                      src={post.imageUrl}
                      alt="Post attachment"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Action Bar (Likes, Comments, Saves, Share) */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 font-bold">
                  <div className="flex items-center gap-4">
                    {/* Like */}
                    <button
                      onClick={() => storage.likePost(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'hover:bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{post.likes.length}</span>
                    </button>

                    {/* Comments Toggle */}
                    <button
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-neutral-500" />
                      <span>{post.commentsCount} Comments</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Save */}
                    <button
                      onClick={() => storage.toggleSavePost(post.id)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isSaved
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'hover:bg-neutral-100 text-neutral-500'
                      }`}
                      title={isSaved ? "Saved" : "Save post"}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-600 text-amber-600' : ''}`} />
                    </button>

                    {/* Share */}
                    <button
                      onClick={() => handleShare(post)}
                      className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-all cursor-pointer"
                      title="Share post link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Comment Drawer */}
                {activeCommentPostId === post.id && (
                  <div className="pt-3 border-t border-neutral-100 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="p-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {post.comments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {post.comments.map((c) => (
                          <div key={c.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-900">{c.authorName}</span>
                              <span className="text-[10px] text-neutral-400">{c.authorCampus}</span>
                            </div>
                            <p className="text-neutral-700">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* --- CREATE CAMPUS ACTIVITY MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-black text-neutral-900">Post to Campus Activity Feed</h3>
                <p className="text-xs text-neutral-500">Publish to {selectedCampus === 'All' ? userCampus : selectedCampus}</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-2xl text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setCreateModalTab('post')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  createModalTab === 'post' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'
                }`}
              >
                💬 Post / Q&A
              </button>
              <button
                type="button"
                onClick={() => setCreateModalTab('project')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  createModalTab === 'project' ? 'bg-white text-indigo-900 shadow-xs' : 'text-neutral-500'
                }`}
              >
                🚀 Project Role
              </button>
              <button
                type="button"
                onClick={() => setCreateModalTab('opportunity')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  createModalTab === 'opportunity' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-500'
                }`}
              >
                🎯 Opportunity
              </button>
            </div>

            {/* TAB 1: CAMPUS POST */}
            {createModalTab === 'post' && (
              <form onSubmit={handleCreatePostSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Post Category
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                  >
                    <option value="Question">Question</option>
                    <option value="Project Request">Project Request</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Learning Update">Learning Update</option>
                    <option value="Opportunity">Opportunity</option>
                    <option value="Resource">Resource</option>
                    <option value="Collaboration">Collaboration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share what you are working on, ask a question, or look for project team members..."
                    rows={4}
                    className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Optional Image URL
                  </label>
                  <input
                    type="url"
                    value={postImageUrl}
                    onChange={(e) => setPostImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-red-900 text-white shadow-xs"
                  >
                    Publish Post
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PROJECT RECRUITMENT */}
            {createModalTab === 'project' && (
              <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    placeholder="e.g., Smart Campus AI Portal or HealthTech Mobile App"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Project Description
                  </label>
                  <textarea
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    placeholder="Describe what the project does and why you need team members..."
                    rows={3}
                    className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Roles Needed (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={projRolesInput}
                    onChange={(e) => setProjRolesInput(e.target.value)}
                    placeholder="Full Stack Developer, UI/UX Designer, ML Engineer"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isHackathonCheck"
                    checked={projIsHackathon}
                    onChange={(e) => setProjIsHackathon(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-md"
                  />
                  <label htmlFor="isHackathonCheck" className="text-xs font-bold text-neutral-700">
                    This is for an upcoming Hackathon
                  </label>
                </div>

                {projIsHackathon && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Hackathon Name
                    </label>
                    <input
                      type="text"
                      value={projHackathonName}
                      onChange={(e) => setProjHackathonName(e.target.value)}
                      placeholder="e.g. Smart India Hackathon 2026 or NIAT TechFest"
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-900 text-white shadow-xs"
                  >
                    Post Project Requirement
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: OPPORTUNITY */}
            {createModalTab === 'opportunity' && (
              <form onSubmit={handleCreateOpportunitySubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={oppTitle}
                      onChange={(e) => setOppTitle(e.target.value)}
                      placeholder="e.g., Campus AI Hackathon 2026"
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Host Organization</label>
                    <input
                      type="text"
                      value={oppOrg}
                      onChange={(e) => setOppOrg(e.target.value)}
                      placeholder="e.g. NIAT Developer Club"
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                    <select
                      value={oppCat}
                      onChange={(e) => setOppCat(e.target.value as any)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                    >
                      <option value="Hackathon">Hackathon</option>
                      <option value="Internship">Internship</option>
                      <option value="Job">Job</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Competition">Competition</option>
                      <option value="Scholarship">Scholarship</option>
                      <option value="GSoC">GSoC</option>
                      <option value="Tech Event">Tech Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={oppDeadline}
                      onChange={(e) => setOppDeadline(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Description</label>
                  <textarea
                    value={oppDesc}
                    onChange={(e) => setOppDesc(e.target.value)}
                    placeholder="Details about the hackathon or internship..."
                    rows={3}
                    className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={oppLocation}
                      onChange={(e) => setOppLocation(e.target.value)}
                      placeholder="e.g., Annamacharya Campus Auditorium"
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">External Link</label>
                    <input
                      type="url"
                      value={oppLink}
                      onChange={(e) => setOppLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={oppTags}
                    onChange={(e) => setOppTags(e.target.value)}
                    placeholder="AI, FullStack, Hackathon, CashPrize"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-900 text-white shadow-xs"
                  >
                    Publish Opportunity
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* --- APPLY TO PROJECT MODAL --- */}
      {selectedProjectForApply && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Apply to Join Project Team</h3>
                <p className="text-xs text-neutral-500 font-medium">{selectedProjectForApply.title}</p>
              </div>
              <button
                onClick={() => setSelectedProjectForApply(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyToProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Select Role You're Applying For
                </label>
                <select
                  value={appliedRole}
                  onChange={(e) => setAppliedRole(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                  required
                >
                  <option value="">-- Choose a Role --</option>
                  {selectedProjectForApply.rolesNeeded.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                  <option value="General Collaborator">General Collaborator / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Note / Experience Message to Team Lead
                </label>
                <textarea
                  value={appliedMsg}
                  onChange={(e) => setAppliedMsg(e.target.value)}
                  placeholder="Introduce yourself, your tech stack (e.g. React, Python), and why you want to build this project..."
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProjectForApply(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-950 text-white shadow-xs cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE POST CONFIRMATION MODAL --- */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-neutral-900">Delete this post?</h3>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 font-medium leading-relaxed">
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT CONTENT MODAL --- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Edit {editingItem.type === 'posts' ? 'Post' : editingItem.type === 'projects' ? 'Project' : 'Opportunity'}</h3>
                <p className="text-xs text-neutral-500 font-medium">Update your user-generated content</p>
              </div>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  setEditingItem(null);
                  setUpdateError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpdate} className="space-y-4">
              {editingItem.type === 'posts' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                    >
                      <option value="Question">Question</option>
                      <option value="Project Request">Project Request</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Achievement">Achievement</option>
                      <option value="Learning Update">Learning Update</option>
                      <option value="Opportunity">Opportunity</option>
                      <option value="Resource">Resource</option>
                      <option value="Collaboration">Collaboration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Content</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Image URL (Optional)</label>
                    <input
                      type="url"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'projects' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Project Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Project Description</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'opportunities' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Organization</label>
                    <input
                      type="text"
                      value={editOrg}
                      onChange={(e) => setEditOrg(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Description</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Deadline</label>
                      <input
                        type="date"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">External Link</label>
                    <input
                      type="url"
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              {updateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700">
                  {updateError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    setEditingItem(null);
                    setUpdateError(null);
                  }}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
