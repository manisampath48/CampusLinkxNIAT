import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  MessageSquare, 
  Search, 
  ArrowLeft, 
  Lock, 
  Sparkles, 
  User, 
  X, 
  Check, 
  CheckCheck,
  Building2,
  Users,
  Smile,
  AlertCircle,
  ExternalLink,
  Phone,
  Video,
  Info,
  Circle
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { UserProfile, Message } from '../types';
import { VerifiedBadge, CampusBadge } from '../components/common/Badge';

interface MessagesPageProps {
  initialChatUser?: UserProfile | null;
  onViewStudentProfile?: (profile: UserProfile) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ 
  initialChatUser = null,
  onViewStudentProfile 
}) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const connections = storage.getConnections();
  const profiles = storage.getProfiles();
  const allMessages = storage.getAllMessages?.() || [];

  // Connected users list
  const connectedUserIds = useMemo(() => {
    if (!currentUser) return [];
    return connections
      .filter(c => c.status === 'accepted' && (c.senderId === currentUser.uid || c.receiverId === currentUser.uid))
      .map(c => (c.senderId === currentUser.uid ? c.receiverId : c.senderId));
  }, [connections, currentUser]);

  const connectedProfiles = useMemo(() => {
    return profiles.filter(p => connectedUserIds.includes(p.uid));
  }, [profiles, connectedUserIds]);

  // Search filter for conversation list
  const [searchQuery, setSearchQuery] = useState('');

  // Active chat target: on desktop we can auto-select first conversation or initialChatUser; on mobile start with list
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(() => {
    if (initialChatUser) return initialChatUser;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return null;
    }
    return connectedProfiles.length > 0 ? connectedProfiles[0] : null;
  });

  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sync initialChatUser if changed externally
  useEffect(() => {
    if (initialChatUser) {
      setSelectedUser(initialChatUser);
    }
  }, [initialChatUser]);

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (selectedUser && currentUser) {
      storage.markChatAsRead(selectedUser.uid);
    }
  }, [selectedUser, currentUser, allMessages.length]);

  // Active conversation messages
  const activeMessages = useMemo(() => {
    if (!selectedUser || !currentUser) return [];
    return storage.getChatMessages(selectedUser.uid);
  }, [selectedUser, currentUser, allMessages]);

  // Auto scroll to bottom of chat when new message arrives or selected user changes
  useEffect(() => {
    if (activeMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, selectedUser?.uid]);

  // Focus input when user is selected on desktop
  useEffect(() => {
    if (selectedUser && typeof window !== 'undefined' && window.innerWidth >= 768) {
      chatInputRef.current?.focus();
    }
  }, [selectedUser?.uid]);

  // Conversation metadata (last message, unread count, timestamp) for each connected user
  const conversationList = useMemo(() => {
    if (!currentUser) return [];

    // Also include any user who has exchanged messages with currentUser
    const allChatPartnerIds = new Set<string>(connectedUserIds);
    allMessages.forEach(m => {
      if (m.senderId === currentUser.uid && m.receiverId) {
        allChatPartnerIds.add(m.receiverId);
      }
      if (m.receiverId === currentUser.uid && m.senderId) {
        allChatPartnerIds.add(m.senderId);
      }
    });

    const partnerProfiles = profiles.filter(p => allChatPartnerIds.has(p.uid) && p.uid !== currentUser.uid);

    const list = partnerProfiles.map(peer => {
      // Find all messages between currentUser and peer
      const peerMessages = allMessages.filter(
        m => (m.senderId === currentUser.uid && m.receiverId === peer.uid) ||
             (m.senderId === peer.uid && m.receiverId === currentUser.uid)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const lastMessage = peerMessages.length > 0 ? peerMessages[peerMessages.length - 1] : null;
      const unreadCount = peerMessages.filter(m => m.senderId === peer.uid && m.receiverId === currentUser.uid && !m.read).length;

      return {
        peer,
        lastMessage,
        unreadCount,
        lastTimestamp: lastMessage ? new Date(lastMessage.createdAt).getTime() : 0,
      };
    });

    // Sort by latest message timestamp descending, then alphabetical
    list.sort((a, b) => {
      if (b.lastTimestamp !== a.lastTimestamp) {
        return b.lastTimestamp - a.lastTimestamp;
      }
      return (a.peer.name || '').localeCompare(b.peer.name || '');
    });

    // Apply search query filter
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => {
      const nameMatch = (item.peer.name || '').toLowerCase().includes(q);
      const campusMatch = (item.peer.campus || '').toLowerCase().includes(q);
      const branchMatch = (item.peer.branch || '').toLowerCase().includes(q);
      const msgMatch = item.lastMessage ? item.lastMessage.content.toLowerCase().includes(q) : false;
      return nameMatch || campusMatch || branchMatch || msgMatch;
    });
  }, [currentUser, connectedUserIds, allMessages, profiles, searchQuery]);

  // Group active messages by date for clean readable sections
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; messages: Message[] }[] = [];

    activeMessages.forEach(msg => {
      const msgDate = new Date(msg.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label = msgDate.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });

      if (msgDate.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      }

      const existingGroup = groups.find(g => g.dateLabel === label);
      if (existingGroup) {
        existingGroup.messages.push(msg);
      } else {
        groups.push({ dateLabel: label, messages: [msg] });
      }
    });

    return groups;
  }, [activeMessages]);

  if (!currentUser) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !inputMsg.trim() || isSending) return;

    try {
      setIsSending(true);
      setErrorState(null);
      storage.sendMessage(selectedUser.uid, inputMsg.trim());
      setInputMsg('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setErrorState('Unable to send message. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPromptClick = (text: string) => {
    setInputMsg(text);
    chatInputRef.current?.focus();
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatListTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-w-0">
      {/* Main Two-Panel Layout Container */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden h-[calc(100vh-140px)] min-h-[580px] max-h-[840px] flex flex-col md:flex-row min-w-0">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Conversations List */}
        {/* ========================================================================= */}
        <div 
          className={`w-full md:w-80 lg:w-96 border-r border-neutral-200/80 flex flex-col bg-white shrink-0 min-w-0 ${
            selectedUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Left Panel Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 space-y-3 shrink-0 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">Messages</h1>
                <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {conversationList.length}
                </span>
              </div>

              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Lock className="w-2.5 h-2.5" />
                <span>Encrypted</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-8 py-2 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-2xl border border-neutral-200 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100/80 p-2 sm:p-2.5 space-y-1">
            {conversationList.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-400 flex items-center justify-center mx-auto border border-neutral-200/60">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-800">
                    {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                  </p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
                    {searchQuery 
                      ? 'Try searching with another name or campus.' 
                      : 'Connect with students in the Student Hub or Campus Explorer to start messaging.'}
                  </p>
                </div>
              </div>
            ) : (
              conversationList.map(({ peer, lastMessage, unreadCount, lastTimestamp }) => {
                const isSelected = selectedUser?.uid === peer.uid;
                const isSentByMe = lastMessage?.senderId === currentUser.uid;

                return (
                  <button
                    key={peer.uid}
                    type="button"
                    onClick={() => {
                      setSelectedUser(peer);
                    }}
                    className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer group relative min-w-0 ${
                      isSelected
                        ? 'bg-red-50/90 text-neutral-900 border border-red-200/80 shadow-2xs'
                        : 'hover:bg-neutral-50/90 text-neutral-800 border border-transparent'
                    }`}
                  >
                    {/* Active Accent Bar */}
                    {isSelected && (
                      <div className="absolute left-1.5 top-3 bottom-3 w-1 bg-red-900 rounded-full" />
                    )}

                    {/* Avatar with fallback & campus badge ring */}
                    <div className="relative shrink-0 ml-1">
                      <img
                        src={peer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name || 'Student')}&background=800000&color=fff&bold=true`}
                        alt={peer.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className={`w-11 h-11 rounded-full object-cover ring-2 transition-all ${
                          isSelected ? 'ring-red-900/30' : 'ring-neutral-200 group-hover:ring-neutral-300'
                        }`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name || 'Student')}&background=800000&color=fff&bold=true`;
                        }}
                      />
                      {/* Active student indicator */}
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs truncate ${isSelected ? 'font-black text-red-950' : 'font-extrabold text-neutral-900'}`}>
                            {peer.name}
                          </span>
                          {peer.isVerified && <VerifiedBadge size="sm" showText={false} />}
                        </div>
                        {lastTimestamp > 0 && (
                          <span className={`text-[10px] shrink-0 font-mono ${isSelected ? 'text-red-900 font-bold' : 'text-neutral-400'}`}>
                            {formatListTimestamp(lastMessage?.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-500 font-medium truncate mb-1">
                        {peer.campus?.split(' ')[0] || 'Campus'} • {peer.year || ''} {peer.branch || ''}
                      </p>

                      {/* Last Message Preview & Unread Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate flex-1 ${
                          unreadCount > 0 
                            ? 'font-extrabold text-neutral-900' 
                            : isSelected ? 'text-neutral-700' : 'text-neutral-500'
                        }`}>
                          {lastMessage ? (
                            <>
                              {isSentByMe && <span className="text-neutral-400 font-normal mr-1">You:</span>}
                              {lastMessage.content}
                            </>
                          ) : (
                            <span className="italic text-neutral-400">Connected • Say hello</span>
                          )}
                        </p>

                        {unreadCount > 0 && (
                          <span className="shrink-0 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-black rounded-full shadow-2xs animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Active Chat or Empty State */}
        {/* ========================================================================= */}
        <div 
          className={`flex-1 flex flex-col h-full bg-neutral-50/40 min-w-0 ${
            selectedUser ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedUser ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-neutral-200/80 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden p-2 -ml-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div 
                    className="flex items-center gap-3 cursor-pointer group min-w-0"
                    onClick={() => {
                      if (onViewStudentProfile) onViewStudentProfile(selectedUser);
                    }}
                  >
                    <img
                      src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'Student')}&background=800000&color=fff&bold=true`}
                      alt={selectedUser.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-red-900/20 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'Student')}&background=800000&color=fff&bold=true`;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-extrabold text-xs sm:text-sm text-neutral-900 truncate group-hover:text-red-900 transition-colors">
                          {selectedUser.name}
                        </h2>
                        {selectedUser.isVerified && <VerifiedBadge size="sm" showText={false} />}
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium truncate">
                        {selectedUser.campus} • {selectedUser.year} {selectedUser.branch}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:block">
                    <CampusBadge campus={selectedUser.campus} size="sm" />
                  </div>
                  {onViewStudentProfile && (
                    <button
                      type="button"
                      onClick={() => onViewStudentProfile(selectedUser)}
                      className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      title="View Student Profile"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Error Banner (if any) */}
              {errorState && (
                <div className="p-3 bg-red-50 border-b border-red-200 text-red-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                    <span>{errorState}</span>
                  </div>
                  <button 
                    onClick={() => setErrorState(null)}
                    className="p-1 hover:bg-red-100 rounded-lg text-red-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Messages Stream */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 min-w-0">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                    <div className="w-14 h-14 rounded-3xl bg-red-50 text-red-900 border border-red-200/80 flex items-center justify-center shadow-xs">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h3 className="text-sm font-extrabold text-neutral-900">
                        Start conversation with {selectedUser.name}
                      </h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        This is the start of your direct private messaging on CampusLink. Send a message to collaborate or connect!
                      </p>
                    </div>

                    {/* Quick Conversation Starters */}
                    <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-md">
                      <button
                        type="button"
                        onClick={() => handleQuickPromptClick("👋 Hi! I saw your profile and would love to connect.")}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                      >
                        👋 Say Hello
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPromptClick("🚀 Hey, are you interested in collaborating on a hackathon project?")}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                      >
                        🚀 Hackathon Project
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPromptClick(`🤝 Hello! How is the tech ecosystem at ${selectedUser.campus.split(' ')[0]}?`)}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                      >
                        🏫 Campus Tech
                      </button>
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.dateLabel} className="space-y-3">
                      {/* Date Divider */}
                      <div className="flex items-center justify-center my-2">
                        <span className="px-3 py-1 bg-neutral-200/80 text-neutral-600 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-2xs">
                          {group.dateLabel}
                        </span>
                      </div>

                      {/* Messages in this Date Group */}
                      {group.messages.map((m) => {
                        const isMine = m.senderId === currentUser.uid;
                        return (
                          <div
                            key={m.id}
                            className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isMine && (
                              <img
                                src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'Student')}&background=800000&color=fff&bold=true`}
                                alt={selectedUser.name}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover mb-1 shrink-0 ring-1 ring-neutral-200"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'Student')}&background=800000&color=fff&bold=true`;
                                }}
                              />
                            )}

                            <div
                              className={`max-w-[85%] sm:max-w-[70%] md:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs transition-all ${
                                isMine
                                  ? 'bg-red-900 text-white rounded-br-xs'
                                  : 'bg-white text-neutral-900 border border-neutral-200/90 rounded-bl-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.content}</p>
                              <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-mono">
                                <span className={isMine ? 'text-red-200' : 'text-neutral-400'}>
                                  {formatMessageTime(m.createdAt)}
                                </span>
                                {isMine && (
                                  <span className="text-red-200">
                                    {m.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form Area */}
              <form 
                onSubmit={handleSend} 
                className="p-3 sm:p-4 bg-white border-t border-neutral-200/80 flex items-center gap-2 shrink-0"
              >
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder={`Message ${selectedUser.name}...`}
                    className="w-full pl-4 pr-4 py-3 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white rounded-2xl border border-neutral-300 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputMsg.trim() || isSending}
                  className="p-3 bg-red-900 hover:bg-red-950 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Empty State when no conversation selected */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto border border-neutral-200/70">
                <MessageSquare className="w-8 h-8 text-red-900/60" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h2 className="text-base font-black text-neutral-900">Select a conversation</h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Choose a student from your conversations on the left to start messaging, share project ideas, or discuss campus events.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

