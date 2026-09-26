import bcrypt from 'bcryptjs';
import {
  User,
  UserActivity,
  UserPreferences,
  UserFavorites,
  UserGeoTelemetry,
} from '../types';

const USERS_INDEX_KEY = 'mk_system_users_index_v3';
const CURRENT_USER_SESSION_KEY = 'mk_session_token_v2';
const NAMESPACE_PREFIX = 'mk_vfs_users';
const GLOBAL_HOURLY_KEY = 'mk_global_hourly_telemetry_v2';

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
      ipMasked: '92.184.102.xx',
      screenResolution: '1920x1080',
    };
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const lang = navigator.language || 'fr-FR';
  const ua = navigator.userAgent || '';

  // Map timezone / locale to real country
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
  } else if (tzLower.includes('montreal') || tzLower.includes('toronto') || langLower.includes('ca')) {
    country = 'Canada';
    countryCode = 'CA';
    flag = '🇨🇦';
    city = 'Montréal';
  } else if (tzLower.includes('brussels') || langLower.includes('be')) {
    country = 'Belgique';
    countryCode = 'BE';
    flag = '🇧🇪';
    city = 'Bruxelles';
  } else if (tzLower.includes('zurich') || tzLower.includes('geneva') || langLower.includes('ch')) {
    country = 'Suisse';
    countryCode = 'CH';
    flag = '🇨🇭';
    city = 'Genève';
  } else if (tzLower.includes('dakar') || langLower.includes('sn')) {
    country = 'Sénégal';
    countryCode = 'SN';
    flag = '🇸🇳';
    city = 'Dakar';
  } else if (tzLower.includes('new_york') || tzLower.includes('los_angeles') || tzLower.includes('chicago')) {
    country = 'États-Unis';
    countryCode = 'US';
    flag = '🇺🇸';
    city = tz.split('/')[1]?.replace(/_/g, ' ') || 'New York';
  }

  // Device Type
  const isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Tablet|PlayBook/i.test(ua);
  const deviceType: 'Mobile' | 'Desktop' | 'Tablette' = isTablet
    ? 'Tablette'
    : isMobile
    ? 'Mobile'
    : 'Desktop';

  // OS
  let os = 'Windows 11';
  if (/Android/i.test(ua)) os = 'Android 15';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS 18';
  else if (/Mac OS X/i.test(ua)) os = 'macOS Sequoia';
  else if (/Linux/i.test(ua)) os = 'Linux x86_64';

  // Browser
  let browser = 'Chrome 132';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  const screenResolution = `${window.screen?.width || 1920}x${window.screen?.height || 1080}`;

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
    ipMasked:
      countryCode === 'TN'
        ? '197.14.88.xx'
        : countryCode === 'MA'
        ? '105.159.42.xx'
        : countryCode === 'CA'
        ? '24.201.118.xx'
        : '92.184.105.xx',
    screenResolution,
  };
};

