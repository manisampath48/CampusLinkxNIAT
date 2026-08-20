import React, { useState } from 'react';
import { 
  Trophy, 
  Terminal, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Users, 
  X, 
  Check, 
  Edit3 
} from 'lucide-react';
import { StructuredHackathon } from '../../types';

interface HackathonsSectionProps {
  hackathons?: string[];
  structuredHackathons?: StructuredHackathon[];
  isSelf: boolean;
  isPreviewMode: boolean;
  onSaveHackathons: (structured: StructuredHackathon[], legacy: string[]) => Promise<void>;
}

export const HackathonsSection: React.FC<HackathonsSectionProps> = ({
  hackathons = [],
  structuredHackathons = [],
  isSelf,
  isPreviewMode,
  onSaveHackathons
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<StructuredHackathon[]>(() => {
    if (structuredHackathons && structuredHackathons.length > 0) {
      return [...structuredHackathons];
    }
    return hackathons.map((h, idx) => ({
      id: `hack_${idx}_${Date.now()}`,
      name: h,
      role: 'Full Stack Developer',
      result: 'Participant'
    }));
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newResult, setNewResult] = useState('Participant');
  const [newTeam, setNewTeam] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newLink, setNewLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    if (structuredHackathons && structuredHackathons.length > 0) {
      setItems([...structuredHackathons]);
    } else {
      setItems(hackathons.map((h, idx) => ({
        id: `hack_${idx}_${Date.now()}`,
        name: h,
        role: 'Developer',
        result: 'Participant'
      })));
    }
    setIsEditing(true);
  };

  const handleAddItem = () => {
    if (!newName.trim()) return;
    const newItem: StructuredHackathon = {
      id: `hack_${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || undefined,
      date: newDate.trim() || undefined,
      result: newResult.trim() || undefined,
      teamName: newTeam.trim() || undefined,
      projectTitle: newProject.trim() || undefined,
      link: newLink.trim() || undefined,
    };

    setItems([...items, newItem]);
    setNewName('');
    setNewRole('');
    setNewDate('');
    setNewResult('Participant');
    setNewTeam('');
    setNewProject('');
    setNewLink('');
    setShowAddForm(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const legacyStrings = items.map(i => i.name);
      await onSaveHackathons(items, legacyStrings);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const displayList = structuredHackathons && structuredHackathons.length > 0 
    ? structuredHackathons 
    : hackathons.map((h, idx) => ({
        id: `disp_hack_${idx}`,
        name: h,
        role: 'Participant',
        result: 'Completed'
      }));

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-red-900" />
          <h2 className="text-base font-extrabold text-neutral-900">Hackathons & Competitions</h2>
          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold">
            {displayList.length}
          </span>
        </div>

        {isSelf && !isPreviewMode && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
            <span>Manage</span>
          </button>
        )}
      </div>

      {!isEditing ? (
        displayList.length > 0 ? (
          <div className="space-y-3">
            {displayList.map((hack) => (
              <div 
                key={hack.id}
                className="p-4 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 hover:bg-white transition-all space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-neutral-900 flex items-center gap-1.5">
                      <span>{hack.name}</span>
                    </h3>
                    {hack.role && (
                      <p className="text-xs font-bold text-neutral-600 mt-0.5">
                        Role: <span className="text-neutral-800">{hack.role}</span>
                        {hack.teamName && <span> • Team: {hack.teamName}</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hack.result && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        hack.result.toLowerCase().includes('winner') || hack.result.toLowerCase().includes('1st')
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {hack.result}
                      </span>
                    )}
                    {hack.link && (
                      <a
                        href={hack.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-400 hover:text-red-900 transition-colors p-1"
                        title="View Hackathon submission"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {hack.projectTitle && (
                  <p className="text-xs text-neutral-600 font-medium">
                    Built: <span className="font-semibold text-neutral-800">{hack.projectTitle}</span>
                  </p>
                )}

                {hack.date && (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium pt-1">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    <span>{hack.date}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
            <p className="text-xs font-semibold text-neutral-500 mb-2">
              {isSelf 
                ? 'Showcase hackathons, 24-hour sprints, and university competitions you participated in.'
                : 'No hackathons listed yet.'
              }
            </p>
            {isSelf && !isPreviewMode && (
              <button
                onClick={handleStartEdit}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hackathon</span>
              </button>
            )}
          </div>
        )
      ) : (
        /* Edit Mode */
        <div className="space-y-4 animate-in fade-in">
          
          <div className="space-y-2">
            {items.map((hack) => (
              <div 
                key={hack.id}
                className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">{hack.name}</p>
                  <p className="text-[11px] text-neutral-500">{hack.role || 'Participant'} • {hack.result || 'Completed'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(hack.id)}
                  className="p-1 text-neutral-400 hover:text-red-700 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900">New Hackathon / Competition</h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Hackathon Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Smart India Hackathon 2025, NIAT Buildathon"
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Your Role</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. Lead Backend Engineer"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Result / Standing</label>
                  <input
                    type="text"
                    value={newResult}
                    onChange={(e) => setNewResult(e.target.value)}
                    placeholder="e.g. 1st Place Winner, Finalist, Top 10"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Team Name (optional)</label>
                  <input
                    type="text"
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    placeholder="e.g. Team ByteCrafters"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Project Title (optional)</label>
                  <input
                    type="text"
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    placeholder="e.g. AgroAI Farmer Assistant"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Year / Date</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="e.g. Oct 2025"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Devpost / Project Link</label>
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Add to List
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-neutral-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Hackathon</span>
            </button>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Hackathons'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
