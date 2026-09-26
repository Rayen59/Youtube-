import bcrypt from 'bcryptjs';
import {
  User,
  UserActivity,
  UserPreferences,
  UserFavorites,
  UserGeoTelemetry,
  AppNotification,
  SubscribedChannel,
  Comment,
} from '../types';

const USERS_INDEX_KEY = 'mk_system_users_index_v3';
const CURRENT_USER_SESSION_KEY = 'mk_session_token_v2';
const NAMESPACE_PREFIX = 'mk_vfs_users';
const GLOBAL_HOURLY_KEY = 'mk_global_hourly_telemetry_v3';
const VIRTUAL_PURGE_DONE_KEY = 'mk_virtual_accounts_purged_v1';

// Virtual user IDs that must be permanently removed
const VIRTUAL_USER_IDS = [
  'usr-thomas-code',
  'usr-sophie-cinema',
  'usr-karim-stream',
  'usr-yasmine-art',
  'usr-alex-montreal',
  'usr-amine-dz',
  'usr-chloe-be',
  'usr-lucas-gamer',
];

export type NamespaceFileName =
  | 'profile.json'
  | 'activities.json'
  | 'preferences.json'
  | 'favorites.json'
  | 'telemetry.json';

// Helper to hash password
export const hashPassword = async (plainText: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
};

export const verifyPassword = async (plainText: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainText, hash);
  } catch {
    return false;
  }
};

// Detect real browser environment (Country from Timezone/Locale, OS, Browser, Device)
export const detectClientEnvironment = (): Omit<
  UserGeoTelemetry,
  'sessionsCount' | 'bandwidthMb' | 'hourlyUsage' | 'trustScore'