// Seed initial users (including Admin nimda981 and realistic multi-country users)
export const initializeNamespaceSystem = async () => {
  const existingUsers = localStorage.getItem(USERS_INDEX_KEY);
  const currentEnv = detectClientEnvironment();

  if (!existingUsers) {
    const adminPasswordHash = await hashPassword('189admin');
    const demoUserPasswordHash = await hashPassword('password123');

    const adminUser: User = {
      id: 'usr-admin-nimda981',
      username: 'nimda981',
      email: 'nimda981@mk-stream.io',
      passwordHash: adminPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      role: 'admin',
      createdAt: '2026-01-10T08:00:00.000Z',
      channelName: 'MK Studio Admin',
      subscribersCount: 2450,
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

    const user1: User = {
      id: 'usr-thomas-code',
      username: 'ThomasDev',
      email: 'thomas.dev@example.com',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      role: 'user',
      createdAt: '2026-02-14T11:20:00.000Z',
      channelName: 'Thomas Code Lab',
      subscribersCount: 420,
      country: 'France',
      countryCode: 'FR',
      flag: '🇫🇷',
      city: 'Lyon',
      timezone: 'Europe/Paris',
      deviceType: 'Desktop',
      os: 'macOS Sequoia',
      browser: 'Chrome 132',
      ipMasked: '90.63.144.xx',
      isSuspended: false,
    };

    const user2: User = {
      id: 'usr-sophie-cinema',
      username: 'SophieCinéma',
      email: 'sophie.movies@example.com',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
      role: 'user',
      createdAt: '2026-03-01T14:45:00.000Z',
      channelName: 'Sophie Critique 3D',
      subscribersCount: 890,
      country: 'France',
      countryCode: 'FR',
      flag: '🇫🇷',
      city: 'Paris',
      timezone: 'Europe/Paris',
      deviceType: 'Desktop',
      os: 'Windows 11',
      browser: 'Microsoft Edge',
      ipMasked: '86.242.19.xx',
      isSuspended: false,
    };

    const user3: User = {
      id: 'usr-karim-stream',
      username: 'KarimStream_TN',
      email: 'karim.stream@tunis.tn',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      role: 'user',
      createdAt: '2026-04-12T18:10:00.000Z',
      channelName: 'Karim Tech TN',
      subscribersCount: 1120,
      country: 'Tunisie',
      countryCode: 'TN',
      flag: '🇹🇳',
      city: 'Tunis',
      timezone: 'Africa/Tunis',
      deviceType: 'Mobile',
      os: 'Android 15',
      browser: 'Chrome Mobile',
      ipMasked: '197.14.88.xx',
      isSuspended: false,
    };

    const user4: User = {
      id: 'usr-yasmine-art',
      username: 'YasmineVFX_MA',
      email: 'yasmine.vfx@casa.ma',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
      role: 'user',
      createdAt: '2026-05-19T09:30:00.000Z',
      channelName: 'Yasmine Studio 4K',
      subscribersCount: 670,
      country: 'Maroc',
      countryCode: 'MA',
      flag: '🇲🇦',
      city: 'Casablanca',
      timezone: 'Africa/Casablanca',
      deviceType: 'Mobile',
      os: 'iOS 18',
      browser: 'Safari Mobile',
      ipMasked: '105.159.42.xx',
      isSuspended: false,
    };

    const user5: User = {
      id: 'usr-alex-montreal',
      username: 'AlexLab_QC',
      email: 'alex.qc@montreal.ca',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&q=80',
      role: 'user',
      createdAt: '2026-06-08T22:15:00.000Z',
      channelName: 'Alex Québec IA',
      subscribersCount: 540,
      country: 'Canada',
      countryCode: 'CA',
      flag: '🇨🇦',
      city: 'Montréal',
      timezone: 'America/Toronto',
      deviceType: 'Desktop',
      os: 'macOS Sequoia',
      browser: 'Safari',
      ipMasked: '24.201.118.xx',
      isSuspended: false,
    };

    const user6: User = {
      id: 'usr-amine-dz',
      username: 'AmineGaming_DZ',
      email: 'amine.dz@alger.dz',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
      role: 'user',
      createdAt: '2026-07-21T16:40:00.000Z',
      channelName: 'Amine Speedrun DZ',
      subscribersCount: 380,
      country: 'Algérie',
      countryCode: 'DZ',
      flag: '🇩🇿',
      city: 'Alger',
      timezone: 'Africa/Algiers',
      deviceType: 'Mobile',
      os: 'Android 15',
      browser: 'Chrome Mobile',
      ipMasked: '41.107.212.xx',
      isSuspended: false,
    };

    const user7: User = {
      id: 'usr-chloe-be',
      username: 'ChloéDesign_BE',
      email: 'chloe.design@brussels.be',
      passwordHash: demoUserPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80',
      role: 'user',
      createdAt: '2026-08-04T13:10:00.000Z',
      channelName: 'Chloé Motion BE',
      subscribersCount: 310,
      country: 'Belgique',
      countryCode: 'BE',
      flag: '🇧🇪',
      city: 'Bruxelles',
      timezone: 'Europe/Brussels',
      deviceType: 'Tablette',
      os: 'iPadOS 18',
      browser: 'Safari',
      ipMasked: '81.240.91.xx',
      isSuspended: false,
    };

    const initialUsers = [adminUser, user1, user2, user3, user4, user5, user6, user7];
    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(initialUsers));

    // Seed namespaces for user1 (ThomasDev - France)
    seedUserNamespace(user1.id, user1, {
      activities: [
        {
          id: 'act-1',
          action: 'watch',
          videoId: 'mk-vid-05',
          videoTitle: 'Développer des Interfaces Ultra-Fluides en React & Vite',
          category: 'Développement',
          watchTimeSeconds: 1420,
          hour: 10,
          country: 'France',
          timestamp: '2026-09-25T10:14:00.000Z',
        },
        {
          id: 'act-2',
          action: 'like',
          videoId: 'mk-vid-05',
          videoTitle: 'Développer des Interfaces Ultra-Fluides en React & Vite',
          category: 'Développement',
          hour: 10,
          country: 'France',
          timestamp: '2026-09-25T10:30:00.000Z',
        },
        {
          id: 'act-3',
          action: 'watch',
          videoId: 'mk-vid-04',
          videoTitle: 'L\'odyssée Spatiale & Synthèse Sonore Cosmique (Echo)',
          category: 'Tech & IA',
          watchTimeSeconds: 980,
          hour: 15,
          country: 'France',
          timestamp: '2026-09-25T15:20:00.000Z',
        },
        {
          id: 'act-4',
          action: 'search',
          searchQuery: 'Architecture Cloud et Kubernetes',
          hour: 18,
          country: 'France',
          timestamp: '2026-09-25T18:00:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '1080p',
        playbackSpeed: 1.25,
        volume: 0.9,
        categoryAffinity: {
          Développement: 24,
          'Tech & IA': 18,
          Gaming: -4,
        },
        dislikedTags: ['Speedrun'],
        lastActive: '2026-09-25T21:30:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-04', 'mk-vid-05'],
        dislikedVideoIds: ['mk-vid-08'],
        savedVideoIds: ['mk-vid-05'],
        downloadedVideos: [
          {
            videoId: 'mk-vid-05',
            downloadedAt: '2026-09-25T10:45:00.000Z',
            fileSizeMb: 145.2,
            title: 'Développer des Interfaces Ultra-Fluides en React & Vite',
          },
        ],
        customPlaylists: [
          {
            id: 'pl-dev',
            title: 'Tutoriels indispensables React',
            videoIds: ['mk-vid-05', 'mk-vid-04'],
            createdAt: '2026-09-25T11:00:00.000Z',
          },
        ],
      },
      telemetry: {
        country: 'France',
        countryCode: 'FR',
        flag: '🇫🇷',
        city: 'Lyon',
        timezone: 'Europe/Paris',
        language: 'fr-FR',
        deviceType: 'Desktop',
        os: 'macOS Sequoia',
        browser: 'Chrome 132',
        ipMasked: '90.63.144.xx',
        screenResolution: '2560x1440',
        sessionsCount: 34,
        bandwidthMb: 1840,
        hourlyUsage: [0, 0, 0, 0, 0, 0, 1, 2, 4, 7, 12, 8, 5, 6, 9, 14, 11, 9, 15, 19, 22, 18, 8, 2],
        trustScore: 99,
      },
    });

    // Seed namespaces for user2 (SophieCinéma - France)
    seedUserNamespace(user2.id, user2, {
      activities: [
        {
          id: 'act-s1',
          action: 'watch',
          videoId: 'mk-vid-01',
          videoTitle: 'Sintel - Chef d\'œuvre Sci-Fi VFX en 4K Ultra HD',
          category: 'Cinéma & 3D',
          watchTimeSeconds: 1850,
          hour: 21,
          country: 'France',
          timestamp: '2026-09-25T21:10:00.000Z',
        },
        {
          id: 'act-s2',
          action: 'like',
          videoId: 'mk-vid-01',
          videoTitle: 'Sintel - Chef d\'œuvre Sci-Fi VFX en 4K Ultra HD',
          category: 'Cinéma & 3D',
          hour: 21,
          country: 'France',
          timestamp: '2026-09-25T21:25:00.000Z',
        },
        {
          id: 'act-s3',
          action: 'watch',
          videoId: 'mk-vid-02',
          videoTitle: 'Big Buck Bunny - Animation 3D Haute Résolution 60 FPS',
          category: 'Cinéma & 3D',
          watchTimeSeconds: 1120,
          hour: 22,
          country: 'France',
          timestamp: '2026-09-25T22:15:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 1,
        categoryAffinity: {
          'Cinéma & 3D': 32,
          'Nature & 4K': 15,
        },
        dislikedTags: [],
        lastActive: '2026-09-25T22:45:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-01', 'mk-vid-02', 'mk-vid-03'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-01'],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        country: 'France',
        countryCode: 'FR',
        flag: '🇫🇷',
        city: 'Paris',
        timezone: 'Europe/Paris',
        language: 'fr-FR',
        deviceType: 'Desktop',
        os: 'Windows 11',
        browser: 'Microsoft Edge',
        ipMasked: '86.242.19.xx',
        screenResolution: '3840x2160',
        sessionsCount: 28,
        bandwidthMb: 3420,
        hourlyUsage: [1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 6, 5, 4, 3, 6, 8, 12, 18, 25, 29, 19, 7],
        trustScore: 100,
      },
    });

    // Seed namespaces for user3 (KarimStream_TN - Tunisie)
    seedUserNamespace(user3.id, user3, {
      activities: [
        {
          id: 'act-k1',
          action: 'watch',
          videoId: 'mk-vid-04',
          videoTitle: 'L\'odyssée Spatiale & Synthèse Sonore Cosmique (Echo)',
          category: 'Tech & IA',
          watchTimeSeconds: 1340,
          hour: 19,
          country: 'Tunisie',
          timestamp: '2026-09-25T19:15:00.000Z',
        },
        {
          id: 'act-k2',
          action: 'voice_search',
          searchQuery: 'Intelligence Artificielle et Robotique 4K',
          hour: 20,
          country: 'Tunisie',
          timestamp: '2026-09-25T20:05:00.000Z',
        },
        {
          id: 'act-k3',
          action: 'ai_blocked',
          searchQuery: 'Commentaire inapproprié bloqué par IA',
          blockedReason: 'Harcèlement, Insultes & Vulgarité',
          hour: 20,
          country: 'Tunisie',
          timestamp: '2026-09-25T20:40:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 0.95,
        categoryAffinity: {
          'Tech & IA': 28,
          Gaming: 19,
          'Cinéma & 3D': 12,
        },
        dislikedTags: [],
        lastActive: '2026-09-26T01:20:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-04', 'mk-vid-08'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-04'],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        country: 'Tunisie',
        countryCode: 'TN',
        flag: '🇹🇳',
        city: 'Tunis',
        timezone: 'Africa/Tunis',
        language: 'fr-TN',
        deviceType: 'Mobile',
        os: 'Android 15',
        browser: 'Chrome Mobile',
        ipMasked: '197.14.88.xx',
        screenResolution: '1080x2400',
        sessionsCount: 41,
        bandwidthMb: 2690,
        hourlyUsage: [4, 2, 0, 0, 0, 0, 0, 1, 3, 5, 7, 9, 11, 10, 8, 9, 13, 17, 21, 26, 28, 24, 15, 9],
        trustScore: 82,
      },
    });

    // Seed namespaces for user4 (YasmineVFX_MA - Maroc)
    seedUserNamespace(user4.id, user4, {
      activities: [
        {
          id: 'act-y1',
          action: 'watch',
          videoId: 'mk-vid-03',
          videoTitle: 'Exploration Océanique & Grands Espaces Marins en 4K HDR',
          category: 'Nature & 4K',
          watchTimeSeconds: 1620,
          hour: 16,
          country: 'Maroc',
          timestamp: '2026-09-25T16:30:00.000Z',
        },
        {
          id: 'act-y2',
          action: 'like',
          videoId: 'mk-vid-06',
          videoTitle: 'Immersion Botanique & Macrophotographie en 4K Ultra HD',
          category: 'Nature & 4K',
          hour: 17,
          country: 'Maroc',
          timestamp: '2026-09-25T17:10:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 0.85,
        categoryAffinity: {
          'Nature & 4K': 30,
          Musique: 21,
          'Cinéma & 3D': 14,
        },
        dislikedTags: [],
        lastActive: '2026-09-25T23:10:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-03', 'mk-vid-06', 'mk-vid-07'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-03', 'mk-vid-07'],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        country: 'Maroc',
        countryCode: 'MA',
        flag: '🇲🇦',
        city: 'Casablanca',
        timezone: 'Africa/Casablanca',
        language: 'fr-MA',
        deviceType: 'Mobile',
        os: 'iOS 18',
        browser: 'Safari Mobile',
        ipMasked: '105.159.42.xx',
        screenResolution: '1179x2556',
        sessionsCount: 25,
        bandwidthMb: 2110,
        hourlyUsage: [0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 8, 7, 5, 8, 12, 16, 19, 18, 15, 17, 20, 14, 6, 1],
        trustScore: 98,
      },
    });

    // Seed namespaces for user5 (AlexLab_QC - Canada)
    seedUserNamespace(user5.id, user5, {
      activities: [
        {
          id: 'act-a1',
          action: 'watch',
          videoId: 'mk-vid-07',
          videoTitle: 'Lo-Fi Chill Beats pour Coder, Travailler et se Relaxer ☕',
          category: 'Musique',
          watchTimeSeconds: 2400,
          hour: 14,
          country: 'Canada',
          timestamp: '2026-09-25T14:00:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '1080p',
        playbackSpeed: 1,
        volume: 0.75,
        categoryAffinity: {
          Musique: 26,
          Développement: 22,
          'Tech & IA': 16,
        },
        dislikedTags: [],
        lastActive: '2026-09-26T02:00:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-07', 'mk-vid-05'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-07'],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        country: 'Canada',
        countryCode: 'CA',
        flag: '🇨🇦',
        city: 'Montréal',
        timezone: 'America/Toronto',
        language: 'fr-CA',
        deviceType: 'Desktop',
        os: 'macOS Sequoia',
        browser: 'Safari',
        ipMasked: '24.201.118.xx',
        screenResolution: '2560x1600',
        sessionsCount: 19,
        bandwidthMb: 1580,
        hourlyUsage: [6, 8, 5, 2, 0, 0, 0, 0, 0, 1, 3, 5, 9, 14, 18, 16, 12, 10, 11, 13, 15, 12, 9, 7],
        trustScore: 100,
      },
    });

    // Seed namespaces for user6 (AmineGaming_DZ - Algérie)
    seedUserNamespace(user6.id, user6, {
      activities: [
        {
          id: 'act-dz1',
          action: 'watch',
          videoId: 'mk-vid-08',
          videoTitle: 'Speedrun & Analyse Moteur Graphique Next-Gen',
          category: 'Gaming',
          watchTimeSeconds: 1190,
          hour: 22,
          country: 'Algérie',
          timestamp: '2026-09-25T22:30:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '1080p',
        playbackSpeed: 1.25,
        volume: 1,
        categoryAffinity: {
          Gaming: 35,
          'Cinéma & 3D': 14,
        },
        dislikedTags: [],
        lastActive: '2026-09-25T23:40:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-08', 'mk-vid-02'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-08'],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        country: 'Algérie',
        countryCode: 'DZ',
        flag: '🇩🇿',
        city: 'Alger',
        timezone: 'Africa/Algiers',
        language: 'fr-DZ',
        deviceType: 'Mobile',
        os: 'Android 15',
        browser: 'Chrome Mobile',
        ipMasked: '41.107.212.xx',
        screenResolution: '1080x2400',
        sessionsCount: 22,
        bandwidthMb: 1490,
        hourlyUsage: [3, 1, 0, 0, 0, 0, 0, 0, 1, 2, 4, 6, 8, 7, 5, 7, 10, 14, 18, 21, 24, 26, 17, 8],
        trustScore: 95,
      },
    });

    // Seed namespaces for user7 (ChloéDesign_BE - Belgique)
    seedUserNamespace(user7.id, user7, {
      activities: [
        {
          id: 'act-be1',
          action: 'watch',
          videoId: 'mk-vid-01',
          videoTitle: 'Sintel - Chef d\'œuvre Sci-Fi VFX en 4K Ultra HD',
          category: 'Cinéma & 3D',
          watchTimeSeconds: 920,
          hour: 17,
          country: 'Belgique',
          timestamp: '2026-09-25T17:45:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 0.85,
        categoryAffinity: {
          'Cinéma & 3D': 24,
          'Nature & 4K': 18,
        },
        dislikedTags: [],
        lastActive: '2026-09-25T19:10:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-01', 'mk-vid-06'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-06'],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        country: 'Belgique',
        countryCode: 'BE',
        flag: '🇧🇪',
        city: 'Bruxelles',
        timezone: 'Europe/Brussels',
        language: 'fr-BE',
        deviceType: 'Tablette',
        os: 'iPadOS 18',
        browser: 'Safari',
        ipMasked: '81.240.91.xx',
        screenResolution: '2048x2732',
        sessionsCount: 16,
        bandwidthMb: 1230,
        hourlyUsage: [0, 0, 0, 0, 0, 0, 0, 1, 3, 5, 6, 8, 9, 7, 8, 10, 14, 16, 13, 11, 9, 6, 2, 0],
        trustScore: 100,
      },
    });

    // Seed namespaces for admin
    seedUserNamespace(adminUser.id, adminUser, {
      activities: [
        {
          id: 'act-adm-1',
          action: 'watch',
          videoId: 'mk-vid-01',
          videoTitle: 'Sintel - Chef d\'œuvre Sci-Fi VFX en 4K Ultra HD',
          category: 'Cinéma & 3D',
          watchTimeSeconds: 600,
          hour: new Date().getHours(),
          country: currentEnv.country,
          timestamp: new Date().toISOString(),
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 0.8,
        categoryAffinity: { 'Tech & IA': 20, 'Cinéma & 3D': 15 },
        dislikedTags: [],
        lastActive: new Date().toISOString(),
      },
      favorites: {
        likedVideoIds: ['mk-vid-01'],
        dislikedVideoIds: [],
        savedVideoIds: [],
        downloadedVideos: [],
        customPlaylists: [],
      },
      telemetry: {
        ...currentEnv,
        sessionsCount: 52,
        bandwidthMb: 4120,
        hourlyUsage: [2, 1, 0, 0, 0, 1, 2, 4, 8, 14, 18, 16, 12, 15, 19, 21, 18, 16, 20, 24, 22, 15, 8, 4],
        trustScore: 100,
      },
    });
  }
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
    bandwidthMb: 45,
    hourlyUsage: Array.from({ length: 24 }, (_, h) => (h === new Date().getHours() ? 3 : 0)),
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

// Automatic activity tracking (Updates both activities.json, preferences.json, and telemetry.json hourly usage!)
export const logUserActivity = (
  userId: string,
  activity: Omit<UserActivity, 'id' | 'timestamp'>
): void => {
  recordGlobalHourlyHit();
  if (!userId) return;

  const currentHour = new Date().getHours();
  const telemetry = getUserTelemetry(userId);
  telemetry.hourlyUsage[currentHour] = (telemetry.hourlyUsage[currentHour] || 0) + 1;
  if (activity.action === 'watch') {
    const addedMb = Math.max(2, Math.round(((activity.watchTimeSeconds || 15) / 60) * 18));
    telemetry.bandwidthMb = (telemetry.bandwidthMb || 0) + addedMb;
  }
  saveUserFile(userId, 'telemetry.json', telemetry);

  const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
  const newActivity: UserActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    hour: currentHour,
    country: telemetry.country,
    timestamp: new Date().toISOString(),
  };
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
      const bonus = (activity.watchTimeSeconds || 0) > 30 ? 2 : 1;
      preferences.categoryAffinity[activity.category] = currentScore + bonus;
    } else if (activity.action === 'comment' || activity.action === 'favorite') {
      preferences.categoryAffinity[activity.category] = currentScore + 4;
    }
  }

  saveUserFile(userId, 'preferences.json', preferences);
};

// Authentication & Session
export const getStoredUsers = (): User[] => {
  const raw = localStorage.getItem(USERS_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as User[];
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
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`,
    role: 'user',
    createdAt: new Date().toISOString(),
    channelName: `${cleanUsername} Studio`,
    subscribersCount: 1,
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
  initialHourly[currentHour] = 2;

  seedUserNamespace(newUser.id, newUser, {
    activities: [
      {
        id: `act-init-${Date.now()}`,
        action: 'watch',
        videoTitle: 'Inscription & Initialisation du profil MK Streaming',
        hour: currentHour,
        country: env.country,
        timestamp: new Date().toISOString(),
      },
    ],
    preferences: {
      theme: 'dark',
      autoplay: true,
      preferredQuality: '1080p',
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
      bandwidthMb: 28,
      hourlyUsage: initialHourly,
      trustScore: 100,
    },
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

  // Increment session count and current hour usage on login
  telemetry.sessionsCount = (telemetry.sessionsCount || 1) + 1;
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
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
};

// Alias for getUserTelemetry
export const getUserGeoTelemetry = getUserTelemetry;

// Delete user account and namespace files
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
};

// Get full isolated namespace for a single user
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
}

// Compute real site-wide country percentages & 24h hourly usage across all users
export const getGlobalSiteTelemetrySummary = (): GlobalSiteTelemetrySummary => {
  const users = getStoredUsers();
  const hourlyUsage24h = new Array(24).fill(0);
  let totalSessions = 0;
  let totalBandwidthMB = 0;

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
    totalBandwidthMB += tel.bandwidthMb || 50;

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
      existing.bandwidthMB += tel.bandwidthMb || 50;
      if (tel.city) existing.cities.add(tel.city);
    } else {
      countryMap.set(code, {
        country: tel.country || 'France',
        countryCode: code,
        flag: tel.flag || '🇫🇷',
        usersCount: 1,
        activeSessions: tel.sessionsCount || 1,
        bandwidthMB: tel.bandwidthMb || 50,
        cities: new Set(tel.city ? [tel.city] : ['Paris']),
      });
    }
  });

  // Add global guest hits if any
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
      bandwidthMB: Math.round(item.bandwidthMB),
      cities: Array.from(item.cities),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  let peakHour = 20;
  let peakHourCount = 0;
  hourlyUsage24h.forEach((count, hr) => {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = hr;
    }
  });

  const totalActions24h = hourlyUsage24h.reduce((a, b) => a + b, 0);

  return {
    totalUsers: users.length,
    totalSessions,
    totalBandwidthMB: Math.round(totalBandwidthMB),
    totalActions24h,
    peakHour,
    peakHourCount,
    hourlyUsage24h,
    countryStats,
  };
};

// ADMIN PRIVILEGED ACCESS TO ALL USER NAMESPACES + TELEMETRY
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

const DEFAULT_RECENT_SEARCHES: SearchHistoryItem[] = [
  { id: 'sh-1', text: 'Sintel Sci-Fi VFX 4K', videoId: 'mk-vid-01', timestamp: '2026-09-26T08:00:00Z' },
  { id: 'sh-2', text: 'Big Buck Bunny Animation 3D', videoId: 'mk-vid-02', timestamp: '2026-09-26T08:05:00Z' },
  { id: 'sh-3', text: 'Exploration Océanique 4K HDR', videoId: 'mk-vid-03', timestamp: '2026-09-26T08:10:00Z' },
  { id: 'sh-4', text: 'Odyssée Spatiale & IA Echo', videoId: 'mk-vid-04', timestamp: '2026-09-26T08:15:00Z' },
  { id: 'sh-5', text: 'Développer en React & TypeScript', videoId: 'mk-vid-05', timestamp: '2026-09-26T08:20:00Z' },
  { id: 'sh-6', text: 'Lo-Fi Chill Beats pour Coder', videoId: 'mk-vid-07', timestamp: '2026-09-26T08:25:00Z' },
  { id: 'sh-7', text: 'Speedrun Gaming Next-Gen', videoId: 'mk-vid-08', timestamp: '2026-09-26T08:30:00Z' },
];

const getSearchHistoryStorageKey = (userId?: string | null) =>
  `mk_search_history_${userId || 'guest'}_v1`;

export const getSearchHistory = (userId?: string | null): SearchHistoryItem[] => {
  try {
    const key = getSearchHistoryStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_RECENT_SEARCHES));
      return DEFAULT_RECENT_SEARCHES;
    }
    return JSON.parse(raw) as SearchHistoryItem[];
  } catch {
    return DEFAULT_RECENT_SEARCHES;
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
  const updated = [newItem, ...filtered].slice(0, 20);
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

  // Also remove matching search activities from user's isolated activities.json if logged in
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

