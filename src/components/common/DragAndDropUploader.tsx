import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { uploadImageToFirebaseStorageWithProgress } from '../../services/imageUploadService';

interface DragAndDropUploaderProps {
  label: string;
  folder?: string;
  currentImageUrl?: string;
  onImageUploaded: (downloadUrl: string) => void;
  aspectRatioHint?: string;
}

export const DragAndDropUploader: React.FC<DragAndDropUploaderProps> = ({
  label,
  folder = 'branding',
  currentImageUrl,
  onImageUploaded,
  aspectRatioHint = 'Recommended: PNG, JPG, SVG or WebP up to 10MB'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Selected file is not an image. Please drop a valid image file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image file size exceeds 10MB limit.' });
      return;
    }

    setSelectedFile(file);
    setStatusMessage(null);

    // Create local preview URL for immediate browser inspection before uploading
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setStatusMessage(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage(null);

    const result = await uploadImageToFirebaseStorageWithProgress(
      selectedFile,
      folder,
      (progress) => {
        setUploadProgress(progress);
      }
    );

    setIsUploading(false);

    if (result.success && result.downloadUrl) {
      setStatusMessage({
        type: 'success',
        text: 'Logo uploaded to Firebase Storage and synchronized across all devices!'
      });
      onImageUploaded(result.downloadUrl);
      setSelectedFile(null);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Upload failed. Please check network and try again.'
      });
    }
  };

  const activeDisplayImage = previewUrl || currentImageUrl;

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
          {label}
        </label>
        {aspectRatioHint && (
          <span className="text-[11px] text-neutral-600 font-medium">{aspectRatioHint}</span>
        )}
      </div>

      {/* Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-5 transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[160px] ${
          dragActive
            ? 'border-red-900 bg-red-50/80 shadow-md scale-[1.01]'
            : selectedFile
            ? 'border-red-300 bg-neutral-50/80'
            : 'border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />

        {activeDisplayImage ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <div className="relative shrink-0 w-24 h-24 rounded-xl border border-neutral-200 bg-white p-2 shadow-xs flex items-center justify-center overflow-hidden">
              <img
                src={activeDisplayImage}
                alt="Logo Preview"
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex-1 text-left space-y-1 overflow-hidden w-full">
              {selectedFile ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-neutral-900 truncate">{selectedFile.name}</p>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSelection();
                        }}
                        className="p-1 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-800 transition-colors"
                        title="Remove selection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB — Ready for Firebase Storage
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-neutral-900">Current Active Logo</p>
                  <p className="text-[11px] text-neutral-600 truncate max-w-md">{currentImageUrl}</p>
                  <p className="text-[11px] text-red-900 font-semibold pt-1">
                    Click or drag a new image file here to replace
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-900 flex items-center justify-center mx-auto shadow-xs border border-red-100">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-neutral-900">
                Drag & Drop image from File Explorer
              </p>
              <p className="text-[11px] text-neutral-600">
                or <span className="text-red-900 font-bold underline">Choose Image file from computer</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="space-y-1.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
          <div className="flex justify-between items-center text-xs font-semibold text-neutral-700">
            <span className="flex items-center gap-1.5 text-red-900">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Uploading to Firebase Storage...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-red-900 h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      {selectedFile && !isUploading && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleStartUpload}
            className="flex-1 px-4 py-2.5 bg-red-900 hover:bg-red-950 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Save / Update Logo to Firebase Storage</span>
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
