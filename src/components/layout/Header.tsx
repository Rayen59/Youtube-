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
  Mic,
  MicOff,
  Volume2,
  ArrowUpLeft,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { User } from '../../types';
import { MOCK_VIDEOS } from '../../data/mockVideos';
import {
  evaluateLocalHeuristics,
  moderateContentWithAI,
  ModerationResult,
} from '../../services/aiModerationService';
import {
  logUserActivity,
  getSearchHistory,
  addSearchHistoryItem,
  deleteSearchHistoryItem,
  clearAllSearchHistory,
  SearchHistoryItem,
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
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
}

// Type declaration for browser Web Speech API
interface SpeechRecognitionEvent extends Event {
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
  theme,
  onToggleTheme,
  onToggleFilters,
  isFiltersOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Voice Search Modal & Microphone states
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatusText, setVoiceStatusText] = useState('Parlez maintenant...');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([20, 35, 50, 30, 60, 40, 25]);

  // AI Moderation Block Modal state
  const [blockedAlert, setBlockedAlert] = useState<ModerationResult | null>(null);

  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>(() =>
    getSearchHistory(currentUser?.id)
  );

  useEffect(() => {
    setRecentSearches(getSearchHistory(currentUser?.id));
  }, [currentUser?.id, isSearchFocused, isMobileSearchActive]);

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      // Instant 0ms AI lexical check while typing
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
    }, 220);

    return () => clearTimeout(handler);
  }, [searchQuery, onSearch, currentUser]);

  // Click outside listener for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup microphone & recognition on unmount
  const stopMicrophoneResources = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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

  // Process a finalized voice transcript with AI Safety Check
  const finalizeVoiceSearch = async (spokenText: string) => {
    const cleaned = spokenText.trim();
    if (!cleaned) return;

    stopMicrophoneResources();

    // Check spoken query against AI Moderation Shield
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

    setSearchQuery(cleaned);
    onSearch(cleaned);
    setRecentSearches(addSearchHistoryItem(currentUser?.id, cleaned));
    if (currentUser) {
      logUserActivity(currentUser.id, {
        action: 'voice_search',
        searchQuery: cleaned,
      });
    }
    setTimeout(() => {
      setIsVoiceModalOpen(false);
      setIsMobileSearchActive(false);
      setIsSearchFocused(false);
    }, 350);
  };

  // Start real microphone voice capture + audio visualizer + SpeechRecognition / Gemini fallback
  const startVoiceRecognition = async () => {
    stopMicrophoneResources();
    setIsVoiceModalOpen(true);
    setVoiceTranscript('');
    setVoiceError(null);
    setVoiceStatusText('Écoute en cours... Parlez dans votre micro');
    setIsListening(true);

    // 1. Start real microphone audio stream for waveform visualization + MediaRecorder backup
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateWaveform = () => {
            analyser.getByteFrequencyData(dataArray);
            const bars = Array.from({ length: 7 }, (_, i) => {
              const val = dataArray[i % bufferLength] || 15;
              return Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
            });
            setAudioLevels(bars);
            animFrameRef.current = requestAnimationFrame(updateWaveform);
          };
          updateWaveform();
        }
      }
    } catch {
      // Even if getUserMedia visualizer is blocked by iframe permissions, SpeechRecognition may still work
    }

    // 2. Start Web Speech API (SpeechRecognition / webkitSpeechRecognition)
    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      try {
        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = true;

        let latestTranscript = '';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let finalStr = '';

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalStr += res[0].transcript;
            } else {
              interim += res[0].transcript;
            }
          }

          latestTranscript = (finalStr || interim).trim();
          setVoiceTranscript(latestTranscript);

          if (finalStr.trim()) {
            setVoiceStatusText('Recherche vocale reconnue !');
            finalizeVoiceSearch(finalStr.trim());
          }
        };

        recognition.onerror = (event: { error: string }) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError(
              'L’accès au microphone a été refusé par le navigateur. Autorisez le micro dans la barre d’adresse ou cliquez sur une commande vocale ci-dessous.'
            );
          } else if (event.error === 'no-speech') {
            setVoiceStatusText('Aucun son détecté. Cliquez sur le micro pour réessayer.');
          } else {
            setVoiceStatusText('Micro en attente. Réessayez ou choisissez une suggestion vocale.');
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (latestTranscript.trim()) {
            finalizeVoiceSearch(latestTranscript);
          }
        };

        recognition.start();
        return;
      } catch {
        // Fallback to MediaRecorder + Gemini /api/ai/transcribe
      }
    }

    // 3. Fallback: Record 3.5 seconds via MediaRecorder and send to /api/ai/transcribe (Gemini 3.5 Transcribe)
    if (mediaStreamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(mediaStreamRef.current);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          setVoiceStatusText('Transcription IA en cours...');
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            try {
              const resp = await fetch('/api/ai/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio, mimeType: 'audio/webm' }),
              });
              if (resp.ok) {
                const data = await resp.json();
                if (data.transcript) {
                  setVoiceTranscript(data.transcript);
                  finalizeVoiceSearch(data.transcript);
                  return;
                }
              }
            } catch {}
            setVoiceError(
              'Reconnaissance vocale terminée. Vous pouvez aussi sélectionner une commande vocale rapide ci-dessous.'
            );
          };
          reader.readAsDataURL(audioBlob);
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 3800);
        return;
      } catch {}
    }

    setIsListening(false);
    setVoiceError(
      'Votre navigateur restreint le micro en aperçu intégré. Utilisez une commande vocale rapide ci-dessous ou autorisez le microphone.'
    );
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
          0B. REAL MICROPHONE VOICE SEARCH MODAL (DESKTOP & MOBILE)
         ========================================================================= */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#181818] border border-white/15 rounded-3xl p-6 shadow-2xl text-white relative">
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

            <div className="text-center space-y-4 pt-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Reconnaissance Vocale & Protection IA Actives</span>
              </div>

              <h3 className="text-lg font-bold text-white">
                {voiceTranscript ? `"${voiceTranscript}"` : voiceStatusText}
              </h3>

              {/* Animated Microphone Pulse & Waveform */}
              <div className="py-6 flex flex-col items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopMicrophoneResources();
                      setVoiceStatusText('Micro en pause. Cliquez pour parler.');
                    } else {
                      startVoiceRecognition();
                    }
                  }}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? 'bg-[#ff0000] text-white shadow-[0_0_35px_rgba(255,0,0,0.65)] scale-105'
                      : 'bg-[#2a2a2a] hover:bg-[#383838] text-gray-300'
                  }`}
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
                <div className="flex items-center justify-center gap-1.5 h-10">
                  {audioLevels.map((lvl, index) => (
                    <div
                      key={index}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isListening ? 'bg-[#ff0000]' : 'bg-white/20'
                      }`}
                      style={{
                        height: isListening ? `${Math.max(18, lvl)}%` : '20%',
                      }}
                    />
                  ))}
                </div>
              </div>

              {voiceError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                  {voiceError}
                </div>
              )}

              {/* Quick Voice Commands (For instant testing or when browser blocks mic in iframe) */}
              <div className="pt-3 border-t border-white/10 text-left">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#ff0000]" />
                  <span>Commandes vocales instantanées (cliquez pour tester) :</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Sintel 4K',
                    'Animation 3D',
                    'Exploration Océanique',
                    'React & Vite',
                    'Lo-Fi Chill Beats',
                    'Gaming Speedrun',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setVoiceTranscript(sample);
                        finalizeVoiceSearch(sample);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#ff0000] text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      🎤 « {sample} »
                    </button>
                  ))}
                </div>
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
                  placeholder="Rechercher sur MK..."
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
              onClick={startVoiceRecognition}
              className="w-10 h-10 rounded-full bg-[#222222] hover:bg-[#ff0000] flex items-center justify-center text-white transition-colors shrink-0 cursor-pointer"
              title="Recherche vocale par microphone"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e1e]">
            {recentSearches.length > 0 && (
              <div className="px-4 py-2.5 bg-[#161616] flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  Historique de recherche ({recentSearches.length})
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
                Aucune recherche récente enregistrée.
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

          {/* CENTER: DESKTOP SEARCH BAR + REAL WORKING MICROPHONE BUTTON */}
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
                  placeholder="Rechercher sur MK..."
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

              {/* REAL WORKING MICROPHONE BUTTON ON DESKTOP */}
              <button
                type="button"
                onClick={startVoiceRecognition}
                title="Recherche vocale par microphone"
                className="ml-2.5 h-10 w-10 rounded-full bg-[#222222] hover:bg-[#ff0000] text-white border border-[#333333] hover:border-[#ff0000] transition-all flex items-center justify-center shrink-0 cursor-pointer"
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
              onClick={startVoiceRecognition}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/5 hover:bg-[#ff0000] active:scale-95 transition-colors cursor-pointer"
              title="Recherche vocale"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* NOTIFICATION BELL ICON */}
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth('login');
                }
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff0000]" />
            </button>

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
                        <span>Panneau Admin (ROOT)</span>
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
                      <span>Votre chaîne / Profil</span>
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
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3 sm:px-4 h-8 sm:h-9 rounded-full bg-[#ff0000] hover:bg-[#e60000] text-white text-xs sm:text-sm font-bold tracking-tight shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Se connecter</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
