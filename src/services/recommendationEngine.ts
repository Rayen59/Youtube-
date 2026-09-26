import {
  Video,
  UserActivity,
  UserPreferences,
  UserFavorites,
  RecommendationScore,
  User,
  UserGeoTelemetry,
} from '../types';
import { MOCK_VIDEOS } from '../data/mockVideos';
import { getUserFile, getUserGeoTelemetry } from '../storage/userNamespace';

export interface UserAIAnalysis {
  userId: string;
  username: string;
  summaryPersona: string;
  whatTheyLike: {
    topCategories: { category: string; score: number }[];
    preferredTags: string[];
    favoriteVideosCount: number;
    completionTendency: string;
  };
  whatTheyDislike: {
    avoidedCategories: string[];
    dislikedTags: string[];
    dislikedVideosCount: number;
    bounceRateReason: string;
  };
  viewingHabits: {
    totalWatchTimeMinutes: number;
    averageVideoDurationMinutes: number;
    mostActiveTimeSlot: string;
    peakHourIndex: number;
    playbackSpeedPreference: string;
    preferredResolution: string;
  };
  advancedMetrics: {
    engagementIndex: number; // 0-100
    retentionRate: number; // %
    bingeScore: number; // 0-100
    trustScore: number; // 0-100
    totalActionsCount: number;
    watchActionsCount: number;
    likeActionsCount: number;
    searchActionsCount: number;
    commentActionsCount: number;
    shareDownloadCount: number;
    hourlyDistribution: number[]; // 24 hours
    estimatedDataMB: number;
  };
  recommendationConfidence: number; // e.g. 94%
}

/**
 * Calculates real-time hybrid recommendations for a user
 */
export const getPersonalizedRecommendations = (
  userId: string | null,
  currentVideoId?: string
): RecommendationScore[] => {
  // If visitor is not logged in, return popular/trending scored videos
  if (!userId) {
    return MOCK_VIDEOS
      .filter(v => v.id !== currentVideoId)
      .map(video => ({
        video,
        score: video.views / 10000 + (video.likesCount / (video.dislikesCount + 1)) * 0.1,
        matchReasons: ['Tendance générale sur MK', 'Forte popularité auprès des spectateurs'],
      }))
      .sort((a, b) => b.score - a.score);
  }

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

  // Recent searches keywords
  const recentSearchKeywords = activities
    .filter(a => a.action === 'search' && a.searchQuery)
    .map(a => (a.searchQuery || '').toLowerCase().split(/\s+/))
    .flat()
    .filter(w => w.length > 2);

  // Watched video IDs
  const watchedVideoIds = new Set(
    activities.filter(a => a.action === 'watch').map(a => a.videoId).filter(Boolean)
  );

  const dislikedSet = new Set(favorites.dislikedVideoIds);
  const likedSet = new Set(favorites.likedVideoIds);

  const scoredList: RecommendationScore[] = MOCK_VIDEOS
    .filter(v => v.id !== currentVideoId)
    .map(video => {
      let score = 50; // base score
      const matchReasons: string[] = [];

      // 1. Content-based: Category Affinity (+5 to +30)
      const catAffinity = preferences.categoryAffinity[video.category] || 0;
      score += catAffinity * 3;

      if (catAffinity > 10) {
        matchReasons.push(`Forte affinité avec votre catégorie favorite : ${video.category}`);
      } else if (catAffinity > 0) {
        matchReasons.push(`Recommandé d'après vos intérêts pour ${video.category}`);
      }

      // 2. Disliked check (-100 penalty)
      if (dislikedSet.has(video.id)) {
        score -= 200;
        matchReasons.push('Vidéo déjà signalée comme non appréciée');
      }

      // Disliked tags penalty
      const hasDislikedTag = video.tags.some(tag => preferences.dislikedTags.includes(tag));
      if (hasDislikedTag) {
        score -= 80;
      }

      // Disliked category
      if (catAffinity < -5) {
        score -= 50;
      }

      // 3. Search query relevance (+15 per keyword match)
      const matchingKeywords = recentSearchKeywords.filter(keyword =>
        video.title.toLowerCase().includes(keyword) ||
        video.description.toLowerCase().includes(keyword) ||
        video.tags.some(t => t.toLowerCase().includes(keyword))
      );
      if (matchingKeywords.length > 0) {
        score += matchingKeywords.length * 15;
        matchReasons.push(`En lien avec votre recherche récente : "${matchingKeywords[0]}"`);
      }

      // 4. Collaborative filtering bonus
      if (likedSet.has(video.id)) {
        score += 40;
        matchReasons.push('Vous avez aimé cette vidéo');
      }

      // Penalty if watched very recently so feed stays fresh
      if (watchedVideoIds.has(video.id)) {
        score -= 15;
      }

      // Quality & engagement bonus
      score += (video.likesCount / (video.views + 1)) * 50;

      if (matchReasons.length === 0) {
        matchReasons.push('Sélectionné pour vous selon l\'algorithme IA MK');
      }

      return {
        video,
        score: Math.max(0, Math.round(score)),
        matchReasons,
      };
    });

  return scoredList.sort((a, b) => b.score - a.score);
};

