import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  PlusCircle, 
  X,
  MoreVertical,
  Trash2,
  Share2,
  Flag,
  Pencil,
  Briefcase
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { Opportunity } from '../types';
import { CampusBadge } from '../components/common/Badge';
import { canEditContent, canDeleteContent, canManagePost } from '../utils/postPermissions';
import { ProjectsPage } from './ProjectsPage';

export interface OpportunitiesPageProps {
  initialCategory?: string;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ initialCategory = 'All' }) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const opportunities = storage.getOpportunities();

  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New Opportunity Form State
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<Opportunity['category']>('Hackathon');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Delete state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit state
  const [oppToEdit, setOppToEdit] = useState<Opportunity | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartEdit = (opp: Opportunity) => {
    setUpdateError(null);
    setOppToEdit(opp);
    setEditTitle(opp.title);
    setEditOrg(opp.organization);
    setEditDesc(opp.description);
    setEditLocation(opp.location);
    setEditDeadline(opp.deadline);
    setEditLink(opp.externalLink);
    setEditTags((opp.tags || []).join(', '));
  };

  const handleConfirmUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppToEdit) return;
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await storage.updateOpportunity(oppToEdit.id, {
        title: editTitle,
        organization: editOrg,
        description: editDesc,
        location: editLocation,
        deadline: editDeadline,
        externalLink: editLink,
        tags,
      });
      setIsUpdating(false);
      setOppToEdit(null);
      showToast("Opportunity updated successfully!");
    } catch (err: any) {
      console.error("Error updating opportunity:", err);
      setIsUpdating(false);
      setUpdateError(err?.message || "Unable to update opportunity. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!oppToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await storage.deleteOpportunity(oppToDelete.id);
      setIsDeleting(false);
      setOppToDelete(null);
      showToast("Post deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting opportunity:", err);
      setIsDeleting(false);
      setDeleteError(err?.message || "Unable to delete post. Please try again.");
    }
  };

  const handleCreateOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !organization.trim()) return;

    const tags = (tagsInput || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    storage.createOpportunity(
      title,
      organization,
      category,
      description,
      location || 'Online / Remote',
      deadline || '2026-12-31',
      externalLink || 'https://niatinsider.com',
      tags
    );

    setTitle('');
    setOrganization('');
    setDescription('');
    setLocation('');
    setDeadline('');
    setExternalLink('');
    setTagsInput('');
    setShowCreateModal(false);
    showToast("Opportunity posted successfully to the CampusLink board!");
  };

  const categoriesList = [
    'All',
    'Hackathons',
    'Internships',
    'Jobs',
    'Workshops',
    'Competitions',
    'Scholarships',
    'Tech Events',
    'GSoC',
    'Projects & Teams'
  ];

  const matchCategory = (oppCategory: string, selectedFilter: string) => {
    if (selectedFilter === 'All') return true;
    const f = selectedFilter.toLowerCase();
    const c = (oppCategory || '').toLowerCase();
    if (f === 'hackathons' || f === 'hackathon') return c === 'hackathon';
    if (f === 'internships' || f === 'internship') return c === 'internship';
    if (f === 'jobs' || f === 'job') return c === 'job';
    if (f === 'workshops' || f === 'workshop') return c === 'workshop';
    if (f === 'competitions' || f === 'competition') return c === 'competition';
    if (f === 'scholarships' || f === 'scholarship') return c === 'scholarship';
    if (f === 'tech events' || f === 'tech event') return c === 'tech event';
    if (f === 'gsoc') return c === 'gsoc';
    return c === f;
  };

  const isProjectsView = categoryFilter === 'Projects & Teams';

  const filtered = opportunities.filter(opp => {
    if (categoryFilter !== 'All' && !matchCategory(opp.category, categoryFilter)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesTitle = (opp.title || '').toLowerCase().includes(q);
      const matchesOrg = (opp.organization || '').toLowerCase().includes(q);
      const matchesTags = (opp.tags || []).some(t => typeof t === 'string' && t.toLowerCase().includes(q));
      if (!matchesTitle && !matchesOrg && !matchesTags) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-4 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Category Filter Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 border border-red-200 text-xs font-bold mb-2">
              {isProjectsView ? <Briefcase className="w-3.5 h-3.5 text-red-900" /> : <Sparkles className="w-3.5 h-3.5 text-red-900" />}
              <span>{isProjectsView ? "Inter-Campus Project & Team Finder" : "Campus Career & Tech Radar"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              {isProjectsView ? "Projects & Teams" : "Opportunities & Events"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
              {isProjectsView 
                ? "Find student teammates for hackathons, capstone projects, and tech builds across all 3 NIAT campuses."
                : "Explore hackathons, internships, scholarships, GSoC, and tech events curated for NIAT students."}
            </p>
          </div>

          {!isProjectsView && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="shrink-0 px-5 py-3 bg-red-900 text-white rounded-2xl text-xs font-extrabold hover:bg-red-950 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Opportunity</span>
            </button>
          )}
        </div>

        {/* Categories Tab Row */}
        <div className="pt-4 border-t border-neutral-100 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoriesList.map(cat => {
              const isSelected = categoryFilter === cat;
              const isProjectTab = cat === 'Projects & Teams';
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? isProjectTab
                        ? 'bg-red-900 text-white shadow-xs ring-2 ring-red-900/20'
                        : 'bg-red-900 text-white shadow-xs'
                      : isProjectTab
                        ? 'bg-red-50 text-red-900 border border-red-200/80 hover:bg-red-100'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {isProjectTab && <Briefcase className="w-3.5 h-3.5" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {!isProjectsView && (
            <div className="relative max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunity title, org, or skill..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main View Content: Either Projects & Teams OR Opportunity Cards */}
      {isProjectsView ? (
        <ProjectsPage embedded={true} />
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-neutral-800">No opportunities found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                No active postings matching "{categoryFilter}" {searchQuery ? `and "${searchQuery}"` : ''}. Try resetting your search filters or be the first to post!
              </p>
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setSearchQuery('');
                }}
                className="mt-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            /* Grid of Opportunities */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                        {opp.category}
                      </span>

                      <div className="flex items-center gap-2">
                        <CampusBadge campus={opp.postedByCampus} size="sm" />

                        {currentUser && (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === opp.id ? null : opp.id)}
                              className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                              title="Post options"
                              aria-label="Post options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === opp.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setOpenMenuId(null)} 
                                />
                                <div className="absolute right-0 mt-1 z-20 w-44 bg-white rounded-2xl shadow-lg border border-neutral-200 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
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
                                        setOpenMenuId(null);
                                        handleStartEdit(opp);
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
                                        setOpenMenuId(null);
                                        setDeleteError(null);
                                        setOppToDelete(opp);
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
                                        setOpenMenuId(null);
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

                    {/* Title & Org */}
                    <div>
                      <h3 className="text-base font-extrabold text-neutral-900">{opp.title}</h3>
                      <p className="text-xs font-bold text-red-900 mt-0.5">{opp.organization}</p>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                      {opp.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {opp.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-[11px] font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 text-[11px] text-neutral-500 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{opp.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-900 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deadline: {opp.deadline}</span>
                      </div>
                    </div>

                    <a
                      href={opp.externalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Apply / Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Post Opportunity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900">Post New Opportunity</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. NIAT Inter-Campus CodeSprint 2026"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Organization / Host</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Google, NIAT AI Club"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                  >
                    {categoriesList.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the opportunity, eligibility, prizes, or benefits..."
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote, NRI Campus Auditorium"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">External Application Link</label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. Hackathon, React, Remote, Paid"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-900 text-white hover:bg-red-950 shadow-xs"
                >
                  Post Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {oppToDelete && (
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
                  setOppToDelete(null);
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
                  setOppToDelete(null);
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

      {/* --- EDIT OPPORTUNITY MODAL --- */}
      {oppToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Edit Opportunity</h3>
                <p className="text-xs text-neutral-500 font-medium">Update opportunity posting details</p>
              </div>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  setOppToEdit(null);
                  setUpdateError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpdate} className="space-y-4">
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
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
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
                    setOppToEdit(null);
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
