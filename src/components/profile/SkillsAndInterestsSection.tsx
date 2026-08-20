import React, { useState } from 'react';
import { 
  Code2, 
  Sparkles, 
  Plus, 
  X, 
  Edit3, 
  Check, 
  Lightbulb, 
  Hash 
} from 'lucide-react';
import { SUGGESTED_SKILLS, SUGGESTED_INTERESTS } from './profileConstants';

interface SkillsAndInterestsSectionProps {
  skills: string[];
  interests: string[];
  isSelf: boolean;
  isPreviewMode: boolean;
  onSaveSkillsAndInterests: (skills: string[], interests: string[]) => Promise<void>;
}

export const SkillsAndInterestsSection: React.FC<SkillsAndInterestsSectionProps> = ({
  skills = [],
  interests = [],
  isSelf,
  isPreviewMode,
  onSaveSkillsAndInterests
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSkills, setCurrentSkills] = useState<string[]>(skills);
  const [currentInterests, setCurrentInterests] = useState<string[]>(interests);
  
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newInterestInput, setNewInterestInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setCurrentSkills([...skills]);
    setCurrentInterests([...interests]);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setCurrentSkills([...skills]);
    setCurrentInterests([...interests]);
    setNewSkillInput('');
    setNewInterestInput('');
    setIsEditing(false);
  };

  const handleAddSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (currentSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkillInput('');
      return;
    }
    setCurrentSkills([...currentSkills, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCurrentSkills(currentSkills.filter(s => s !== skillToRemove));
  };

  const handleAddInterest = (interestName: string) => {
    const trimmed = interestName.trim();
    if (!trimmed) return;
    if (currentInterests.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setNewInterestInput('');
      return;
    }
    setCurrentInterests([...currentInterests, trimmed]);
    setNewInterestInput('');
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setCurrentInterests(currentInterests.filter(i => i !== interestToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSkillsAndInterests(currentSkills, currentInterests);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-red-900" />
          <span>Technical Skills & Focus</span>
        </h2>

        {isSelf && !isPreviewMode && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
            <span>Edit Skills</span>
          </button>
        )}
      </div>

      {!isEditing ? (
        /* Read-Only Chips View */
        <div className="space-y-5">
          {/* Skills */}
          <div>
            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-red-800" />
              <span>Core Technologies & Frameworks</span>
            </p>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-neutral-50 hover:bg-red-50 text-neutral-800 hover:text-red-950 border border-neutral-200/90 hover:border-red-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No technical skills added yet.</p>
            )}
          </div>

          {/* Interests */}
          <div className="pt-4 border-t border-neutral-100">
            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3 text-amber-600" />
              <span>Interests & Exploration</span>
            </p>

            {interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1 border border-neutral-200/50"
                  >
                    <Hash className="w-3 h-3 text-neutral-400" />
                    <span>{interest}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No areas of interest listed yet.</p>
            )}
          </div>
        </div>
      ) : (
        /* Interactive Editing View */
        <div className="space-y-6 animate-in fade-in">
          
          {/* 1. Skills Management */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
              Technical Skills ({currentSkills.length})
            </label>

            {/* Existing Skills as Removable Chips */}
            <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 min-h-[52px]">
              {currentSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 bg-white text-neutral-900 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs group"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="p-0.5 rounded-md hover:bg-red-50 text-neutral-400 hover:text-red-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {currentSkills.length === 0 && (
                <span className="text-xs text-neutral-400 font-medium py-1">No skills added yet. Add from suggestions below or type custom ones.</span>
              )}
            </div>

            {/* Custom Skill Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(newSkillInput);
                  }
                }}
                placeholder="Type a skill and press Enter (e.g. Next.js, PyTorch)..."
                className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:border-red-900"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(newSkillInput)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Suggestions */}
            <div>
              <p className="text-[11px] font-bold text-neutral-400 mb-1.5">Quick add suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.filter(s => !currentSkills.includes(s)).slice(0, 10).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-red-50 text-neutral-700 hover:text-red-900 border border-neutral-200/80 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Interests Management */}
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
              Areas of Interest ({currentInterests.length})
            </label>

            <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 min-h-[52px]">
              {currentInterests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1.5 bg-white text-neutral-900 border border-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="p-0.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {currentInterests.length === 0 && (
                <span className="text-xs text-neutral-400 font-medium py-1">No interests added yet.</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newInterestInput}
                onChange={(e) => setNewInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInterest(newInterestInput);
                  }
                }}
                placeholder="Type an interest (e.g. Open Source, Cloud Architecture)..."
                className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:border-red-900"
              />
              <button
                type="button"
                onClick={() => handleAddInterest(newInterestInput)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Interest Suggestions */}
            <div>
              <p className="text-[11px] font-bold text-neutral-400 mb-1.5">Suggested interests:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_INTERESTS.filter(i => !currentInterests.includes(i)).slice(0, 8).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddInterest(i)}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{i}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Skills & Interests'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