> => {
  if (typeof window === 'undefined') {
    return {
      country: 'France',
      countryCode: 'FR',
      flag: '🇫🇷',
      city: 'Paris',
      timezone: 'Europe/Paris',
      language: 'fr-FR',
      deviceType: 'Desktop',
      os: 'Linux / Web',
      browser: 'Chrome',
      ipMasked: '127.0.0.1',
      screenResolution: '1920x1080',
    };
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const lang = navigator.language || 'fr-FR';
  const ua = navigator.userAgent || '';

  let country = 'France';
  let countryCode = 'FR';
  let flag = '🇫🇷';
  let city = tz.split('/')[1]?.replace(/_/g, ' ') || 'Paris';

  const tzLower = tz.toLowerCase();
  const langLower = lang.toLowerCase();

  if (tzLower.includes('tunis') || langLower.includes('tn')) {
    country = 'Tunisie';
    countryCode = 'TN';
    flag = '🇹🇳';
    city = 'Tunis';
  } else if (tzLower.includes('casablanca') || langLower.includes('ma')) {
    country = 'Maroc';
    countryCode = 'MA';
    flag = '🇲🇦';
    city = 'Casablanca';
  } else if (tzLower.includes('algiers') || langLower.includes('dz')) {
    country = 'Algérie';
    countryCode = 'DZ';
    flag = '🇩🇿';
    city = 'Alger';
  } else if (
    tzLower.includes('montreal') ||
    tzLower.includes('toronto') ||
    langLower.includes('ca')
  ) {
    country = 'Canada';
    countryCode = 'CA';
    flag = '🇨🇦';
    city = 'Montréal';
  } else if (tzLower.includes('brussels') || langLower.includes('be')) {
    country = 'Belgique';
    countryCode = 'BE';
    flag = '🇧🇪';
    city = 'Bruxelles';
  } else if (
    tzLower.includes('zurich') ||
    tzLower.includes('geneva') ||
    langLower.includes('ch')
  ) {
    country = 'Suisse';
    countryCode = 'CH';
    flag = '🇨🇭';
    city = 'Genève';
  } else if (tzLower.includes('dakar') || langLower.includes('sn')) {
    country = 'Sénégal';
    countryCode = 'SN';
    flag = '🇸🇳';
    city = 'Dakar';
  } else if (
    tzLower.includes('new_york') ||
    tzLower.includes('los_angeles') ||
    tzLower.includes('chicago')
  ) {
    country = 'États-Unis';
    countryCode = 'US';
    flag = '🇺🇸';
    city = tz.split('/')[1]?.replace(/_/g, ' ') || 'New York';
  }

  const isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Tablet|PlayBook/i.test(ua);
  const deviceType: 'Mobile' | 'Desktop' | 'Tablette' = isTablet
    ? 'Tablette'
    : isMobile
    ? 'Mobile'
    : 'Desktop';

  let os = 'Windows';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Chrome';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  const screenResolution = `${window.screen?.width || window.innerWidth || 1920}x${
    window.screen?.height || window.innerHeight || 1080
  }`;

  return {
    country,
    countryCode,
    flag,
    city,
    timezone: tz,
    language: lang,
    deviceType,
    os,
    browser,
    ipMasked: 'Session Locale Directe',
    screenResolution,
  };
};

const getNamespaceKey = (userId: string, file: NamespaceFileName) => {
  return `${NAMESPACE_PREFIX}_${userId}_${file.replace('.json', '')}`;
};

const seedUserNamespace = (
  userId: string,
  profile: User,
  data: {
    activities: UserActivity[];
    preferences: UserPreferences;
    favorites: UserFavorites;
    telemetry: UserGeoTelemetry;
  }
) => {
  localStorage.setItem(getNamespaceKey(userId, 'profile.json'), JSON.stringify(profile, null, 2));
  localStorage.setItem(
    getNamespaceKey(userId, 'activities.json'),
    JSON.stringify(data.activities, null, 2)
  );
  localStorage.setItem(
    getNamespaceKey(userId, 'preferences.json'),
    JSON.stringify(data.preferences, null, 2)
  );
  localStorage.setItem(
    getNamespaceKey(userId, 'favorites.json'),
    JSON.stringify(data.favorites, null, 2)
  );
  localStorage.setItem(
    getNamespaceKey(userId, 'telemetry.json'),
    JSON.stringify(data.telemetry, null, 2)
  );
};

/**
 * Purges all virtual/demo accounts and fake seeded telemetry from localStorage
 */
export const purgeVirtualAccounts = () => {
  try {
    const rawUsers = localStorage.getItem(USERS_INDEX_KEY);
    if (rawUsers) {
      const parsed = JSON.parse(rawUsers) as User[];
      const realUsers = parsed.filter((u) => !VIRTUAL_USER_IDS.includes(u.id));
      localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(realUsers));
    }

    const files: NamespaceFileName[] = [
      'profile.json',
      'activities.json',
      'preferences.json',
      'favorites.json',
      'telemetry.json',
    ];

    VIRTUAL_USER_IDS.forEach((vid) => {
      files.forEach((f) => localStorage.removeItem(getNamespaceKey(vid, f)));
    });

    // If current session is a virtual user, log them out
    const session = getCurrentSession();
    if (session && VIRTUAL_USER_IDS.includes(session.id)) {
      clearSession();
    }

    // One-time cleanup of old fake admin telemetry or old fake search histories
    if (!localStorage.getItem(VIRTUAL_PURGE_DONE_KEY)) {
      const adminTel = getUserFile<UserGeoTelemetry>('usr-admin-nimda981', 'telemetry.json');
      if (adminTel && adminTel.bandwidthMb === 4120) {
        const env = detectClientEnvironment();
        const cleanHourly = new Array(24).fill(0);
        cleanHourly[new Date().getHours()] = 1;
        saveUserFile<UserGeoTelemetry>('usr-admin-nimda981', 'telemetry.json', {
          ...env,
          sessionsCount: 1,
          bandwidthMb: 0,
          hourlyUsage: cleanHourly,
          trustScore: 100,
        });
        saveUserFile<UserActivity[]>('usr-admin-nimda981', 'activities.json', []);
      }

      // Remove old seeded moderation incidents
      const modRaw = localStorage.getItem('mk_ai_moderation_incidents_v2');
      if (modRaw) {
        try {
          const list = JSON.parse(modRaw) as Array<{ id: string }>;
          const filtered = list.filter(
            (item) => item.id !== 'mod-seed-1' && item.id !== 'mod-seed-2'
          );
          localStorage.setItem('mk_ai_moderation_incidents_v2', JSON.stringify(filtered));
        } catch {}
      }

      localStorage.setItem(VIRTUAL_PURGE_DONE_KEY, 'true');
    }
  } catch (e) {
    console.error('Error purging virtual accounts:', e);
  }
};

// Initialize storage system with ONLY real accounts (no virtual users)
export const initializeNamespaceSystem = async () => {
  purgeVirtualAccounts();

  const existingUsers = getStoredUsers();
  const currentEnv = detectClientEnvironment();

  if (existingUsers.length === 0) {
    const adminPasswordHash = await hashPassword('189admin');
    const currentHour = new Date().getHours();
    const initialHourly = new Array(24).fill(0);
    initialHourly[currentHour] = 1;

    const adminUser: User = {
      id: 'usr-admin-nimda981',
      username: 'nimda981',
      email: 'nimda981@mk-stream.io',
      passwordHash: adminPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      role: 'admin',
      createdAt: new Date().toISOString(),
      channelName: 'MK Studio Admin',
      subscribersCount: 0,
      country: currentEnv.country,
      countryCode: currentEnv.countryCode,
      flag: currentEnv.flag,
      city: currentEnv.city,
      timezone: currentEnv.timezone,
      deviceType: currentEnv.deviceType,
      os: currentEnv.os,
      browser: currentEnv.browser,
      ipMasked: currentEnv.ipMasked,
      isSuspended: false,
    };

    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify([adminUser]));

    seedUserNamespace(adminUser.id, adminUser, {
      activities: [],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 1,
        categoryAffinity: {},
        dislikedTags: [],
        lastActive: new Date().toISOString(),
      },
      favorites: {
        likedVideoIds: [],
        dislikedVideoIds: [],
        savedVideoIds: [],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        ...currentEnv,
        sessionsCount: 1,
        bandwidthMb: 0,
        hourlyUsage: initialHourly,
        trustScore: 100,
      },
    });
  }

  // Ensure initial welcome notification exists if notifications list is empty
  const existingNotifs = getNotifications();
  if (existingNotifs.length === 0) {
    addNotification({
      title: 'Bienvenue sur MK Streaming 4K',
      message:
        'Les notifications en temps réel et la recherche vocale (voix vers texte) sont activées.',
      type: 'system',
    });
  }
};

// USER NAMESPACE READ/WRITE METHODS (ISOLATED)

export const getUserFile = <T>(userId: string, file: NamespaceFileName): T | null => {
  const raw = localStorage.getItem(getNamespaceKey(userId, file));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const saveUserFile = <T>(userId: string, file: NamespaceFileName, data: T): void => {
  localStorage.setItem(getNamespaceKey(userId, file), JSON.stringify(data, null, 2));
};

export const getUserTelemetry = (userId: string): UserGeoTelemetry => {
  const existing = getUserFile<UserGeoTelemetry>(userId, 'telemetry.json');
  if (existing && Array.isArray(existing.hourlyUsage) && existing.hourlyUsage.length === 24) {
    return existing;
  }
  const env = detectClientEnvironment();
  const fallback: UserGeoTelemetry = {
    ...env,
    sessionsCount: 1,
    bandwidthMb: 0,
    hourlyUsage: new Array(24).fill(0),
    trustScore: 100,
  };
  saveUserFile(userId, 'telemetry.json', fallback);
  return fallback;
};

// Record violation & decrease user trust score
export const recordUserViolationInTelemetry = (
  userId: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
) => {
  const telemetry = getUserTelemetry(userId);
  const penalty =
    severity === 'critical' ? 25 : severity === 'high' ? 15 : severity === 'medium' ? 8 : 4;
  telemetry.trustScore = Math.max(0, (telemetry.trustScore ?? 100) - penalty);
  if (telemetry.trustScore <= 25) {
    telemetry.isSuspended = true;
    telemetry.suspensionReason =
      'Suspension automatique par le Bouclier IA suite à des infractions répétées.';
  }
  saveUserFile(userId, 'telemetry.json', telemetry);
};

// Admin manual toggle suspension for a specific user
export const toggleUserSuspension = (
  userId: string,
  suspend: boolean,
  reason?: string
): UserGeoTelemetry => {
  const telemetry = getUserTelemetry(userId);
  telemetry.isSuspended = suspend;
  telemetry.suspensionReason = suspend
    ? reason || 'Compte suspendu par l’administrateur.'
    : undefined;
  if (!suspend && telemetry.trustScore < 50) {
    telemetry.trustScore = 85;
  }
  saveUserFile(userId, 'telemetry.json', telemetry);

  const users = getStoredUsers().map((u) =>
    u.id === userId ? { ...u, isSuspended: suspend } : u
  );
  localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));
  return telemetry;
};

// Track global hourly activity even for guests
export const recordGlobalHourlyHit = () => {
  try {
    const raw = localStorage.getItem(GLOBAL_HOURLY_KEY);
    const currentHour = new Date().getHours();
    const hours: number[] = raw ? JSON.parse(raw) : new Array(24).fill(0);
    hours[currentHour] = (hours[currentHour] || 0) + 1;
    localStorage.setItem(GLOBAL_HOURLY_KEY, JSON.stringify(hours));
  } catch {}
};

// Guest activity log key for real guest statistics
const GUEST_ACTIVITIES_KEY = 'mk_guest_real_activities_v1';
const GUEST_BANDWIDTH_KEY = 'mk_guest_real_bandwidth_mb_v1';

export const getGuestActivities = (): UserActivity[] => {
  try {
    const raw = localStorage.getItem(GUEST_ACTIVITIES_KEY);
    return raw ? (JSON.parse(raw) as UserActivity[]) : [];
  } catch {
    return [];
  }
};

export const getGuestBandwidthMb = (): number => {
  try {
    return Number(localStorage.getItem(GUEST_BANDWIDTH_KEY) || '0');
  } catch {
    return 0;
  }
};

// Automatic activity tracking (Updates both user namespace & real global metrics)
export const logUserActivity = (
  userId: string | null | undefined,
  activity: Omit<UserActivity, 'id' | 'timestamp'>
): void => {
  recordGlobalHourlyHit();
  const currentHour = new Date().getHours();
  const env = detectClientEnvironment();

  const newActivity: UserActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    hour: currentHour,
    country: env.country,
    timestamp: new Date().toISOString(),
  };

  if (!userId) {
    // Store in real guest activities so even non-logged-in actions show up in real statistics
    const guestActs = getGuestActivities();
    guestActs.unshift(newActivity);
    if (guestActs.length > 200) guestActs.pop();
    localStorage.setItem(GUEST_ACTIVITIES_KEY, JSON.stringify(guestActs));

    if (activity.action === 'watch') {
      const addedMb = Math.max(
        0.5,
        Math.round(((activity.watchTimeSeconds || 5) / 60) * 18 * 10) / 10
      );
      const currentBw = getGuestBandwidthMb();
      localStorage.setItem(GUEST_BANDWIDTH_KEY, String(Math.round((currentBw + addedMb) * 10) / 10));
    }
    return;
  }

  const telemetry = getUserTelemetry(userId);
  telemetry.hourlyUsage[currentHour] = (telemetry.hourlyUsage[currentHour] || 0) + 1;
  if (activity.action === 'watch') {
    const addedMb = Math.max(
      0.5,
      Math.round(((activity.watchTimeSeconds || 5) / 60) * 18 * 10) / 10
    );
    telemetry.bandwidthMb = Math.round(((telemetry.bandwidthMb || 0) + addedMb) * 10) / 10;
  }
  saveUserFile(userId, 'telemetry.json', telemetry);

  const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
  activities.unshift(newActivity);
  if (activities.length > 200) activities.pop();
  saveUserFile(userId, 'activities.json', activities);

  // Update preferences affinity automatically
  const preferences = getUserFile<UserPreferences>(userId, 'preferences.json') || {
    theme: 'dark',
    autoplay: true,
    preferredQuality: '1080p',
    playbackSpeed: 1,
    volume: 1,
    categoryAffinity: {},
    dislikedTags: [],
    lastActive: new Date().toISOString(),
  };

  preferences.lastActive = new Date().toISOString();
  if (activity.category) {
    const currentScore = preferences.categoryAffinity[activity.category] || 0;
    if (activity.action === 'like') {
      preferences.categoryAffinity[activity.category] = currentScore + 5;
    } else if (activity.action === 'dislike') {
      preferences.categoryAffinity[activity.category] = currentScore - 5;
    } else if (activity.action === 'watch') {
      const bonus = (activity.watchTimeSeconds || 0) >= 15 ? 2 : 1;
      preferences.categoryAffinity[activity.category] = currentScore + bonus;
    } else if (activity.action === 'comment' || activity.action === 'favorite') {
      preferences.categoryAffinity[activity.category] = currentScore + 4;
    }
  }

  saveUserFile(userId, 'preferences.json', preferences);
};

// ============================================================================
// REAL NOTIFICATIONS SYSTEM (WITH BROWSER PUSH & IN-APP PERSISTENCE)
// ============================================================================

const getNotificationsKey = (userId?: string | null) =>
  `mk_real_notifications_${userId || 'guest'}_v1`;

export const getNotifications = (userId?: string | null): AppNotification[] => {
  try {
    const raw = localStorage.getItem(getNotificationsKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
};

export const addNotification = (
  params: {
    userId?: string | null;
    title: string;
    message: string;
    type: AppNotification['type'];
    videoId?: string;
    thumbnailUrl?: string;
  }
): AppNotification[] => {
  const current = getNotifications(params.userId);
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId || undefined,
    title: params.title,
    message: params.message,
    type: params.type,
    videoId: params.videoId,
    thumbnailUrl: params.thumbnailUrl,
    read: false,
    timestamp: new Date().toISOString(),
  };

  const updated = [newNotif, ...current].slice(0, 50);
  localStorage.setItem(getNotificationsKey(params.userId), JSON.stringify(updated));

  // Dispatch custom DOM event so Header bell updates immediately from anywhere
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mk-notifications-updated'));

    // Also trigger native browser notification if granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(params.title, {
          body: params.message,
          icon: params.thumbnailUrl || '/favicon.ico',
        });
      } catch {}
    }
  }

  return updated;
};

export const markNotificationAsRead = (
  notifId: string,
  userId?: string | null
): AppNotification[] => {
  const updated = getNotifications(userId).map((n) =>
    n.id === notifId ? { ...n, read: true } : n
  );
  localStorage.setItem(getNotificationsKey(userId), JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mk-notifications-updated'));
  }
  return updated;
};

export const markAllNotificationsAsRead = (userId?: string | null): AppNotification[] => {
  const updated = getNotifications(userId).map((n) => ({ ...n, read: true }));
  localStorage.setItem(getNotificationsKey(userId), JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mk-notifications-updated'));
  }
  return updated;
};

export const deleteNotification = (
  notifId: string,
  userId?: string | null
): AppNotification[] => {
  const updated = getNotifications(userId).filter((n) => n.id !== notifId);
  localStorage.setItem(getNotificationsKey(userId), JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mk-notifications-updated'));
  }
  return updated;
};

export const clearAllNotifications = (userId?: string | null): AppNotification[] => {
  localStorage.setItem(getNotificationsKey(userId), JSON.stringify([]));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mk-notifications-updated'));
  }
  return [];
};

// ============================================================================
// REAL CHANNEL SUBSCRIPTIONS SYSTEM (NO STORIES, REAL SUBSCRIBED CHANNELS)
// ============================================================================

const getSubscriptionsKey = (userId?: string | null) =>
  `mk_real_subscriptions_${userId || 'guest'}_v1`;

export const getSubscribedChannels = (userId?: string | null): SubscribedChannel[] => {
  try {
    const raw = localStorage.getItem(getSubscriptionsKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as SubscribedChannel[];
  } catch {
    return [];
  }
};

export const isChannelSubscribed = (
  channelTitle: string,
  userId?: string | null
): SubscribedChannel | undefined => {
  return getSubscribedChannels(userId).find(
    (c) => c.channelTitle.toLowerCase() === channelTitle.toLowerCase()
  );
};

export const toggleChannelSubscription = (
  channel: {
    channelId: string;
    channelTitle: string;
    channelAvatar: string;
    subscribers: string;
  },
  userId?: string | null
): { subscribed: boolean; list: SubscribedChannel[] } => {
  const current = getSubscribedChannels(userId);
  const exists = current.some(
    (c) => c.channelTitle.toLowerCase() === channel.channelTitle.toLowerCase()
  );

  let updated: SubscribedChannel[];
  if (exists) {
    updated = current.filter(
      (c) => c.channelTitle.toLowerCase() !== channel.channelTitle.toLowerCase()
    );
  } else {
    updated = [
      {
        ...channel,
        notificationsEnabled: true,
        subscribedAt: new Date().toISOString(),
      },
      ...current,
    ];
    addNotification({
      userId,
      title: `Abonnement activé : ${channel.channelTitle}`,
      message: `Vous êtes maintenant abonné à la chaîne ${channel.channelTitle}. Les notifications sont activées.`,
      type: 'subscription',
      thumbnailUrl: channel.channelAvatar,
    });
  }

  localStorage.setItem(getSubscriptionsKey(userId), JSON.stringify(updated));
  return { subscribed: !exists, list: updated };
};

export const toggleChannelNotificationBell = (
  channelTitle: string,
  userId?: string | null
): SubscribedChannel[] => {
  const current = getSubscribedChannels(userId);
  const updated = current.map((c) => {
    if (c.channelTitle.toLowerCase() === channelTitle.toLowerCase()) {
      const nextState = !c.notificationsEnabled;
      addNotification({
        userId,
        title: nextState
          ? `Notifications activées (${c.channelTitle})`
          : `Notifications désactivées (${c.channelTitle})`,
        message: nextState
          ? `Vous recevrez toutes les alertes pour les nouvelles vidéos de ${c.channelTitle}.`
          : `Vous ne recevrez plus d'alertes pour ${c.channelTitle}.`,
        type: 'subscription',
        thumbnailUrl: c.channelAvatar,
      });
      return { ...c, notificationsEnabled: nextState };
    }
    return c;
  });
  localStorage.setItem(getSubscriptionsKey(userId), JSON.stringify(updated));
  return updated;
};

