import bcrypt from 'bcryptjs';
import { User, UserActivity, UserPreferences, UserFavorites, UserProfileNamespace } from '../types';

const USERS_INDEX_KEY = 'mk_system_users_index_v2';
const CURRENT_USER_SESSION_KEY = 'mk_session_token_v2';
const NAMESPACE_PREFIX = 'mk_vfs_users';

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

// Seed initial users (including Admin nimda981 and demo users)
export const initializeNamespaceSystem = async () => {
  const existingUsers = localStorage.getItem(USERS_INDEX_KEY);
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
    };

    const initialUsers = [adminUser, user1, user2];
    localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(initialUsers));

    // Seed namespaces for user1
    seedUserNamespace(user1.id, user1, {
      activities: [
        {
          id: 'act-1',
          action: 'watch',
          videoId: 'mk-vid-04',
          videoTitle: 'Développer une Application Web Réactive Moderne en React & TypeScript',
          category: 'Développement',
          watchTimeSeconds: 1100,
          timestamp: '2026-09-22T10:14:00.000Z',
        },
        {
          id: 'act-2',
          action: 'like',
          videoId: 'mk-vid-04',
          videoTitle: 'Développer une Application Web Réactive Moderne en React & TypeScript',
          category: 'Développement',
          timestamp: '2026-09-22T10:30:00.000Z',
        },
        {
          id: 'act-3',
          action: 'watch',
          videoId: 'mk-vid-03',
          videoTitle: 'L\'essor des Modèles d\'Intelligence Artificielle en 2026',
          category: 'Tech & IA',
          watchTimeSeconds: 850,
          timestamp: '2026-09-23T15:20:00.000Z',
        },
        {
          id: 'act-4',
          action: 'search',
          searchQuery: 'Architecture Cloud et Kubernetes',
          timestamp: '2026-09-23T18:00:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '1080p',
        playbackSpeed: 1.25,
        volume: 0.9,
        categoryAffinity: {
          'Développement': 18,
          'Tech & IA': 14,
          'Gaming': -4,
        },
        dislikedTags: ['Gaming', 'Speedrun'],
        lastActive: '2026-09-23T18:30:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-04', 'mk-vid-03', 'mk-vid-10'],
        dislikedVideoIds: ['mk-vid-06'],
        savedVideoIds: ['mk-vid-10', 'mk-vid-11'],
        downloadedVideos: [
          {
            videoId: 'mk-vid-04',
            downloadedAt: '2026-09-22T10:45:00.000Z',
            fileSizeMb: 145.2,
            title: 'Développer une Application Web Réactive Moderne en React & TypeScript',
          }
        ],
        customPlaylists: [
          {
            id: 'pl-dev',
            title: 'Tutoriels indispensables React',
            videoIds: ['mk-vid-04', 'mk-vid-10'],
            createdAt: '2026-09-22T11:00:00.000Z',
          }
        ],
      },
    });

    // Seed namespaces for user2
    seedUserNamespace(user2.id, user2, {
      activities: [
        {
          id: 'act-s1',
          action: 'watch',
          videoId: 'mk-vid-01',
          videoTitle: 'Tears of Steel - Chef d\'œuvre Sci-Fi VFX en 4K Ultra HD',
          category: 'Cinéma & 3D',
          watchTimeSeconds: 730,
          timestamp: '2026-09-21T21:10:00.000Z',
        },
        {
          id: 'act-s2',
          action: 'like',
          videoId: 'mk-vid-01',
          videoTitle: 'Tears of Steel - Chef d\'œuvre Sci-Fi VFX en 4K Ultra HD',
          category: 'Cinéma & 3D',
          timestamp: '2026-09-21T21:25:00.000Z',
        },
        {
          id: 'act-s3',
          action: 'watch',
          videoId: 'mk-vid-02',
          videoTitle: 'Big Buck Bunny - Animation 3D Haute Résolution 60 FPS',
          category: 'Cinéma & 3D',
          watchTimeSeconds: 580,
          timestamp: '2026-09-22T14:15:00.000Z',
        },
      ],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 1,
        categoryAffinity: {
          'Cinéma & 3D': 25,
          'Nature & 4K': 10,
        },
        dislikedTags: [],
        lastActive: '2026-09-22T15:00:00.000Z',
      },
      favorites: {
        likedVideoIds: ['mk-vid-01', 'mk-vid-02', 'mk-vid-09'],
        dislikedVideoIds: [],
        savedVideoIds: ['mk-vid-09'],
        downloadedVideos: [],
        customPlaylists: [],
      },
    });

    // Seed namespaces for admin
    seedUserNamespace(adminUser.id, adminUser, {
      activities: [],
      preferences: {
        theme: 'dark',
        autoplay: true,
        preferredQuality: '4K',
        playbackSpeed: 1,
        volume: 0.8,
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
      }
    });
  }
};

