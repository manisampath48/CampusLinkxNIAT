import React, { useRef, useState } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  RotateCcw 
} from 'lucide-react';
import { COVER_PRESETS } from './profileConstants';
import { uploadImageToFirebaseStorageWithProgress } from '../../services/imageUploadService';

interface CoverPresetModalProps {
  currentPreset?: string;
  customCoverUrl?: string;
  onClose: () => void;
  onSavePreset: (presetId: string) => Promise<void>;
  onSaveCustomCover: (url: string) => Promise<void>;
  onResetCover: () => Promise<void>;
}

export const CoverPresetModal: React.FC<CoverPresetModalProps> = ({
  currentPreset = 'crimson_mesh',
  customCoverUrl = '',
  onClose,
  onSavePreset,
  onSaveCustomCover,
  onResetCover
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreset, setSelectedPreset] = useState(currentPreset);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleApplyPreset = async (presetId: string) => {
    setSelectedPreset(presetId);
    setIsSaving(true);
    try {
      await onSavePreset(presetId);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);

    try {
      const res = await uploadImageToFirebaseStorageWithProgress(
        file,
        'covers',
        (progress) => setUploadProgress(progress)
      );

      if (res.success && res.downloadUrl) {
        await onSaveCustomCover(res.downloadUrl);
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to upload cover banner.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error uploading cover banner.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onResetCover();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-900" />
              <span>Customize Profile Cover</span>
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Choose a minimalist CampusLink theme or upload your own banner.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preset Styles */}
          <div>
            <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-3">
              Curated CampusLink Themes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COVER_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id && !customCoverUrl;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    disabled={isSaving}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 relative overflow-hidden group cursor-pointer ${
                      isSelected 
                        ? 'border-red-900 ring-2 ring-red-900/20 shadow-md' 
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {/* Background Preview */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${preset.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    <div className="absolute inset-0 bg-black/20" />
                    
                    {/* Content */}
                    <div className="relative z-10 flex items-start justify-between w-full">
                      <span className="text-xs font-black text-white drop-shadow-xs">{preset.name}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-white text-red-900 flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="relative z-10 text-[10px] text-white/80 font-medium drop-shadow-xs">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload Custom Cover */}
          <div className="pt-4 border-t border-neutral-100">
            <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-2">
              Upload Custom Banner
            </h4>
            <p className="text-xs text-neutral-500 font-medium mb-3">
              Recommended resolution: 1200 × 400px (JPG or PNG, max 10MB).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-red-900/50 bg-neutral-50/50 hover:bg-red-50/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-red-900 animate-spin" />
                  <span className="text-xs font-bold text-neutral-700">Uploading banner ({uploadProgress}%)...</span>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-white group-hover:bg-red-50 text-neutral-600 group-hover:text-red-900 shadow-xs border border-neutral-200 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800">
                    Click to select banner image
                  </span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