// ============================================================================
// REAL VIDEO & PLATFORM ENGAGEMENT STATISTICS (VIEWS, WATCH TIME, COMMENTS, LIKES)
// ============================================================================

export interface RealVideoEngagement {
  videoId: string;
  realViews: number;
  realWatchSeconds: number;
  realLikes: number;
  realDislikes: number;
  realComments: Comment[];
  lastWatchedAt?: string;
}

const REAL_VIDEO_STATS_KEY = 'mk_real_video_engagement_v1';

export const getAllRealVideoEngagement = (): Record<string, RealVideoEngagement> => {
  try {
    const raw = localStorage.getItem(REAL_VIDEO_STATS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RealVideoEngagement>) : {};
  } catch {
    return {};
  }
};

export const getRealVideoEngagement = (videoId: string): RealVideoEngagement => {
  const all = getAllRealVideoEngagement();
  return (
    all[videoId] || {
      videoId,
      realViews: 0,
      realWatchSeconds: 0,
      realLikes: 0,
      realDislikes: 0,
      realComments: [],
    }
  );
};

export const recordRealVideoView = (videoId: string): RealVideoEngagement => {
  const all = getAllRealVideoEngagement();
  const current = getRealVideoEngagement(videoId);
  const updated: RealVideoEngagement = {
    ...current,
    realViews: current.realViews + 1,
    lastWatchedAt: new Date().toISOString(),
  };
  all[videoId] = updated;
  localStorage.setItem(REAL_VIDEO_STATS_KEY, JSON.stringify(all));
  return updated;
};

