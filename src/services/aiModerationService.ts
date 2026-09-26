import { AIModerationIncident, User } from '../types';
import {
  logUserActivity,
  recordUserViolationInTelemetry,
  addNotification,
} from '../storage/userNamespace';

const MODERATION_INCIDENTS_KEY = 'mk_ai_moderation_incidents_v3';

export interface ModerationResult {
  isAppropriate: boolean;
  blocked: boolean;
  violationCategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reason: string;
  flaggedTerms: string[];
}

// Comprehensive multi-language rule dictionary for instant 0ms blocking + offline/static fallback
const VIOLATION_RULES: Array<{
  category: string;
  severity: 'medium' | 'high' | 'critical';
  reason: string;
  patterns: RegExp[];
}> = [
  {
    category: 'Contenu Adulte / NSFW (+18)',
    severity: 'critical',
    reason:
      'Le système IA de sécurité MK a détecté des termes ou éléments à caractère sexuel, pornographique ou réservé aux adultes (+18), strictement interdits sur la plateforme.',
    patterns: [
      /\b(porn|porno|pornographie|xxx|sex|sexe|nude|nudes|nudit[eé]|hentai|onlyfans|xvideos|xnxx|pornhub|youporn|redtube|brazzers|erotique|érotique|orgasm|masturb|fellat|sodom| escort|strip-tease|striptease|camgirl|nsfw|18\+|sextape)\b/i,
      /\b(bite|chatte|nichon|teub|zizi|boobs|pussy|dick|cock|asshole|slut|whore|milf|bdsm|fetish)\b/i,
    ],
  },
  {
    category: 'Violence Grave, Terrorisme & Menaces',
    severity: 'critical',
    reason:
      'Le Bouclier IA a bloqué ce contenu car il contient des références à la violence extrême, aux armes, au gore, au terrorisme ou à des menaces physiques.',
    patterns: [
      /\b(tuer|égorger|egorger|massacre|attentat|bombe|terrorisme|terroriste|daesh|isis|suicide|suicider|meurtre|assassinat|viol|violer|violé|pédophil|pedophil|gore|décapiter|decapiter|torture|torturer|fusillade|kalachnikov)\b/i,
      /\b(je vais te tuer|kill you|murder|rape|school shooting|beheading|bomb making|self harm|scarification)\b/i,
    ],
  },
  {
    category: 'Discours Haineux & Discrimination',
    severity: 'critical',
    reason:
      'Ce contenu enfreint la charte contre les discours de haine, le racisme, la xénophobie et les discriminations.',
    patterns: [
      /\b(sale arabe|sale noir|sale juif|sale blanc|nègre|negre|nigger|nigga|faggot|youpin|bougnoule|bicot|raton|mort aux|hitler|nazi|ku klux klan|kkk|suprémaciste)\b/i,
    ],
  },
  {
    category: 'Harcèlement, Insultes & Vulgarité',
    severity: 'high',
    reason:
      'Le système IA de modération a détecté du langage injurieux, offensant ou du harcèlement envers les membres de la communauté.',
    patterns: [
      /\b(connard|connasse|enculé|encule|enculer|fils de pute|fdp|putain|pute|salope|batard|bâtard|ntm|nique ta mère|nique ta mere|niquer|ta gueule|ferme ta gueule|tg|pd|pédé|pede|tapette|abruti|crétin|cretin|merde|ducon|clochard|pouffiasse)\b/i,
      /\b(fuck|fucking|motherfucker|bitch|bastard|cunt|retard|dumbass|stfu|gtfo|zebi|zbi|kahba|9a7ba|nik|miboun|3asba|kelb|hmar)\b/i,
    ],
  },
  {
    category: 'Drogues, Arnaques & Contenu Illégal',
    severity: 'high',
    reason:
      'Ce contenu fait la promotion de substances illicites, de piratage, de fraude financière ou de liens malveillants.',
    patterns: [
      /\b(cocaine|cocaïne|heroine|héroïne|methamphetamine|acheter drogue|darknet|carding|faux billets|arnaque|phishing|hacked account|free crypto scam|telegram drogue)\b/i,
    ],
  },
];

/**
 * Local instant 0ms lexical & pattern check
 */
