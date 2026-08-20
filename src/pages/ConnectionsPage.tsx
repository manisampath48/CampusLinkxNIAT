import React, { useState } from 'react';
import { Users, MessageSquare, Check } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { UserProfile } from '../types';
import { CampusBadge } from '../components/common/Badge';

interface ConnectionsPageProps {
  onViewProfile: (profile: UserProfile) => void;
  onOpenMessage: (otherUser: UserProfile) => void;
}

export const ConnectionsPage: React.FC<ConnectionsPageProps> = ({ onViewProfile, onOpenMessage }) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const connections = storage.getConnections();
  const profiles = storage.getProfiles();

  const [activeTab, setActiveTab] = useState<'connected' | 'pending' | 'sent'>('connected');

  if (!currentUser) return null;

  // Connected users
  const connectedUserIds = connections
    .filter(c => c.status === 'accepted' && (c.senderId === currentUser.uid || c.receiverId === currentUser.uid))
    .map(c => (c.senderId === currentUser.uid ? c.receiverId : c.senderId));

  const connectedProfiles = profiles.filter(p => connectedUserIds.includes(p.uid));

  // Pending incoming requests
  const pendingRequests = connections.filter(
    c => c.status === 'pending' && c.receiverId === currentUser.uid
  );
  const pendingProfiles = pendingRequests.map(c => profiles.find(p => p.uid === c.senderId)).filter(Boolean) as UserProfile[];

  // Sent requests
  const sentRequests = connections.filter(
    c => c.status === 'pending' && c.senderId === currentUser.uid
  );
  const sentProfiles = sentRequests.map(c => profiles.find(p => p.uid === c.receiverId)).filter(Boolean) as UserProfile[];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 border border-red-200 text-xs font-bold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Inter-Campus Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            My Connections
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
            Manage your student connections and connection requests across Annamacharya, NRI, and Chalapathi campuses.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 gap-6 text-xs font-extrabold">
          <button
            onClick={() => setActiveTab('connected')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'connected'
                ? 'border-red-900 text-red-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            Connected ({connectedProfiles.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 border-b-2 transition-all relative cursor-pointer ${
              activeTab === 'pending'
                ? 'border-red-900 text-red-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            Pending Requests ({pendingProfiles.length})
            {pendingProfiles.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white text-[10px] rounded-full">
                {pendingProfiles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'border-red-900 text-red-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            Sent Requests ({sentProfiles.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'connected' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectedProfiles.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-neutral-200">
              <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-neutral-800">No connections yet.</p>
              <p className="text-xs text-neutral-500 mt-1">Visit the Student Directory to discover students across campuses!</p>
            </div>
          ) : (
            connectedProfiles.map((student) => (
              <div
                key={student.uid}
                className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                      alt={student.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                    <div>
                      <h3
                        onClick={() => onViewProfile(student)}
                        className="font-extrabold text-sm text-neutral-900 hover:text-red-900 cursor-pointer"
                      >
                        {student.name}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium">{student.year} • {student.branch}</p>
                    </div>
                  </div>

                  <CampusBadge campus={student.campus} size="sm" />
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenMessage(student)}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>

                  <button
                    onClick={() => storage.removeConnection(student.uid)}
                    className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingProfiles.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-neutral-200">
              <p className="text-sm font-bold text-neutral-800">No pending connection requests.</p>
            </div>
          ) : (
            pendingProfiles.map((student) => (
              <div
                key={student.uid}
                className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={student.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                    alt={student.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900">{student.name}</h3>
                    <p className="text-xs text-neutral-500 font-medium">{student.campus} • {student.year}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => storage.acceptConnectionRequest(student.uid)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => storage.rejectConnectionRequest(student.uid)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sentProfiles.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-neutral-200">
              <p className="text-sm font-bold text-neutral-800">No outgoing pending requests.</p>
            </div>
          ) : (
            sentProfiles.map((student) => (
              <div
                key={student.uid}
                className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={student.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                    alt={student.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900">{student.name}</h3>
                    <p className="text-xs text-neutral-500 font-medium">{student.campus}</p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                  Pending Approval
                </span>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