const getNamespaceKey = (userId: string, file: 'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json') => {
  return `${NAMESPACE_PREFIX}_${userId}_${file.replace('.json', '')}`;
};

const seedUserNamespace = (
  userId: string,
  profile: User,
  data: { activities: UserActivity[]; preferences: UserPreferences; favorites: UserFavorites }
) => {
  localStorage.setItem(getNamespaceKey(userId, 'profile.json'), JSON.stringify(profile, null, 2));
  localStorage.setItem(getNamespaceKey(userId, 'activities.json'), JSON.stringify(data.activities, null, 2));
  localStorage.setItem(getNamespaceKey(userId, 'preferences.json'), JSON.stringify(data.preferences, null, 2));
  localStorage.setItem(getNamespaceKey(userId, 'favorites.json'), JSON.stringify(data.favorites, null, 2));
};

// USER NAMESPACE READ/WRITE METHODS (ISOLATED)

export const getUserFile = <T>(userId: string, file: 'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json'): T | null => {
  const raw = localStorage.getItem(getNamespaceKey(userId, file));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const saveUserFile = <T>(userId: string, file: 'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json', data: T): void => {
  localStorage.setItem(getNamespaceKey(userId, file), JSON.stringify(data, null, 2));
};

// Automatic activity tracking
export const logUserActivity = (userId: string, activity: Omit<UserActivity, 'id' | 'timestamp'>): void => {
  if (!userId) return;
  const activities = getUserFile<UserActivity[]>(userId, 'activities.json') || [];
  const newActivity: UserActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  activities.unshift(newActivity);
  // Keep last 150 activities
  if (activities.length > 150) activities.pop();
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

export const registerUser = async (username: string, email: string, plainPassword: string): Promise<User> => {
  const users = getStoredUsers();
  const lowerEmail = email.toLowerCase().trim();
  const cleanUsername = username.trim();

  if (users.some(u => u.email.toLowerCase() === lowerEmail)) {
    throw new Error('Un compte avec cette adresse email existe déjà.');
  }
  if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error('Ce nom d\'utilisateur est déjà utilisé.');
  }

  const passwordHash = await hashPassword(plainPassword);
  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    username: cleanUsername,
    email: lowerEmail,
    passwordHash,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`,
    role: 'user',
    createdAt: new Date().toISOString(),
    channelName: `${cleanUsername} Studio`,
    subscribersCount: 0,
  };

  users.push(newUser);
  localStorage.setItem(USERS_INDEX_KEY, JSON.stringify(users));

  // Initialize fresh isolated namespace
  seedUserNamespace(newUser.id, newUser, {
    activities: [
      {
        id: `act-init-${Date.now()}`,
        action: 'watch',
        videoTitle: 'Bienvenue sur MK Streaming',
        timestamp: new Date().toISOString(),
      }
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
    }
  });

  return newUser;
};

export const authenticateUser = async (identifier: string, plainPassword: string): Promise<User> => {
  const users = getStoredUsers();
  const cleanId = identifier.trim().toLowerCase();
  
  // Find by username OR email
  const user = users.find(u => 
    u.username.toLowerCase() === cleanId || 
    u.email.toLowerCase() === cleanId
  );

  if (!user) {
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  const isValid = await verifyPassword(plainPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

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

// ADMIN PRIVILEGED ACCESS TO ALL USER NAMESPACES
export const getAdminAllUsersData = (currentCaller: User | null): { user: User; files: Record<string, unknown> }[] => {
  if (!currentCaller || currentCaller.role !== 'admin') {
    throw new Error('Accès non autorisé : Privilèges Administrateur requis.');
  }

  const users = getStoredUsers();
  return users.map(u => {
    return {
      user: u,
      files: {
        'profile.json': getUserFile(u.id, 'profile.json'),
        'activities.json': getUserFile(u.id, 'activities.json') || [],
        'preferences.json': getUserFile(u.id, 'preferences.json') || {},
        'favorites.json': getUserFile(u.id, 'favorites.json') || {
          likedVideoIds: [],
          dislikedVideoIds: [],
          savedVideoIds: [],
          downloadedVideos: [],
          customPlaylists: [],
        },
      }
    };
  });
};