/**
 * Generates in-depth AI Analysis & Real Telemetry Diagnostics for Admin Dashboard
 */
export const generateUserAIAnalysis = (user: User): UserAIAnalysis => {
  const activities = getUserFile<UserActivity[]>(user.id, 'activities.json') || [];
  const preferences = getUserFile<UserPreferences>(user.id, 'preferences.json') || {
    theme: 'dark',
    autoplay: true,
    preferredQuality: '1080p',
    playbackSpeed: 1,
    volume: 1,
    categoryAffinity: {},
    dislikedTags: [],
    lastActive: new Date().toISOString(),
  };
  const favorites = getUserFile<UserFavorites>(user.id, 'favorites.json') || {
    likedVideoIds: [],
    dislikedVideoIds: [],
    savedVideoIds: [],
    downloadedVideos: [],
    customPlaylists: [],
  };
  const telemetry: UserGeoTelemetry = getUserGeoTelemetry(user.id);

  // 1. Calculate affinities
  const categoryScores = Object.entries(preferences.categoryAffinity)
    .map(([category, score]) => ({
      category,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  const topCategories = categoryScores.filter(c => c.score > 0);
  const avoidedCategories = categoryScores.filter(c => c.score < 0).map(c => c.category);

  // 2. Watch & interaction metrics
  const watchActivities = activities.filter(a => a.action === 'watch');
  const likeActivities = activities.filter(a => a.action === 'like');
  const searchActivities = activities.filter(
    a => a.action === 'search' || a.action === 'voice_search'
  );
  const commentActivities = activities.filter(a => a.action === 'comment');
  const shareDownloadActivities = activities.filter(
    a => a.action === 'download' || a.action === 'favorite' || a.action === 'upload'
  );

  const totalWatchTimeSeconds = watchActivities.reduce(
    (acc, curr) => acc + (curr.watchTimeSeconds || 0),
    0
  );
  const avgDuration =
    watchActivities.length > 0 ? totalWatchTimeSeconds / watchActivities.length : 0;

  // 3. Peak hour calculation from real 24h telemetry array
  const hourly = Array.isArray(telemetry.hourlyUsage) && telemetry.hourlyUsage.length === 24
    ? telemetry.hourlyUsage
    : new Array(24).fill(0);

  let peakHour = new Date().getHours();
  let maxVal = -1;
  hourly.forEach((val, h) => {
    if (val > maxVal) {
      maxVal = val;
      peakHour = h;
    }
  });

  const formatHourSlot = (h: number) => {
    const nextH = (h + 1) % 24;
    const period =
      h >= 5 && h < 12
        ? 'Matinée'
        : h >= 12 && h < 18
        ? 'Après-midi'
        : h >= 18 && h <= 23
        ? 'Soirée'
        : 'Nuit';
    return `${period} (${String(h).padStart(2, '0')}h00 - ${String(nextH).padStart(2, '0')}h00)`;
  };

  // Liked tags collection
  const likedVideos = MOCK_VIDEOS.filter(v => favorites.likedVideoIds.includes(v.id));
  const tagCounts: Record<string, number> = {};
  likedVideos.forEach(v => {
    v.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const preferredTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => e[0]);

  // Persona synthesis
  let summaryPersona = 'Compte Actif (Aucune activité enregistrée)';
  if (activities.length > 0 || topCategories.length > 0) {
    summaryPersona = 'Explorateur Actif MK';
    if (topCategories.length > 0) {
      const primary = topCategories[0].category;
      if (primary.includes('Tech') || primary.includes('Développement')) {
        summaryPersona = 'Ingénieur & Passionné d\'Innovations Numériques';
      } else if (primary.includes('Cinéma') || primary.includes('3D')) {
        summaryPersona = 'Cinéphile Exigeant & Amateur d\'Arts Numériques';
      } else if (primary.includes('Gaming')) {
        summaryPersona = 'Gamer Assidu & Amateur d\'Esport';
      } else if (primary.includes('Nature')) {
        summaryPersona = 'Adepte de Contemplation 4K & Évasion';
      } else if (primary.includes('Musique')) {
        summaryPersona = 'Mélomane & Travailleur en Quête de Flow Lo-Fi';
      } else if (primary.includes('Documentaire')) {
        summaryPersona = 'Analyste Curieux & Passionné d\'Histoire/Sciences';
      }
    }
  }

  const engagementIndex =
    activities.length === 0 && favorites.likedVideoIds.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            watchActivities.length * 8 +
              likeActivities.length * 10 +
              commentActivities.length * 15 +
              searchActivities.length * 5 +
              shareDownloadActivities.length * 12
          )
        );

  const retentionRate =
    watchActivities.length === 0
      ? 0
      : Math.min(100, Math.max(10, Math.round((avgDuration / 60) * 20)));

  const bingeScore =
    watchActivities.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(watchActivities.length * 10 + (telemetry.sessionsCount || 1) * 5)
        );

  return {
    userId: user.id,
    username: user.username,
    summaryPersona,
    whatTheyLike: {
      topCategories:
        topCategories.length > 0
          ? topCategories
          : [{ category: 'Aucune catégorie visionnée pour le moment', score: 0 }],
      preferredTags:
        preferredTags.length > 0 ? preferredTags : ['Aucun tag favori pour le moment'],
      favoriteVideosCount:
        favorites.likedVideoIds.length + favorites.savedVideoIds.length,
      completionTendency:
        watchActivities.length === 0
          ? 'Aucun visionnage enregistré'
          : avgDuration > 120
          ? 'Complétion élevée'
          : 'Visionnage court / en cours',
    },
    whatTheyDislike: {
      avoidedCategories:
        avoidedCategories.length > 0 ? avoidedCategories : ['Aucune catégorie rejetée'],
      dislikedTags:
        preferences.dislikedTags.length > 0
          ? preferences.dislikedTags
          : ['Aucun tag filtré'],
      dislikedVideosCount: favorites.dislikedVideoIds.length,
      bounceRateReason:
        favorites.dislikedVideoIds.length > 0
          ? `${favorites.dislikedVideoIds.length} vidéo(s) signalée(s) comme non appréciée(s)`
          : 'Aucun signalement négatif',
    },
    viewingHabits: {
      totalWatchTimeMinutes: Math.round((totalWatchTimeSeconds / 60) * 10) / 10,
      averageVideoDurationMinutes: Math.round((avgDuration / 60) * 10) / 10,
      mostActiveTimeSlot: formatHourSlot(peakHour),
      peakHourIndex: peakHour,
      playbackSpeedPreference: `${preferences.playbackSpeed || 1}x`,
      preferredResolution: preferences.preferredQuality || '4K',
    },
    advancedMetrics: {
      engagementIndex,
      retentionRate,
      bingeScore,
      trustScore: telemetry.trustScore ?? 100,
      totalActionsCount: activities.length,
      watchActionsCount: watchActivities.length,
      likeActionsCount: favorites.likedVideoIds.length,
      searchActionsCount: searchActivities.length,
      commentActionsCount: commentActivities.length,
      shareDownloadCount:
        shareDownloadActivities.length + favorites.downloadedVideos.length,
      hourlyDistribution: hourly,
      estimatedDataMB: telemetry.bandwidthMb || 0,
    },
    recommendationConfidence:
      activities.length === 0
        ? 0
        : Math.min(99, Math.round(50 + activities.length * 5)),
  };
};
