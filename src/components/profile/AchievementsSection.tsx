import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Medal, 
  Scroll, 
  Target, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Building2, 
  X, 
  Check, 
  Edit3 
} from 'lucide-react';
import { StructuredAchievement } from '../../types';

interface AchievementsSectionProps {
  achievements?: string[];
  structuredAchievements?: StructuredAchievement[];
  isSelf: boolean;
  isPreviewMode: boolean;
  onSaveAchievements: (structured: StructuredAchievement[], legacy: string[]) => Promise<void>;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements = [],
  structuredAchievements = [],
  isSelf,
  isPreviewMode,
  onSaveAchievements
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<StructuredAchievement[]>(() => {
    if (structuredAchievements && structuredAchievements.length > 0) {
      return [...structuredAchievements];
    }
    // Convert legacy strings to initial structured items if available
    return achievements.map((ach, idx) => ({
      id: `ach_${idx}_${Date.now()}`,
      title: ach,
      type: ach.toLowerCase().includes('certificate') ? 'certification' : 'award',
    }));
  });

  // New item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newType, setNewType] = useState<StructuredAchievement['type']>('award');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    if (structuredAchievements && structuredAchievements.length > 0) {
      setItems([...structuredAchievements]);
    } else {
      setItems(achievements.map((ach, idx) => ({
        id: `ach_${idx}_${Date.now()}`,
        title: ach,
        type: 'award'
      })));
    }
    setIsEditing(true);
  };

  const handleAddItem = () => {
    if (!newTitle.trim()) return;
    const newItem: StructuredAchievement = {
      id: `ach_${Date.now()}`,
      title: newTitle.trim(),
      organization: newOrg.trim() || undefined,
      date: newDate.trim() || undefined,
      description: newDesc.trim() || undefined,
      link: newLink.trim() || undefined,
      type: newType
    };

    setItems([...items, newItem]);
    setNewTitle('');
    setNewOrg('');
    setNewDate('');
    setNewDesc('');
    setNewLink('');
    setShowAddForm(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const legacyStrings = items.map(i => i.title);
      await onSaveAchievements(items, legacyStrings);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getBadgeIcon = (type?: string) => {
    switch (type) {
      case 'award': return <Trophy className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'certification': return <Scroll className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'competition': return <Medal className="w-4 h-4 text-emerald-500 shrink-0" />;
      default: return <Target className="w-4 h-4 text-purple-500 shrink-0" />;
    }
  };

  const displayList = structuredAchievements && structuredAchievements.length > 0 
    ? structuredAchievements 
    : achievements.map((ach, idx) => ({
        id: `disp_${idx}`,
        title: ach,
        type: 'award' as const
      }));

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" />
          <h2 className="text-base font-extrabold text-neutral-900">Honors & Achievements</h2>
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
            {displayList.map((ach) => (
              <div 
                key={ach.id}
                className="p-4 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 hover:bg-white transition-all space-y-1.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getBadgeIcon(ach.type)}
                    <h3 className="text-xs sm:text-sm font-black text-neutral-900">{ach.title}</h3>
                  </div>

                  {ach.link && (
                    <a
                      href={ach.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-400 hover:text-red-900 transition-colors p-1"
                      title="View verification link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {ach.description && (
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed pl-6">
                    {ach.description}
                  </p>
                )}

                {(ach.organization || ach.date) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-medium pl-6 pt-1">
                    {ach.organization && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-neutral-400" />
                        <span>{ach.organization}</span>
                      </span>
                    )}
                    {ach.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        <span>{ach.date}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
            <p className="text-xs font-semibold text-neutral-500 mb-2">
              {isSelf 
                ? 'Highlight awards, competitive rankings, scholarships, or academic milestones.'
                : 'No achievements listed yet.'
              }
            </p>
            {isSelf && !isPreviewMode && (
              <button
                onClick={handleStartEdit}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Achievement</span>
              </button>
            )}
          </div>
        )
      ) : (
        /* Edit Mode */
        <div className="space-y-4 animate-in fade-in">
          
          {/* Existing items list */}
          <div className="space-y-2">
            {items.map((ach) => (
              <div 
                key={ach.id}
                className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getBadgeIcon(ach.type)}
                  <span className="text-xs font-bold text-neutral-900 truncate">{ach.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(ach.id)}
                  className="p-1 text-neutral-400 hover:text-red-700 rounded-lg hover:bg-neutral-100 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Achievement Form */}
          {showAddForm ? (
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900">New Achievement</h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 1st Place - Annamacharya CodeSprint"
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Organization / Issuer</label>
                  <input
                    type="text"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    placeholder="e.g. NIAT, IEEE, Google"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Year / Date</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="e.g. Nov 2025"
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Short Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Briefly describe your project or competition challenge..."
                  className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Verification / Certificate Link</label>
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all"
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
              <span>Add New Achievement</span>
            </button>
          )}

          {/* Save / Cancel */}
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
              <span>{isSaving ? 'Saving...' : 'Save Achievements'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
