import React from 'react';
import { Bell, Check, UserPlus, MessageSquare, Briefcase, Sparkles } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';

export const NotificationsPage: React.FC = () => {
  const storage = useStorage();
  const notifications = storage.getNotifications();

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 border border-red-200 text-xs font-bold mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Activity Logs</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900">Notifications</h1>
        </div>

        <button
          onClick={() => storage.markAllNotificationsRead()}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors"
        >
          Mark All Read
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 text-xs text-neutral-400">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                n.read
                  ? 'bg-white border-neutral-200 text-neutral-700'
                  : 'bg-red-50/50 border-red-200 text-neutral-900 shadow-2xs font-medium'
              }`}
            >
              <div className="p-2 rounded-xl bg-neutral-100 text-red-900 shrink-0">
                {n.type === 'connection_request' && <UserPlus className="w-4 h-4" />}
                {n.type === 'connection_accepted' && <Check className="w-4 h-4 text-emerald-600" />}
                {n.type === 'new_message' && <MessageSquare className="w-4 h-4 text-blue-600" />}
                {n.type === 'project_application' && <Briefcase className="w-4 h-4 text-amber-600" />}
                {(n.type === 'post_like' || n.type === 'post_comment') && <Sparkles className="w-4 h-4 text-purple-600" />}
              </div>

              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-semibold">{n.actorName} {n.message}</p>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