export const evaluateLocalHeuristics = (text: string): ModerationResult => {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    return {
      isAppropriate: true,
      blocked: false,
      violationCategory: 'Aucune',
      severity: 'low',
      confidence: 99,
      reason: 'Contenu conforme.',
      flaggedTerms: [],
    };
  }

  for (const rule of VIOLATION_RULES) {
    const matchedTerms: string[] = [];
    for (const regex of rule.patterns) {
      const match = cleanText.match(regex);
      if (match && match[0]) {
        matchedTerms.push(match[0].toLowerCase());
      }
    }

    if (matchedTerms.length > 0) {
      return {
        isAppropriate: false,
        blocked: true,
        violationCategory: rule.category,
        severity: rule.severity,
        confidence: 98,
        reason: rule.reason,
        flaggedTerms: Array.from(new Set(matchedTerms)),
      };
    }
  }

  return {
    isAppropriate: true,
    blocked: false,
    violationCategory: 'Aucune',
    severity: 'low',
    confidence: 96,
    reason: 'Contenu vérifié et conforme aux standards MK.',
    flaggedTerms: [],
  };
};

/**
 * Full Hybrid AI Moderation (Instant Local Shield + Server-side Gemini 3.8 Flash Multimodal Verification)
 */
export const moderateContentWithAI = async (params: {
  text: string;
  source: 'video_upload' | 'comment' | 'reply' | 'search' | 'voice_search';
  user: User | null;
  imageBase64?: string;
}): Promise<ModerationResult> => {
  const { text, source, user, imageBase64 } = params;

  // Step 1: Instant local lexical & heuristic check (0ms latency)
  const localCheck = evaluateLocalHeuristics(text);
  if (localCheck.blocked) {
    recordModerationIncident({
      user,
      source,
      contentSnippet: text,
      result: localCheck,
    });
    return localCheck;
  }

  // Step 2: Server-side Gemini AI check (for deep contextual & image moderation)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('/api/ai/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        contextType: source,
        imageBase64: imageBase64 && imageBase64.startsWith('data:image') ? imageBase64 : undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as ModerationResult;
      if (data && typeof data.blocked === 'boolean') {
        if (data.blocked || !data.isAppropriate) {
          const blockedResult: ModerationResult = {
            isAppropriate: false,
            blocked: true,
            violationCategory: data.violationCategory || 'Contenu Inapproprié',
            severity: data.severity || 'high',
            confidence: data.confidence || 95,
            reason:
              data.reason ||
              'Le modèle Gemini IA a identifié ce contenu comme inapproprié pour la communauté.',
            flaggedTerms: data.flaggedTerms || [],
          };
          recordModerationIncident({
            user,
            source,
            contentSnippet: text,
            result: blockedResult,
          });
          return blockedResult;
        }
        return data;
      }
    }
  } catch {
    // Seamless fallback to local result when running as static site or offline
  }

  return localCheck;
};

/**
 * Stores blocked incident in localStorage and updates user's isolated namespace telemetry
 */
export const recordModerationIncident = (params: {
  user: User | null;
  source: 'video_upload' | 'comment' | 'reply' | 'search' | 'voice_search';
  contentSnippet: string;
  result: ModerationResult;
}): AIModerationIncident => {
  const { user, source, contentSnippet, result } = params;
  const incidents = getModerationIncidents();

  const newIncident: AIModerationIncident = {
    id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: user?.id || 'guest-visitor',
    username: user?.username || 'Visiteur Invité',
    userAvatar:
      user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
    country: user?.country || 'France',
    source,
    contentSnippet: contentSnippet.slice(0, 160),
    violationCategory: result.violationCategory,
    severity: result.severity,
    confidence: result.confidence,
    reason: result.reason,
    flaggedTerms: result.flaggedTerms,
    timestamp: new Date().toISOString(),
    autoBlocked: true,
  };

  const updated = [newIncident, ...incidents].slice(0, 200);
  localStorage.setItem(MODERATION_INCIDENTS_KEY, JSON.stringify(updated));

  if (user) {
    logUserActivity(user.id, {
      action: 'ai_blocked',
      searchQuery: contentSnippet.slice(0, 80),
      blockedReason: `${result.violationCategory} (${result.reason})`,
    });
    recordUserViolationInTelemetry(user.id, result.severity);
  }

  addNotification({
    userId: user?.id,
    title: `Bouclier IA : ${result.violationCategory}`,
    message: `Contenu bloqué automatiquement : "${contentSnippet.slice(0, 45)}..."`,
    type: 'security',
  });

  return newIncident;
};

export const getModerationIncidents = (): AIModerationIncident[] => {
  try {
    const raw = localStorage.getItem(MODERATION_INCIDENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AIModerationIncident[];
  } catch {
    return [];
  }
};

export const clearModerationIncidents = (): void => {
  localStorage.setItem(MODERATION_INCIDENTS_KEY, JSON.stringify([]));
};