export const recordRealVideoWatchSeconds = (
  videoId: string,
  secondsDelta: number
): RealVideoEngagement => {
  const all = getAllRealVideoEngagement();
  const current = getRealVideoEngagement(videoId);
  const updated: RealVideoEngagement = {
    ...current,
    realWatchSeconds: current.realWatchSeconds + Math.max(0, secondsDelta),
    lastWatchedAt: new Date().toISOString(),
  };
  all[videoId] = updated;
  localStorage.setItem(REAL_VIDEO_STATS_KEY, JSON.stringify(all));
  return updated;
};

export const saveRealVideoComment = (videoId: string, comment: Comment): RealVideoEngagement => {
  const all = getAllRealVideoEngagement();
  const current = getRealVideoEngagement(videoId);
  const updated: RealVideoEngagement = {
    ...current,
    realComments: [comment, ...current.realComments],
  };
  all[videoId] = updated;
  localStorage.setItem(REAL_VIDEO_STATS_KEY, JSON.stringify(all));
  return updated;
};

export const updateRealVideoCommentsList = (
  videoId: string,
  comments: Comment[]
): RealVideoEngagement => {
  const all = getAllRealVideoEngagement();
  const current = getRealVideoEngagement(videoId);
  const updated: RealVideoEngagement = {
    ...current,
    realComments: comments,
  };
  all[videoId] = updated;
  localStorage.setItem(REAL_VIDEO_STATS_KEY, JSON.stringify(all));
  return updated;
};

