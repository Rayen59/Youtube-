import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Sun,
  Moon,
  ShieldAlert,
  User as UserIcon,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Bookmark,
  History,
  Play,
  Video as VideoPlusIcon,
  Plus,
  Bell,
  BellRing,
  CheckCheck,
  Mic,
  MicOff,
  ArrowUpLeft,
  ShieldCheck,
  Trash2,
  Sparkles,
  Check,
} from 'lucide-react';
import { User, AppNotification } from '../../types';
import { MOCK_VIDEOS } from '../../data/mockVideos';
import {
  evaluateLocalHeuristics,
  moderateContentWithAI,
  ModerationResult,
} from '../../services/aiModerationService';
import {
  transcribeAudioBlob,
  translateVoiceText,
  VoiceLangCode,
} from '../../services/voiceService';
import {
  logUserActivity,
  getSearchHistory,
  addSearchHistoryItem,
  deleteSearchHistoryItem,
  clearAllSearchHistory,
  SearchHistoryItem,
  getNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../../storage/userNamespace';

interface HeaderProps {
  currentUser: User | null;
  canGoBack: boolean;
  onGoBack: () => void;
  onGoHome: () => void;
  onSearch: (query: string) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenLibrary: (tab?: string) => void;
  onOpenProfile: () => void;
  onOpenCreateModal: () => void;
  onSelectVideoById?: (videoId: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
}

// Type declaration for browser Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  canGoBack,
  onGoBack,
  onGoHome,
  onSearch,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  onOpenLibrary,
  onOpenProfile,
  onOpenCreateModal,
  onSelectVideoById,
  theme,
  onToggleTheme,
  onToggleFilters,
  isFiltersOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Notifications Panel state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getNotifications(currentUser?.id)
  );
  const [browserPushStatus, setBrowserPushStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  // Voice-to-Text (Speech-to-Text) & Voice Translation Modal states
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribingAI, setIsTranscribingAI] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [originalVoiceText, setOriginalVoiceText] = useState('');
  const [voiceLang, setVoiceLang] = useState<VoiceLangCode>('fr-FR');
  const [autoTranslateVoice, setAutoTranslateVoice] = useState<boolean>(true);
  const [voiceStatusText, setVoiceStatusText] = useState(
    'Parlez maintenant : votre voix est transcrite et traduite en texte en direct...'
  );
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([25, 45, 70, 40, 80, 50, 30]);

  // AI Moderation Block Modal state
  const [blockedAlert, setBlockedAlert] = useState<ModerationResult | null>(null);

  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>(() =>
    getSearchHistory(currentUser?.id)
  );

  useEffect(() => {
    setRecentSearches(getSearchHistory(currentUser?.id));
  }, [currentUser?.id, isSearchFocused, isMobileSearchActive]);

  // Sync notifications in real-time
  useEffect(() => {
    const syncNotifs = () => {
      setNotifications(getNotifications(currentUser?.id));
    };
    syncNotifs();
    window.addEventListener('mk-notifications-updated', syncNotifs);
    return () => window.removeEventListener('mk-notifications-updated', syncNotifs);
  }, [currentUser?.id]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleRequestBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPushStatus(perm);
      if (perm === 'granted') {
        addNotification({
          userId: currentUser?.id,
          title: 'Notifications Navigateur Activées',
          message: 'Vous recevrez désormais les alertes MK Streaming en temps réel.',
          type: 'system',
        });
      }
    } catch {}
  };

  const handleDeleteSingleSearch = (idOrText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = deleteSearchHistoryItem(currentUser?.id, idOrText);
    setRecentSearches(updated);
  };

  const handleClearAllSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = clearAllSearchHistory(currentUser?.id);
    setRecentSearches(updated);
  };

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pulseIntervalRef = useRef<number | null>(null);
  const autoSubmitTimeoutRef = useRef<number | null>(null);
  const speechProducedResultRef = useRef<boolean>(false);

  // Focus mobile input when mobile search is activated
  useEffect(() => {
    if (isMobileSearchActive) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
    }
  }, [isMobileSearchActive]);

  // Real-time search trigger with instant AI Moderation guard
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!searchQuery.trim()) {
        onSearch('');
        return;
      }
      const check = evaluateLocalHeuristics(searchQuery);
      if (check.blocked) {
        setBlockedAlert(check);
        moderateContentWithAI({
          text: searchQuery,
          source: 'search',
          user: currentUser,
        });
        setSearchQuery('');
        onSearch('');
        return;
      }
      onSearch(searchQuery);
    }, 180);

    return () => clearTimeout(handler);
  }, [searchQuery, onSearch, currentUser]);

  // Click outside listener for user menu and notifications menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup microphone & recognition resources without losing recorded audio
  const stopMicrophoneResources = (keepRecorderStopping = false) => {
    setIsListening(false);
    if (autoSubmitTimeoutRef.current) {
      window.clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    if (pulseIntervalRef.current) {
      window.clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (!keepRecorderStopping && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopMicrophoneResources();
  }, []);

  // Translate existing voice transcript into target language
  const handleTranslateTranscript = async (
    textToTranslate: string,
    targetLang: VoiceLangCode
  ) => {
    const cleaned = textToTranslate.trim();
    if (!cleaned) return;
    setIsTranscribingAI(true);
    setVoiceStatusText(
      `Traduction vocale en cours vers ${
        targetLang === 'fr-FR'
          ? 'le Français 🇫🇷'
          : targetLang === 'en-US'
          ? "l'Anglais 🇺🇸"
          : "l'Arabe 🇹🇳"
      }...`
    );
    const translated = await translateVoiceText(cleaned, targetLang);
    setIsTranscribingAI(false);
    if (translated) {
      setVoiceTranscript(translated);
      setSearchQuery(translated);
      onSearch(translated);
      setVoiceStatusText(
        `Traduit avec succès en ${
          targetLang === 'fr-FR'
            ? 'Français 🇫🇷'
            : targetLang === 'en-US'
            ? 'Anglais 🇺🇸'
            : 'Arabe 🇹🇳'
        } !`
      );
    }
  };

  // Process a finalized voice transcript -> transform voice to text in search bar
  const finalizeVoiceSearch = async (spokenText: string, closeModal = true) => {
    const cleaned = spokenText.trim();
    if (!cleaned) return;

    stopMicrophoneResources();

    const modResult = await moderateContentWithAI({
      text: cleaned,
      source: 'voice_search',
      user: currentUser,
    });

    if (modResult.blocked) {
      setIsVoiceModalOpen(false);
      setBlockedAlert(modResult);
      setSearchQuery('');
      onSearch('');
      return;
    }

    // Put the transcribed/translated text directly into the search input and execute search
    setSearchQuery(cleaned);
    onSearch(cleaned);
    setRecentSearches(addSearchHistoryItem(currentUser?.id, cleaned));
    logUserActivity(currentUser?.id, {
      action: 'voice_search',
      searchQuery: cleaned,
    });

    if (closeModal) {
      setIsVoiceModalOpen(false);
      setIsMobileSearchActive(false);
      setIsSearchFocused(false);
    }
  };

  // Stop active recording and immediately trigger transcription + translation
  const stopAndTranscribeNow = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      try {
        mediaRecorderRef.current.stop();
        return;
      } catch {}
    }
    stopMicrophoneResources();
    if (voiceTranscript.trim()) {
      handleTranslateTranscript(voiceTranscript, voiceLang);
    } else {
      setVoiceStatusText('Micro arrêté. Cliquez sur le micro pour parler.');
    }
  };

  // Start MediaRecorder + Web Audio AnalyserNode with automatic silence detection & Gemini AI Transcription/Translation
  const startGeminiAudioRecorder = async (
    targetLang: VoiceLangCode = voiceLang,
    silentParallel = false
  ) => {
    if (!silentParallel) {
      stopMicrophoneResources();
      setVoiceError(null);
      setVoiceStatusText(
        'Écoute vocale active... Parlez (toutes langues) : transcription & traduction automatiques !'
      );
      setIsListening(true);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Setup real-time Web Audio AnalyserNode for live voice waveform & silence detection
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const sourceNode = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          sourceNode.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let hasDetectedVoice = false;
          let silentFramesCount = 0;

          if (pulseIntervalRef.current) {
            window.clearInterval(pulseIntervalRef.current);
          }

          pulseIntervalRef.current = window.setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const bars = [
              Math.min(100, Math.max(18, Math.round((dataArray[1] / 255) * 100))),
              Math.min(100, Math.max(18, Math.round((dataArray[2] / 255) * 100))),
              Math.min(100, Math.max(18, Math.round((dataArray[3] / 255) * 100))),
              Math.min(100, Math.max(18, Math.round((dataArray[4] / 255) * 100))),
              Math.min(100, Math.max(18, Math.round((dataArray[5] / 255) * 100))),
              Math.min(100, Math.max(18, Math.round((dataArray[6] / 255) * 100))),
              Math.min(100, Math.max(18, Math.round((dataArray[7] / 255) * 100))),
            ];
            setAudioLevels(bars);

            const avgVolume =
              bars.reduce((acc, val) => acc + val, 0) / bars.length;

            if (avgVolume > 32) {
              hasDetectedVoice = true;
              silentFramesCount = 0;
            } else if (hasDetectedVoice) {
              silentFramesCount += 1;
              // ~1.5 seconds of silence after user spoke -> automatically stop and transcribe!
              if (silentFramesCount >= 12) {
                if (
                  mediaRecorderRef.current &&
                  mediaRecorderRef.current.state === 'recording'
                ) {
                  try {
                    mediaRecorderRef.current.stop();
                  } catch {}
                }
              }
            }
          }, 125);
        }
      } catch {
        // Fallback waveform animation if AudioContext fails
        pulseIntervalRef.current = window.setInterval(() => {
          setAudioLevels(
            Array.from({ length: 7 }, () => Math.floor(25 + Math.random() * 75))
          );
        }, 140);
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const recordedChunks = [...audioChunksRef.current];
        stopMicrophoneResources(true);

        // If Web Speech API already produced a transcript, translate it if autoTranslate is enabled
        if (speechProducedResultRef.current && voiceTranscript.trim()) {
          if (autoTranslateVoice) {
            await handleTranslateTranscript(voiceTranscript, targetLang);
          }
          return;
        }

        if (recordedChunks.length === 0) {
          setVoiceStatusText('Aucun son enregistré. Cliquez sur le micro pour réessayer.');
          return;
        }

        setIsTranscribingAI(true);
        setVoiceStatusText('Transcription & traduction de votre voix en texte...');

        const audioBlob = new Blob(recordedChunks, { type: mimeType });
        const result = await transcribeAudioBlob({
          audioBlob,
          mimeType,
          lang: targetLang,
          translateToTarget: autoTranslateVoice,
        });

        setIsTranscribingAI(false);

        if (result.transcript) {
          setOriginalVoiceText(result.originalTranscript || result.transcript);
          setVoiceTranscript(result.transcript);
          setSearchQuery(result.transcript);
          onSearch(result.transcript);
          setRecentSearches(addSearchHistoryItem(currentUser?.id, result.transcript));
          setVoiceStatusText('Voix transcrite et traduite en texte avec succès !');
          return;
        }

        if (result.error) {
          setVoiceError(result.error);
        }
      };

      recorder.start(200);

      // Auto-stop after 5.5 seconds max if user keeps talking or background noise continues
      autoSubmitTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') {
          try {
            recorder.stop();
          } catch {}
        }
      }, 5500);
    } catch {
      if (!silentParallel) {
        setIsListening(false);
        setVoiceError(
          'L’accès au microphone a été bloqué par le navigateur. Autorisez le microphone dans la barre d’adresse.'
        );
      }
    }
  };

  // Start Hybrid Voice Recognition + AI Voice Transcription/Translation
  const startVoiceRecognition = (langOverride?: VoiceLangCode) => {
    const activeLang = langOverride || voiceLang;
    stopMicrophoneResources();
    speechProducedResultRef.current = false;
    setIsVoiceModalOpen(true);
    setVoiceError(null);
    setIsTranscribingAI(false);
    setVoiceStatusText(
      'Parlez maintenant : votre voix est transcrite et traduite en direct...'
    );
    setIsListening(true);

    // Always start the real microphone MediaRecorder + silence detector so even in iframes or unsupported browsers, audio is captured & transcribed/translated!
    startGeminiAudioRecorder(activeLang, true);

    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      try {
        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;
        recognition.lang = activeLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        let accumulatedFinal = '';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          for (let i = event.resultIndex || 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              accumulatedFinal += res[0].transcript + ' ';
            } else {
              interimTranscript += res[0].transcript;
            }
          }

          const combinedText = (accumulatedFinal + interimTranscript).trim();
          if (combinedText) {
            speechProducedResultRef.current = true;
            setOriginalVoiceText(combinedText);
            setVoiceTranscript(combinedText);
            setSearchQuery(combinedText);
            onSearch(combinedText);
            setVoiceStatusText('Voix détectée et transcrite en direct !');

            // If a final segment was produced and autoTranslate is active, translate it
            if (accumulatedFinal.trim() && autoTranslateVoice) {
              translateVoiceText(combinedText, activeLang).then((translated) => {
                if (translated && translated !== combinedText) {
                  setVoiceTranscript(translated);
                  setSearchQuery(translated);
                  onSearch(translated);
                }
              });
            }
          }
        };

        recognition.onerror = () => {
          // MediaRecorder is already running in parallel and will transcribe via Gemini on stop!
        };

        recognition.start();
      } catch {
        // MediaRecorder is already running in parallel and will handle transcription
      }
    }
  };

  const handleSelectSuggestion = async (query: string) => {
    const modResult = await moderateContentWithAI({
      text: query,
      source: 'search',
      user: currentUser,
    });
    if (modResult.blocked) {
      setBlockedAlert(modResult);
      return;
    }
    setSearchQuery(query);
    onSearch(query);
    setRecentSearches(addSearchHistoryItem(currentUser?.id, query));
    setIsSearchFocused(false);
    setIsMobileSearchActive(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setVoiceTranscript('');
    onSearch('');
    if (isMobileSearchActive) {
      mobileInputRef.current?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const modResult = await moderateContentWithAI({
      text: searchQuery,
      source: 'search',
      user: currentUser,
    });

    if (modResult.blocked) {
      setBlockedAlert(modResult);
      setSearchQuery('');
      onSearch('');
      return;
    }

    onSearch(searchQuery);
    setRecentSearches(addSearchHistoryItem(currentUser?.id, searchQuery));
    logUserActivity(currentUser?.id, {
      action: 'search',
      searchQuery: searchQuery.trim(),
    });
    setIsSearchFocused(false);
    setIsMobileSearchActive(false);
  };

  const getSuggestionThumbnail = (videoId?: string) => {
    if (!videoId) return null;
    const v = MOCK_VIDEOS.find((item) => item.id === videoId);
    return v ? v.thumbnailUrl : null;
  };

  return (
    <>
      {/* =========================================================================
          0. AI AUTOMATIC CONTENT BLOCKING ALERT MODAL
         ========================================================================= */}
      {blockedAlert && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#161616] border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-[#ff0000] shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                  Bouclier IA MK • Blocage Automatique
                </span>
                <h3 className="text-lg font-black text-white">
                  Contenu Inapproprié Bloqué
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 text-xs text-gray-200 space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Catégorie détectée :</span>
                <span className="font-bold text-red-400">{blockedAlert.violationCategory}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Indice de certitude IA :</span>
                <span className="font-mono font-bold text-white">{blockedAlert.confidence}%</span>
              </div>
              <p className="text-gray-300 pt-1 border-t border-white/10 leading-relaxed">
                {blockedAlert.reason}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBlockedAlert(null)}
              className="w-full py-2.5 rounded-xl bg-[#ff0000] hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              J'ai compris — Respecter la charte MK
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          0B. REAL VOICE-TO-TEXT & VOICE TRANSLATION MICROPHONE MODAL
         ========================================================================= */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#181818] border border-white/15 rounded-3xl p-6 shadow-2xl text-white relative">
            <button
              type="button"
              onClick={() => {
                stopMicrophoneResources();
                setIsVoiceModalOpen(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pr-10">
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <Mic className="w-4 h-4 text-[#ff0000]" />
                  <span>Microphone Voix → Texte & Traduction Vocale</span>
                </div>

                {/* Language Selector for Speech-to-Text & Voice Translation */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  {(
                    [
                      { code: 'fr-FR', label: '🇫🇷 FR' },
                      { code: 'en-US', label: '🇺🇸 EN' },
                      { code: 'ar-SA', label: '🇹🇳 AR' },
                    ] as const
                  ).map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setVoiceLang(l.code);
                        if (voiceTranscript.trim() && !isListening) {
                          handleTranslateTranscript(
                            originalVoiceText || voiceTranscript,
                            l.code
                          );
                        } else {
                          startVoiceRecognition(l.code);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        voiceLang === l.code
                          ? 'bg-[#ff0000] text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Translate Toggle Banner */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
                <span className="text-gray-300">
                  Traduire automatiquement la voix vers{' '}
                  <strong className="text-white">
                    {voiceLang === 'fr-FR'
                      ? 'Français 🇫🇷'
                      : voiceLang === 'en-US'
                      ? 'English 🇺🇸'
                      : 'العربية 🇹🇳'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setAutoTranslateVoice(!autoTranslateVoice)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                    autoTranslateVoice
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {autoTranslateVoice ? 'Traduction Auto : OUI' : 'Traduction Auto : NON'}
                </button>
              </div>

              <p className="text-xs text-gray-300">{voiceStatusText}</p>

              {/* Animated Microphone Button & Waveform */}
              <div className="py-3 flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopAndTranscribeNow();
                    } else {
                      startVoiceRecognition();
                    }
                  }}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? 'bg-[#ff0000] text-white shadow-[0_0_35px_rgba(255,0,0,0.65)] scale-105'
                      : 'bg-[#2a2a2a] hover:bg-[#383838] text-gray-300'
                  }`}
                  title={
                    isListening
                      ? 'Cliquez pour arrêter et transcrire/traduire maintenant'
                      : 'Cliquez pour parler'
                  }
                >
                  {isListening && (
                    <span className="absolute inset-0 rounded-full bg-[#ff0000] animate-ping opacity-30" />
                  )}
                  {isListening ? (
                    <Mic className="w-9 h-9 text-white relative z-10" />
                  ) : (
                    <MicOff className="w-8 h-8 text-gray-300 relative z-10" />
                  )}
                </button>

                {/* Live Audio Waveform Bars */}
                <div className="flex items-center justify-center gap-1.5 h-8">
                  {audioLevels.map((lvl, index) => (
                    <div
                      key={index}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isListening ? 'bg-[#ff0000]' : 'bg-white/20'
                      }`}
                      style={{
                        height: isListening ? `${Math.max(20, lvl)}%` : '20%',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* REAL-TIME TRANSCRIBED & TRANSLATED TEXT BOX (VOICE -> TEXT) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-300">
                    Texte transcrit / traduit depuis votre voix :
                  </span>
                  {voiceTranscript && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceTranscript('');
                        setOriginalVoiceText('');
                        setSearchQuery('');
                        onSearch('');
                      }}
                      className="text-red-400 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      Effacer le texte
                    </button>
                  )}
                </div>

                {originalVoiceText &&
                  originalVoiceText.toLowerCase() !== voiceTranscript.toLowerCase() && (
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-400 flex items-center justify-between">
                      <span>Paroles originales détectées : « {originalVoiceText} »</span>
                    </div>
                  )}

                <textarea
                  rows={2}
                  value={voiceTranscript}
                  onChange={(e) => {
                    setVoiceTranscript(e.target.value);
                    setSearchQuery(e.target.value);
                    onSearch(e.target.value);
                  }}
                  placeholder={
                    isTranscribingAI
                      ? 'Transcription et traduction IA en cours...'
                      : 'Parlez dans votre micro : vos paroles sont transcrites et traduites ici automatiquement...'
                  }
                  className="w-full p-3.5 rounded-2xl bg-[#111111] border border-white/15 focus:border-[#ff0000] text-sm font-medium text-white placeholder-gray-500 outline-none resize-none"
                />

                {/* 1-Click Instant Translation Bar for any transcribed or typed text */}
                {voiceTranscript.trim() && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-gray-400 mr-1">
                      Traduire ce texte en :
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceLang('fr-FR');
                        handleTranslateTranscript(voiceTranscript, 'fr-FR');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white cursor-pointer"
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceLang('en-US');
                        handleTranslateTranscript(voiceTranscript, 'en-US');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white cursor-pointer"
                    >
                      🇺🇸 English
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceLang('ar-SA');
                        handleTranslateTranscript(voiceTranscript, 'ar-SA');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white cursor-pointer"
                    >
                      🇹🇳 العربية
                    </button>
                  </div>
                )}
              </div>

              {voiceError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                  {voiceError}
                </div>
              )}

              {/* Action buttons: Stop/Transcribe AI or Validate Search */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopAndTranscribeNow();
                    } else {
                      startVoiceRecognition();
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#ff0000]" />
                  <span>
                    {isListening
                      ? 'Arrêter & Traduire maintenant'
                      : isTranscribingAI
                      ? 'Traduction en cours...'
                      : 'Relancer l’écoute vocale'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!voiceTranscript.trim()}
                  onClick={() => finalizeVoiceSearch(voiceTranscript, true)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#ff0000] hover:bg-red-700 disabled:opacity-40 text-xs font-black text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span>Rechercher ce texte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. FULLSCREEN MOBILE SEARCH TAKEOVER
         ========================================================================= */}
      {isMobileSearchActive && (
        <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col animate-in fade-in duration-150 select-none">
          <div className="h-16 px-3 flex items-center gap-2 border-b border-[#282828] bg-[#121212]">
            <button
              onClick={() => setIsMobileSearchActive(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer shrink-0"
              title="Fermer la recherche"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center min-w-0">
              <div className="relative flex-1 flex items-center bg-[#222222] border border-[#383838] focus-within:border-[#ff0000] rounded-full px-3.5 h-10 transition-colors">
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher ou dicter au micro..."
                  className="w-full bg-transparent text-white placeholder-zinc-400 text-base outline-none pr-8 caret-[#ff0000]"
                  autoComplete="off"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Real Working Microphone Button on Mobile */}
            <button
              type="button"
              onClick={() => startVoiceRecognition()}
              className="w-10 h-10 rounded-full bg-[#ff0000] hover:bg-red-700 flex items-center justify-center text-white transition-colors shrink-0 cursor-pointer shadow-md"
              title="Dicter votre recherche (Voix vers Texte)"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e1e]">
            {recentSearches.length > 0 && (
              <div className="px-4 py-2.5 bg-[#161616] flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  Historique de recherche réel ({recentSearches.length})
                </span>
                <button
                  type="button"
                  onClick={handleClearAllSearches}
                  className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Tout supprimer</span>
                </button>
              </div>
            )}

            {recentSearches.length === 0 && (
              <div className="p-10 text-center text-zinc-500 text-xs">
                Aucune recherche récente enregistrée. Tapez ou utilisez le microphone pour rechercher.
              </div>
            )}

            {recentSearches
              .filter((item) =>
                searchQuery.trim()
                  ? item.text.toLowerCase().includes(searchQuery.toLowerCase().trim())
                  : true
              )
              .map((item) => {
                const thumb = getSuggestionThumbnail(item.videoId);
                return (
                  <div
                    key={item.id || item.text}
                    onClick={() => handleSelectSuggestion(item.text)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] active:bg-[#252525] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                      <History className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-white text-sm sm:text-base font-medium truncate">
                        {item.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {thumb && (
                        <img
                          src={thumb}
                          alt=""
                          className="w-11 h-6 object-cover rounded-md border border-white/10"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(item.text);
                          mobileInputRef.current?.focus();
                        }}
                        className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                        title="Remplir la recherche"
                      >
                        <ArrowUpLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingleSearch(item.id || item.text, e)}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Supprimer cette recherche"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          2. MAIN HEADER (DESKTOP + MOBILE)
         ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 z-40 bg-[#0f0f0f] border-b border-[#282828] shadow-md select-none">
        <div className="w-full h-full px-3 sm:px-6 flex items-center justify-between">
          {/* LEFT: BACK ARROW + MK LOGO */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canGoBack && (
              <button
                onClick={onGoBack}
                title="Page précédente"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onGoHome}
              className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none shrink-0"
              title="Accueil MK Stream"
            >
              <div className="relative w-8 h-6 sm:w-9 sm:h-7 bg-[#ff0000] rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
              </div>

              <div className="flex items-baseline">
                <span className="font-black text-lg sm:text-xl tracking-tighter text-white">
                  MK
                </span>
                <span className="text-[#ff0000] font-black text-xl leading-none">.</span>
                <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase ml-1 hidden xs:inline">
                  STREAM
                </span>
              </div>
            </button>
          </div>

          {/* CENTER: DESKTOP SEARCH BAR + REAL WORKING VOICE-TO-TEXT MICROPHONE BUTTON */}
          <div className="hidden md:flex relative flex-1 max-w-xl lg:max-w-2xl mx-4">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <div className="relative flex-1 flex items-center min-w-0">
                <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>

                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 180)}
                  placeholder="Rechercher ou cliquer sur le micro pour dicter..."
                  className="w-full h-10 bg-[#121212] hover:bg-[#181818] focus:bg-[#121212] text-white placeholder-zinc-400 text-sm rounded-l-full pl-10 pr-9 border border-[#333333] focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] outline-none transition-all caret-[#ff0000]"
                  autoComplete="off"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search submit button */}
              <button
                type="submit"
                title="Lancer la recherche"
                className="h-10 px-5 bg-[#222222] hover:bg-[#2c2c2c] border-y border-r border-[#333333] rounded-r-full flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* REAL WORKING VOICE-TO-TEXT MICROPHONE BUTTON ON DESKTOP */}
              <button
                type="button"
                onClick={() => startVoiceRecognition()}
                title="Transformer la voix en texte (Microphone)"
                className={`ml-2.5 h-10 w-10 rounded-full border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-[#ff0000] text-white border-[#ff0000] animate-pulse'
                    : 'bg-[#222222] hover:bg-[#ff0000] text-white border-[#333333] hover:border-[#ff0000]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Filters toggle button */}
              <button
                type="button"
                onClick={onToggleFilters}
                title="Filtres de recherche"
                className={`ml-2 h-10 w-10 rounded-full border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isFiltersOpen
                    ? 'bg-[#ff0000] text-white border-[#ff0000]'
                    : 'bg-[#222222] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white border-[#333333]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </form>

            {/* Desktop Dropdown Suggestions with Delete Individual Search */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f1f1f] border border-[#383838] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-bold uppercase tracking-wider">
                    Recherches récentes ({recentSearches.length})
                  </span>
                  {recentSearches.length > 0 && (
                    <button
                      type="button"
                      onMouseDown={handleClearAllSearches}
                      className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Tout effacer</span>
                    </button>
                  )}
                </div>

                {recentSearches.length === 0 ? (
                  <div className="px-4 py-5 text-center text-xs text-zinc-500">
                    Votre historique de recherche est vide.
                  </div>
                ) : (
                  recentSearches.map((item) => {
                    const thumb = getSuggestionThumbnail(item.videoId);
                    return (
                      <div
                        key={item.id || item.text}
                        onMouseDown={() => handleSelectSuggestion(item.text)}
                        className="flex items-center justify-between px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors group/sitem"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <History className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="text-white text-sm font-medium truncate">
                            {item.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {thumb && (
                            <img
                              src={thumb}
                              alt=""
                              className="w-10 h-6 object-cover rounded border border-white/10"
                            />
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) =>
                              handleDeleteSingleSearch(item.id || item.text, e)
                            }
                            className="px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-red-400 hover:bg-red-500/15 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Supprimer cette recherche"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* RIGHT: MOBILE & DESKTOP ACTIONS */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* MOBILE ONLY: SEARCH ICON BUTTON */}
            <button
              onClick={() => setIsMobileSearchActive(true)}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
              title="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* MOBILE ONLY: DIRECT MICROPHONE BUTTON */}
            <button
              onClick={() => startVoiceRecognition()}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-[#ff0000] active:scale-95 transition-colors cursor-pointer"
              title="Microphone : transformer la voix en texte"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* =================================================================
                REAL WORKING NOTIFICATIONS BELL & DROPDOWN PANEL
               ================================================================= */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer relative ${
                  isNotifOpen
                    ? 'bg-[#ff0000] text-white'
                    : 'text-white hover:bg-white/10 active:scale-95'
                }`}
                title="Centre de Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff0000] border-2 border-[#0f0f0f] text-white text-[10px] font-black flex items-center justify-center">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full mt-1 sm:mt-2 w-[calc(100vw-16px)] sm:w-96 bg-[#1b1b1b] border border-[#383838] rounded-3xl shadow-2xl z-50 text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Notifications Header */}
                  <div className="px-4 py-3.5 bg-[#222222] border-b border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-[#ff0000]" />
                      <span className="text-xs sm:text-sm font-black">
                        Notifications ({notifications.length})
                      </span>
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#ff0000]/20 text-[#ff4444] text-[10px] font-bold">
                          {unreadNotifCount} non lue{unreadNotifCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNotifications(markAllNotificationsAsRead(currentUser?.id))
                          }
                          className="text-[11px] text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          title="Tout marquer comme lu"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Tout lire</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNotifications(clearAllNotifications(currentUser?.id))
                          }
                          className="text-[11px] text-red-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          title="Vider toutes les notifications"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Vider</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Browser Push Permission Banner */}
                  {browserPushStatus === 'default' && (
                    <div className="px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-blue-200">
                        Activer les notifications système du navigateur ?
                      </span>
                      <button
                        type="button"
                        onClick={handleRequestBrowserPush}
                        className="px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        Activer
                      </button>
                    </div>
                  )}

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Bell className="w-8 h-8 text-zinc-600 mx-auto" />
                        <p className="text-xs font-bold text-white">
                          Aucune notification pour le moment
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Vos alertes d'abonnements, de publications 4K et de sécurité s'afficheront ici en direct.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            setNotifications(
                              markNotificationAsRead(notif.id, currentUser?.id)
                            );
                            if (notif.videoId && onSelectVideoById) {
                              setIsNotifOpen(false);
                              onSelectVideoById(notif.videoId);
                            }
                          }}
                          className={`px-4 py-3 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                            notif.read
                              ? 'bg-transparent hover:bg-white/5 opacity-75'
                              : 'bg-[#ff0000]/10 hover:bg-[#ff0000]/15'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#ff0000] mt-1.5 shrink-0" />
                            )}
                            {notif.thumbnailUrl && (
                              <img
                                src={notif.thumbnailUrl}
                                alt=""
                                className="w-12 h-8 object-cover rounded-lg border border-white/10 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white leading-snug">
                                {notif.title}
                              </div>
                              <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-gray-500 mt-1 block">
                                {new Date(notif.timestamp).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                • {new Date(notif.timestamp).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifications(
                                deleteNotification(notif.id, currentUser?.id)
                              );
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                            title="Supprimer cette notification"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP ONLY: CRÉER BUTTON */}
            <button
              onClick={onOpenCreateModal}
              title="Créer une vidéo"
              className="hidden md:flex items-center gap-2 px-3.5 h-9 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-[#ff0000]" />
              <span>Créer</span>
            </button>

            {/* THEME TOGGLE */}
            <button
              onClick={onToggleTheme}
              title="Mode clair/sombre"
              className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* USER PROFILE OR LOGIN */}
            {currentUser ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#ff0000] transition-all cursor-pointer focus:outline-none"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-[#ff0000]"
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#212121] border border-[#383838] rounded-2xl shadow-2xl p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-white/10 mb-1">
                      <div className="font-bold text-sm truncate flex items-center gap-1.5">
                        <span>{currentUser.username}</span>
                        {currentUser.flag && <span>{currentUser.flag}</span>}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{currentUser.email}</div>
                    </div>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-white bg-[#ff0000] hover:bg-red-700 rounded-xl mb-1 flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-white" />
                        <span>Panneau Admin & Stats Réelles</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenCreateModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/15 rounded-xl mb-1 flex items-center gap-2 cursor-pointer"
                    >
                      <VideoPlusIcon className="w-4 h-4 text-[#ff0000]" />
                      <span>Créer une vidéo</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-zinc-400" />
                      <span>Profil & Statistiques Réelles</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenLibrary('favorites');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                      <span>Favoris</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-white border border-white/15 text-xs font-semibold transition-all cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-[#ff0000]" />
                <span>Connexion</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
