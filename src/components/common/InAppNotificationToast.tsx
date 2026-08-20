import React, { useEffect, useState } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import { notificationController, ForegroundToast } from '../../services/notificationController';
import { storage } from '../../services/storage';

interface InAppNotificationToastProps {
  onOpenChat: (senderId: string) => void;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({ onOpenChat }) => {
  const [activeToast, setActiveToast] = useState<ForegroundToast | null>(null);

  useEffect(() => {
    // Initialize controller on component mount
    notificationController.init();

    const unsubscribe = notificationController.subscribeToast((toast) => {
      setActiveToast(toast);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const handleOpenChat = () => {
    const targetSenderId = activeToast.senderId;
    setActiveToast(null);
    onOpenChat(targetSenderId);
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl p-4 space-y-3 relative overflow-hidden">
        
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-900" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black text-red-900">
            <MessageSquare className="w-4 h-4 fill-red-100" />
            <span>New Message</span>
          </div>

          <button
            onClick={() => setActiveToast(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex items-start gap-3">
          <img
            src={activeToast.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeToast.senderName)}&background=800000&color=fff&bold=true`}
            alt={activeToast.senderName}
            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-red-900/10"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeToast.senderName)}&background=800000&color=fff&bold=true`;
            }}
          />

          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-xs text-neutral-900 truncate">
              {activeToast.senderName}
            </p>
            {activeToast.senderCampus && (
              <p className="text-[10px] text-neutral-400 truncate">
                {activeToast.senderCampus}
              </p>
            )}
            <p className="text-xs text-neutral-700 mt-1 line-clamp-2 leading-relaxed bg-neutral-50 p-2 rounded-xl border border-neutral-100 italic">
              "{activeToast.content}"
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={handleOpenChat}
            className="px-3.5 py-1.5 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Chat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
