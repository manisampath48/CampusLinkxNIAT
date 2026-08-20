import React, { useState } from 'react';
import { User, Edit3, Check, X, Sparkles } from 'lucide-react';

interface AboutSectionProps {
  bio?: string;
  isSelf: boolean;
  isPreviewMode: boolean;
  onSaveBio: (newBio: string) => Promise<void>;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  bio = '',
  isSelf,
  isPreviewMode,
  onSaveBio,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState(bio);
  const [isSaving, setIsSaving] = useState(false);
  const maxChars = 750;

  const handleStartEdit = () => {
    setBioInput(bio);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setBioInput(bio);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveBio(bioInput.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const remainingChars = maxChars - bioInput.length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-4 relative">
      
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
          <User className="w-4 h-4 text-red-900" />
          <span>About Me</span>
        </h2>

        {isSelf && !isPreviewMode && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
            <span>Edit Bio</span>
          </button>
        )}
      </div>

      {/* Card Body */}
      {!isEditing ? (
        bio && bio.trim().length > 0 ? (
          <div className="text-sm text-neutral-700 leading-relaxed font-medium whitespace-pre-line bg-neutral-50/50 p-4 sm:p-5 rounded-2xl border border-neutral-100">
            {bio}
          </div>
        ) : (
          <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
            <p className="text-xs font-semibold text-neutral-500 max-w-md mx-auto mb-3">
              {isSelf 
                ? 'Introduce yourself to the NIAT campus community. Share your technical passions, what you are building, and collaboration interests.'
                : 'This student hasn’t added a detailed bio yet.'
              }
            </p>
            {isSelf && !isPreviewMode && (
              <button
                onClick={handleStartEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Your Bio</span>
              </button>
            )}
          </div>
        )
      ) : (
        /* Inline Editor */
        <div className="space-y-3 pt-1">
          <div className="relative">
            <textarea
              value={bioInput}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setBioInput(e.target.value);
                }
              }}
              rows={4}
              placeholder="Write a concise overview of your background, engineering passions, active projects, and academic goals..."
              className="w-full p-4 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs sm:text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all resize-y"
            />
            <div className="flex justify-between items-center px-1 mt-1 text-[11px] font-semibold text-neutral-400">
              <span>Supports multiline text</span>
              <span className={remainingChars < 50 ? 'text-amber-600 font-bold' : ''}>
                {remainingChars} characters remaining
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Bio'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