// ============================================================================
// AUTHENTICATION & SESSION
// ============================================================================

export const getStoredUsers = (): User[] => {
  const raw = localStorage.getItem(USERS_INDEX_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as User[];
    return list.filter((u) => !VIRTUAL_USER_IDS.includes(u.id));
  } catch {
    return [];
  }
};

export const registerUser = async (
  username: string,
  email: string,
  plainPassword: string
): Promise<User> => {
  const users = getStoredUsers();
  const lowerEmail = email.toLowerCase().trim();
  const cleanUsername = username.trim();

  if (users.some((u) => u.email.toLowerCase() === lowerEmail)) {
    throw new Error('Un compte avec cette adresse email existe déjà.');
  }
  if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error("Ce nom d'utilisateur est déjà utilisé.");
  }

  const env = detectClientEnvironment();
  const passwordHash = await hashPassword(plainPassword);
  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    email: lowerEmail,
    passwordHash,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanUsername)}`,
    role: 'user',
    createdAt: new Date().toISOString(),
    channelName: `${cleanUsername} Studio`,
    subscribersCount: 0,
    country: env.country,
    countryCode: env.countryCode,
    flag: env.flag,
    city: env.city,
    timezone: env.timezone,
    deviceType: env.deviceType,
    os: env.os,
    browser: env.browser,
    ipMasked: env.ipMasked,
    isSuspended: false,
  };

  users.push(newUser);
  localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));

  const currentHour = new Date().getHours();
  const initialHourly = new Array(24).fill(0);
  initialHourly[currentHour] = 1;

  seedUserNamespace(newUser.id, newUser, {
    activities: [],
    preferences: {
      theme: 'dark',
      autoplay: true,
      preferredQuality: '4K Ultra HD',
      playbackSpeed: 1,
      volume: 1,
      categoryAffinity: {},
      dislikedTags: [],
      lastActive: new Date().toISOString(),
    },
    favorites: {
      likedVideoIds: [],
      dislikedVideoIds: [],
      savedVideoIds: [],
      downloadedVideos: [],
      customPlaylists: [],
    },
    telemetry: {
      ...env,
      sessionsCount: 1,
      bandwidthMb: 0,
      hourlyUsage: initialHourly,
      trustScore: 100,
    },
  });

  addNotification({
    userId: newUser.id,
    title: `Compte créé : Bienvenue ${newUser.username} !`,
    message:
      'Votre espace personnel isolé et vos statistiques en temps réel sont prêts.',
    type: 'system',
  });

  return newUser;
};

export const authenticateUser = async (
  identifier: string,
  plainPassword: string
): Promise<User> => {
  const users = getStoredUsers();
  const cleanId = identifier.trim().toLowerCase();

  const user = users.find(
    (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
  );

  if (!user) {
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  const telemetry = getUserTelemetry(user.id);
  if (telemetry.isSuspended || user.isSuspended) {
    throw new Error(
      telemetry.suspensionReason ||
        'Votre compte a été suspendu par le système de sécurité IA MK.'
    );
  }

  const isValid = await verifyPassword(plainPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  telemetry.sessionsCount = (telemetry.sessionsCount || 0) + 1;
  const h = new Date().getHours();
  telemetry.hourlyUsage[h] = (telemetry.hourlyUsage[h] || 0) + 1;
  saveUserFile(user.id, 'telemetry.json', telemetry);

  return user;
};

export const saveSession = (user: User): void => {
  localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(user));
};

export const getCurrentSession = (): User | null => {
  const raw = localStorage.getItem(CURRENT_USER_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    if (VIRTUAL_USER_IDS.includes(parsed.id)) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
};

export const getUserGeoTelemetry = getUserTelemetry;

export const deleteUserAccount = (userId: string): void => {
  const users = getStoredUsers().filter((u) => u.id !== userId);
  localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));
  const files: NamespaceFileName[] = [
    'profile.json',
    'activities.json',
    'preferences.json',
    'favorites.json',
    'telemetry.json',
  ];
  files.forEach((f) => localStorage.removeItem(getNamespaceKey(userId, f)));
  localStorage.removeItem(getNotificationsKey(userId));
  localStorage.removeItem(getSubscriptionsKey(userId));
};

export const getUserFullNamespace = (userId: string) => {
  const users = getStoredUsers();
  const profile =
    getUserFile<User>(userId, 'profile.json') ||
    users.find((u) => u.id === userId) ||
    null;
  const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
  const preferences = getUserFile<UserPreferences>(userId, 'preferences.json') || {
    theme: 'dark',
    autoplay: true,
    preferredQuality: '1080p',
    playbackSpeed: 1,
    volume: 1,
    categoryAffinity: {},
    dislikedTags: [],
    lastActive: new Date().toISOString(),
  };
  const favorites = getUserFile<UserFavorites>(userId, 'favorites.json') || {
    likedVideoIds: [],
    dislikedVideoIds: [],
    savedVideoIds: [],
    downloadedVideos: [],
    customPlaylists: [],
  };
  const telemetry = getUserTelemetry(userId);

  return {
    directoryPath: `/users/${userId}/`,
    profile,
    activities,
    preferences,
    favorites,
    telemetry,
  };
};

export interface CountryTelemetryStat {
  country: string;
  countryCode: string;
  flag: string;
  usersCount: number;
  percentage: number;
  activeSessions: number;
  bandwidthMB: number;
  cities: string[];
}

export interface GlobalSiteTelemetrySummary {
  totalUsers: number;
  totalSessions: number;
  totalBandwidthMB: number;
  totalActions24h: number;
  peakHour: number;
  peakHourCount: number;
  hourlyUsage24h: number[];
  countryStats: CountryTelemetryStat[];
  realTotalViews: number;
  realTotalWatchSeconds: number;
  realTotalComments: number;
  realTotalSearches: number;
}

// Compute 100% REAL site-wide statistics across real users + current active session
export const getGlobalSiteTelemetrySummary = (): GlobalSiteTelemetrySummary => {
  const users = getStoredUsers();
  const hourlyUsage24h = new Array(24).fill(0);
  let totalSessions = 0;
  let totalBandwidthMB = getGuestBandwidthMb();

  const countryMap = new Map<
    string,
    {
      country: string;
      countryCode: string;
      flag: string;
      usersCount: number;
      activeSessions: number;
      bandwidthMB: number;
      cities: Set<string>;
    }
  >();

  users.forEach((u) => {
    const tel = getUserTelemetry(u.id);
    totalSessions += tel.sessionsCount || 1;
    totalBandwidthMB += tel.bandwidthMb || 0;

    if (Array.isArray(tel.hourlyUsage)) {
      tel.hourlyUsage.forEach((val, idx) => {
        if (idx >= 0 && idx < 24) {
          hourlyUsage24h[idx] += val || 0;
        }
      });
    }

    const code = tel.countryCode || 'FR';
    const existing = countryMap.get(code);
    if (existing) {
      existing.usersCount += 1;
      existing.activeSessions += tel.sessionsCount || 1;
      existing.bandwidthMB += tel.bandwidthMb || 0;
      if (tel.city) existing.cities.add(tel.city);
    } else {
      countryMap.set(code, {
        country: tel.country || 'France',
        countryCode: code,
        flag: tel.flag || '🇫🇷',
        usersCount: 1,
        activeSessions: tel.sessionsCount || 1,
        bandwidthMB: tel.bandwidthMb || 0,
        cities: new Set(tel.city ? [tel.city] : ['Paris']),
      });
    }
  });

  // Add global hourly hits
  try {
    const rawGlobal = localStorage.getItem(GLOBAL_HOURLY_KEY);
    if (rawGlobal) {
      const guestHours = JSON.parse(rawGlobal) as number[];
      guestHours.forEach((v, idx) => {
        if (idx >= 0 && idx < 24) hourlyUsage24h[idx] += v || 0;
      });
    }
  } catch {}

  const totalUsers = Math.max(1, users.length);
  const countryStats: CountryTelemetryStat[] = Array.from(countryMap.values())
    .map((item) => ({
      country: item.country,
      countryCode: item.countryCode,
      flag: item.flag,
      usersCount: item.usersCount,
      percentage: Number(((item.usersCount / totalUsers) * 100).toFixed(1)),
      activeSessions: item.activeSessions,
      bandwidthMB: Math.round(item.bandwidthMB * 10) / 10,
      cities: Array.from(item.cities),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  let peakHour = new Date().getHours();
  let peakHourCount = 0;
  hourlyUsage24h.forEach((count, hr) => {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = hr;
    }
  });

  const totalActions24h = hourlyUsage24h.reduce((a, b) => a + b, 0);

  // Aggregate real video engagements
  const allEngagements = Object.values(getAllRealVideoEngagement());
  const realTotalViews = allEngagements.reduce((acc, e) => acc + e.realViews, 0);
  const realTotalWatchSeconds = allEngagements.reduce((acc, e) => acc + e.realWatchSeconds, 0);
  const realTotalComments = allEngagements.reduce((acc, e) => acc + e.realComments.length, 0);

  // Aggregate real searches across users & guest
  let realTotalSearches = getSearchHistory(null).length;
  users.forEach((u) => {
    realTotalSearches += getSearchHistory(u.id).length;
  });

  return {
    totalUsers: users.length,
    totalSessions,
    totalBandwidthMB: Math.round(totalBandwidthMB * 10) / 10,
    totalActions24h,
    peakHour,
    peakHourCount,
    hourlyUsage24h,
    countryStats,
    realTotalViews,
    realTotalWatchSeconds,
    realTotalComments,
    realTotalSearches,
  };
};

export const getAdminAllUsersData = (
  currentCaller: User | null
): { user: User; files: Record<string, unknown>; telemetry: UserGeoTelemetry }[] => {
  if (!currentCaller || currentCaller.role !== 'admin') {
    throw new Error('Accès non autorisé : Privilèges Administrateur requis.');
  }

  const users = getStoredUsers();
  return users.map((u) => {
    const telemetry = getUserTelemetry(u.id);
    return {
      user: {
        ...u,
        country: u.country || telemetry.country,
        countryCode: u.countryCode || telemetry.countryCode,
        flag: u.flag || telemetry.flag,
        city: u.city || telemetry.city,
        deviceType: u.deviceType || telemetry.deviceType,
        os: u.os || telemetry.os,
        browser: u.browser || telemetry.browser,
        ipMasked: u.ipMasked || telemetry.ipMasked,
        isSuspended: telemetry.isSuspended || u.isSuspended,
      },
      telemetry,
      files: {
        'profile.json': getUserFile(u.id, 'profile.json') || u,
        'activities.json': getUserFile(u.id, 'activities.json') || [],
        'preferences.json': getUserFile(u.id, 'preferences.json') || {},
        'favorites.json': getUserFile(u.id, 'favorites.json') || {
          likedVideoIds: [],
          dislikedVideoIds: [],
          savedVideoIds: [],
          downloadedVideos: [],
          customPlaylists: [],
        },
        'telemetry.json': telemetry,
      },
    };
  });
};

export interface SearchHistoryItem {
  id: string;
  text: string;
  videoId?: string;
  timestamp: string;
}

const getSearchHistoryStorageKey = (userId?: string | null) =>
  `mk_search_history_${userId || 'guest'}_v2`;

export const getSearchHistory = (userId?: string | null): SearchHistoryItem[] => {
  try {
    const key = getSearchHistoryStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as SearchHistoryItem[];
  } catch {
    return [];
  }
};

export const addSearchHistoryItem = (
  userId: string | null | undefined,
  text: string,
  videoId?: string
): SearchHistoryItem[] => {
  const clean = text.trim();
  if (!clean) return getSearchHistory(userId);
  const current = getSearchHistory(userId);
  const filtered = current.filter((item) => item.text.toLowerCase() !== clean.toLowerCase());
  const newItem: SearchHistoryItem = {
    id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    videoId,
    timestamp: new Date().toISOString(),
  };
  const updated = [newItem, ...filtered].slice(0, 30);
  localStorage.setItem(getSearchHistoryStorageKey(userId), JSON.stringify(updated));
  return updated;
};

export const deleteSearchHistoryItem = (
  userId: string | null | undefined,
  idOrText: string
): SearchHistoryItem[] => {
  const current = getSearchHistory(userId);
  const updated = current.filter(
    (item) => item.id !== idOrText && item.text.toLowerCase() !== idOrText.toLowerCase()
  );
  localStorage.setItem(getSearchHistoryStorageKey(userId), JSON.stringify(updated));

  if (userId) {
    const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
    const cleanedActivities = activities.filter(
      (a) =>
        !(
          (a.action === 'search' || a.action === 'voice_search') &&
          (a.id === idOrText || a.searchQuery?.toLowerCase() === idOrText.toLowerCase())
        )
    );
    saveUserFile(userId, 'activities.json', cleanedActivities);
  }
  return updated;
};

export const clearAllSearchHistory = (userId?: string | null): SearchHistoryItem[] => {
  localStorage.setItem(getSearchHistoryStorageKey(userId), JSON.stringify([]));
  if (userId) {
    const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
    const cleaned = activities.filter(
      (a) => a.action !== 'search' && a.action !== 'voice_search'
    );
    saveUserFile(userId, 'activities.json', cleaned);
  }
  return [];
};

export const updateUserProfile = (
  userId: string,
  updates: Partial<Pick<User, 'username' | 'channelName' | 'avatar' | 'email'>>
): User | null => {
  const users = getStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;

  const updatedUser: User = {
    ...users[idx],
    ...updates,
  };
  users[idx] = updatedUser;
  localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));
  saveUserFile(userId, 'profile.json', updatedUser);

  const session = getCurrentSession();
  if (session && session.id === userId) {
    saveSession(updatedUser);
  }
  return updatedUser;
};

export const clearUserWatchHistory = (userId: string): void => {
  const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
  const remaining = activities.filter((a) => a.action !== 'watch');
  saveUserFile(userId, 'activities.json', remaining);
};
