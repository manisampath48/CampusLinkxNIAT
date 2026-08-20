import React, { useState } from 'react';
import { 
  Briefcase, 
  PlusCircle, 
  Search, 
  X, 
  Sparkles,
  Check,
  MoreVertical,
  Trash2,
  Share2,
  Flag,
  Pencil
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { CampusName, ProjectRequirement } from '../types';
import { CampusBadge } from '../components/common/Badge';
import { canEditContent, canDeleteContent, canManagePost } from '../utils/postPermissions';

export interface ProjectsPageProps {
  embedded?: boolean;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ embedded = false }) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const projects = storage.getProjects();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectForApply, setSelectedProjectForApply] = useState<ProjectRequirement | null>(null);

  // Filters
  const [campusFilter, setCampusFilter] = useState<string>('All');
  const [skillSearch, setSkillSearch] = useState<string>('');
  const [hackathonOnly, setHackathonOnly] = useState<boolean>(false);

  // New Project Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rolesNeededInput, setRolesNeededInput] = useState('');
  const [preferredCampus, setPreferredCampus] = useState<'Any' | CampusName>('Any');
  const [isHackathon, setIsHackathon] = useState(false);
  const [hackathonName, setHackathonName] = useState('');

  // Apply Form State
  const [appliedRole, setAppliedRole] = useState('');
  const [appliedMsg, setAppliedMsg] = useState('');

  // Delete state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectRequirement | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit state
  const [projectToEdit, setProjectToEdit] = useState<ProjectRequirement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartEdit = (proj: ProjectRequirement) => {
    setUpdateError(null);
    setProjectToEdit(proj);
    setEditTitle(proj.title);
    setEditDesc(proj.description);
  };

  const handleConfirmUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;
    setIsUpdating(true);
    setUpdateError(null);

    try {
      await storage.updateProject(projectToEdit.id, {
        title: editTitle,
        description: editDesc,
      });
      setIsUpdating(false);
      setProjectToEdit(null);
      showToast("Project requirement updated successfully!");
    } catch (err: any) {
      console.error("Error updating project:", err);
      setIsUpdating(false);
      setUpdateError(err?.message || "Unable to update project. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await storage.deleteProject(projectToDelete.id);
      setIsDeleting(false);
      setProjectToDelete(null);
      showToast("Post deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting project:", err);
      setIsDeleting(false);
      setDeleteError(err?.message || "Unable to delete post. Please try again.");
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const roles = (rolesNeededInput || '')
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    storage.createProject(
      title,
      description,
      roles.length > 0 ? roles : ['Developer'],
      preferredCampus,
      isHackathon,
      hackathonName.trim() || undefined
    );

    setTitle('');
    setDescription('');
    setRolesNeededInput('');
    setIsHackathon(false);
    setHackathonName('');
    setShowCreateModal(false);
    showToast("Project requirement posted! NIAT students can now apply.");
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForApply || !appliedRole.trim()) return;

    storage.applyToProject(selectedProjectForApply.id, appliedRole, appliedMsg);
    setSelectedProjectForApply(null);
    setAppliedRole('');
    setAppliedMsg('');
    showToast("Application submitted successfully to project lead!");
  };

  const filteredProjects = projects.filter(p => {
    if (campusFilter !== 'All' && p.creatorCampus !== campusFilter && p.preferredCampus !== campusFilter && p.preferredCampus !== 'Any') {
      return false;
    }
    if (hackathonOnly && !p.isHackathon) {
      return false;
    }
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase().trim();
      const matchesTitle = (p.title || '').toLowerCase().includes(q);
      const matchesDesc = (p.description || '').toLowerCase().includes(q);
      const matchesRoles = (p.rolesNeeded || []).some(r => typeof r === 'string' && r.toLowerCase().includes(q));
      if (!matchesTitle && !matchesDesc && !matchesRoles) return false;
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

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 border border-red-200 text-xs font-bold mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Inter-Campus Project & Team Finder</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Project Teammate Requirements
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
              Find student teammates for hackathons, capstone projects, and open-source software builds across NIAT campuses.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 px-5 py-3 bg-red-900 text-white rounded-2xl text-xs font-extrabold hover:bg-red-950 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Project Requirement</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Campus Filter */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 mb-1">Campus Preference</label>
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
            >
              <option value="All">All Campuses</option>
              <option value="Annamacharya × NIAT">Annamacharya × NIAT</option>
              <option value="NRI × NIAT">NRI × NIAT</option>
              <option value="Chalapathi × NIAT">Chalapathi × NIAT</option>
            </select>
          </div>

          {/* Skill Search */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 mb-1">Search Role or Tech</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="e.g. React, Python, UI/UX..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Hackathon Checkbox */}
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
              <input
                type="checkbox"
                checked={hackathonOnly}
                onChange={(e) => setHackathonOnly(e.target.checked)}
                className="w-4 h-4 rounded-md border-neutral-300 text-red-900 focus:ring-red-900"
              />
              <span>Show Hackathons Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjects.map((proj) => {
          const hasApplied = currentUser
            ? proj.applicants.some(a => a.userId === currentUser.uid)
            : false;
          const isOwner = currentUser?.uid === proj.creatorId;

          return (
            <div
              key={proj.id}
              className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Creator & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={proj.creatorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                      alt={proj.creatorName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                    <div>
                      <h4 className="font-extrabold text-xs text-neutral-900">{proj.creatorName}</h4>
                      <p className="text-[11px] text-neutral-500 font-medium">{proj.creatorCampus}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CampusBadge campus={proj.creatorCampus} size="sm" />

                    {currentUser && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === proj.id ? null : proj.id)}
                          className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                          title="Post options"
                          aria-label="Post options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === proj.id && (
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
                                    setOpenMenuId(null);
                                    handleStartEdit(proj);
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
                                    setOpenMenuId(null);
                                    setDeleteError(null);
                                    setProjectToDelete(proj);
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

                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {proj.isHackathon && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        HACKATHON
                      </span>
                    )}
                    <h3 className="text-base font-extrabold text-neutral-900">{proj.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    {proj.description}
                  </p>
                </div>

                {/* Roles Needed Tags */}
                <div>
                  <p className="text-[11px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Looking For Teammates:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {proj.rolesNeeded.map((role) => (
                      <span
                        key={role}
                        className="px-2.5 py-1 bg-red-50 text-red-900 border border-red-200 rounded-lg text-xs font-bold"
                      >
                        + {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-neutral-500">
                  {proj.applicantsCount} Applicant{proj.applicantsCount === 1 ? '' : 's'}
                </span>

                {isOwner ? (
                  <span className="px-3 py-1.5 bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold">
                    Your Posted Requirement
                  </span>
                ) : hasApplied ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedProjectForApply(proj);
                      setAppliedRole(proj.rolesNeeded[0] || 'Developer');
                    }}
                    className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Apply to Join Team
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900">Post Project Requirement</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI Study Assistant for NIAT Students"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Project Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project, goals, tech stack, and what you are building..."
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Roles Needed (comma separated)
                </label>
                <input
                  type="text"
                  value={rolesNeededInput}
                  onChange={(e) => setRolesNeededInput(e.target.value)}
                  placeholder="e.g. React Developer, Python Developer, UI/UX Designer"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Campus Preference
                </label>
                <select
                  value={preferredCampus}
                  onChange={(e) => setPreferredCampus(e.target.value as any)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                >
                  <option value="Any">Any NIAT Campus (Cross-Campus Open)</option>
                  <option value="Annamacharya × NIAT">Annamacharya × NIAT</option>
                  <option value="NRI × NIAT">NRI × NIAT</option>
                  <option value="Chalapathi × NIAT">Chalapathi × NIAT</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isHackathonCheck"
                  checked={isHackathon}
                  onChange={(e) => setIsHackathon(e.target.checked)}
                  className="w-4 h-4 rounded-md border-neutral-300 text-red-900 focus:ring-red-900"
                />
                <label htmlFor="isHackathonCheck" className="text-xs font-bold text-neutral-800">
                  This is for an upcoming Hackathon
                </label>
              </div>

              {isHackathon && (
                <div>
                  <input
                    type="text"
                    value={hackathonName}
                    onChange={(e) => setHackathonName(e.target.value)}
                    placeholder="Hackathon Name (e.g. NIAT CodeSprint 2026)"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}

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
                  Post Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {selectedProjectForApply && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900">Apply for Project</h3>
              <button
                onClick={() => setSelectedProjectForApply(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
              <p className="text-xs font-bold text-neutral-900">{selectedProjectForApply.title}</p>
              <p className="text-[11px] text-neutral-500">Lead: {selectedProjectForApply.creatorName} ({selectedProjectForApply.creatorCampus})</p>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Select Role to Apply For
                </label>
                <select
                  value={appliedRole}
                  onChange={(e) => setAppliedRole(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                >
                  {selectedProjectForApply.rolesNeeded.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Message to Project Lead
                </label>
                <textarea
                  value={appliedMsg}
                  onChange={(e) => setAppliedMsg(e.target.value)}
                  placeholder="Share your relevant skills and experience for this role..."
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProjectForApply(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-900 text-white hover:bg-red-950 shadow-xs"
                >
                  Send Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
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
                  setProjectToDelete(null);
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
                  setProjectToDelete(null);
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

      {/* --- EDIT PROJECT MODAL --- */}
      {projectToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Edit Project</h3>
                <p className="text-xs text-neutral-500 font-medium">Update your project requirement details</p>
              </div>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  setProjectToEdit(null);
                  setUpdateError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpdate} className="space-y-4">
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
                <label className="block text-xs font-bold text-neutral-700 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white focus:outline-hidden"
                  required
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
                    setProjectToEdit(null);
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
