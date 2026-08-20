import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Flag 
} from 'lucide-react';
import { StudentShowcase } from '../../types';
import { storage } from '../../services/storage';

interface ReportShowcaseModalProps {
  showcase: StudentShowcase;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  'Inappropriate or offensive content',
  'Spam or misleading project information',
  'Fake application or stolen project demo',
  'Copyright or intellectual property violation',
  'Broken links or non-functional demonstration',
  'Other policy violation'
];

export const ReportShowcaseModal: React.FC<ReportShowcaseModalProps> = ({
  showcase,
  onClose,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedReason) {
      setError('Please select a reason for reporting.');
      return;
    }

    try {
      setIsSubmitting(true);
      await storage.reportShowcase(showcase.id, selectedReason, details.trim());
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-5 relative">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="p-3 bg-red-50 text-red-900 rounded-2xl border border-red-100 shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-900">Report Showcase</h3>
            <p className="text-xs font-semibold text-neutral-500 truncate max-w-[240px]">
              {showcase.projectTitle}
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-black text-emerald-900">Report Submitted</h4>
            <p className="text-xs text-emerald-700 font-medium leading-relaxed">
              Thank you for keeping CampusLink safe. Our student moderation team will review this project showcase.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-900 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-900 uppercase tracking-wider block">
                Why are you reporting this project?
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'bg-red-50/70 border-red-300 text-red-950 font-bold'
                        : 'bg-neutral-50/80 border-neutral-200/80 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="mt-0.5 text-red-900 focus:ring-red-900"
                    />
                    <span className="leading-snug">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-neutral-900 uppercase tracking-wider block">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please describe why this project showcase violates guidelines..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
