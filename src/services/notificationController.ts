import { storage } from './storage';
import { playNotificationSound } from './audioService';
import { registerDeviceToken } from './fcmService';
import { Message, UserProfile } from '../types';

export interface NotificationSettings {
  messageNotifications: boolean;
  notificationSound: boolean;
  browserNotifications: boolean;
}

export interface ForegroundToast {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderCampus?: string;
  content: string;
  createdAt: string;
}

const SETTINGS_KEY = 'campuslink_notification_settings';
const SEEN_MSGS_KEY = 'campuslink_seen_msg_ids';

const DEFAULT_SETTINGS: NotificationSettings = {
  messageNotifications: true,
  notificationSound: true,
  browserNotifications: true,
};

class NotificationController {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private seenMessageIds: Set<string> = new Set();
  private toastListeners: Set<(toast: ForegroundToast) => void> = new Set();
  private isInitialized = false;
  private unsubscribeStorage: (() => void) | null = null;

  constructor() {
    this.loadSettings();
    this.loadSeenMessageIds();
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Unable to persist notification settings:", e);
    }
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private loadSeenMessageIds(): void {
    try {
      const raw = sessionStorage.getItem(SEEN_MSGS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.seenMessageIds = new Set(arr);
        }
      }
    } catch (e) {
      this.seenMessageIds = new Set();
    }
  }

  private persistSeenMessageIds(): void {
    try {
      const arr = Array.from(this.seenMessageIds).slice(-200); // keep recent 200 IDs
      sessionStorage.setItem(SEEN_MSGS_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn("Unable to persist seen msg IDs:", e);
    }
  }

  /**
   * Initializes real-time listener on storage messages for incoming notifications.
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Pre-seed existing messages so old history doesn't notify on start
    const currentUser = storage.getCurrentUser();
    if (currentUser) {
      const existing = (storage as any).messages || [];
      existing.forEach((m: Message) => {
        if (m && m.id) this.seenMessageIds.add(m.id);
      });
      this.persistSeenMessageIds();

      // Register device FCM token if browser notification permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        registerDeviceToken(currentUser.uid).catch(console.error);
      }
    }

    // Subscribe to storage updates
    this.unsubscribeStorage = storage.subscribe(() => {
      this.checkIncomingMessages();
    });
  }

  public cleanup(): void {
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
      this.unsubscribeStorage = null;
    }
    this.isInitialized = false;
  }

  /**
   * Evaluates messages and triggers sound, toast, and background notification.
   */
  public checkIncomingMessages(): void {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;

    const allMessages: Message[] = (storage as any).messages || [];
    const profiles: UserProfile[] = storage.getProfiles();

    allMessages.forEach((msg) => {
      if (!msg || !msg.id) return;

      // Condition 1: Target is current user
      const isTargetingMe = msg.receiverId === currentUser.uid;
      // Condition 2: Not sent by current user
      const isFromOther = msg.senderId !== currentUser.uid;
      // Condition 3: Has not been processed yet
      const isUnseen = !this.seenMessageIds.has(msg.id);

      if (isTargetingMe && isFromOther && isUnseen) {
        // Mark as seen immediately to prevent duplicate notifications
        this.seenMessageIds.add(msg.id);
        this.persistSeenMessageIds();

        // If master notification toggle is OFF, stop
        if (!this.settings.messageNotifications) return;

        // Play sound if sound toggle is ON
        if (this.settings.notificationSound) {
          playNotificationSound();
        }

        const sender = profiles.find(p => p.uid === msg.senderId);
        const senderName = sender?.name || 'CampusLink Peer';
        const senderAvatar = sender?.avatar;
        const senderCampus = sender?.campus;

        const isBackgrounded = typeof document !== 'undefined' && document.hidden;

        // 1. Foreground Toast Notification
        if (!isBackgrounded) {
          const toast: ForegroundToast = {
            id: `toast_${msg.id}`,
            senderId: msg.senderId,
            senderName,
            senderAvatar,
            senderCampus,
            content: msg.content,
            createdAt: msg.createdAt,
          };
          this.toastListeners.forEach(fn => fn(toast));
        }

        // 2. Background / System Notification
        if (isBackgrounded && this.settings.browserNotifications) {
          this.showBrowserNotification(senderName, msg.content, msg.senderId);
        }
      }
    });
  }

  /**
   * Triggers a native Web Notification if permission granted.
   */
  public showBrowserNotification(senderName: string, content: string, senderId: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(`💬 ${senderName}`, {
        body: content.slice(0, 80),
        icon: '/niat-logo.png',
        tag: `chat_${senderId}`,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('campuslink_open_chat', { detail: { senderId } }));
        }
      };
    } catch (e) {
      console.warn("Native Notification error:", e);
    }
  }

  public subscribeToast(callback: (toast: ForegroundToast) => void): () => void {
    this.toastListeners.add(callback);
    return () => this.toastListeners.delete(callback);
  }

  /**
   * Prompts for Notification Permission upon user action.
   */
  public async requestBrowserPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const user = storage.getCurrentUser();
        if (user) {
          await registerDeviceToken(user.uid);
        }
        return true;
      }
    } catch (e) {
      console.warn("Permission request error:", e);
    }
    return false;
  }
}

export const notificationController = new NotificationController();
