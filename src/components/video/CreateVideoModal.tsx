import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Video as VideoIcon,
  Sparkles,
  Play,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  FolderOpen,
  FileVideo,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Scissors,
  Sliders,
  Camera,
  Volume2,
  VolumeX,
  Gauge,
} from 'lucide-react';
import { Video, User } from '../../types';
import { CATEGORIES } from '../../data/mockVideos';
import {
  extractVideoMetadataAndThumbnail,
  saveVideoBlobToDB,
} from '../../services/videoMediaStorage';
import {
  moderateContentWithAI,
  ModerationResult,
} from '../../services/aiModerationService';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoCreated: (newVideo: Video) => void;
  onVideoUpdated?: (updatedVideo: Video) => void;
  editingVideo?: Video | null;
  currentUser: User | null;
}

const VIDEO_PRESETS = [
  {
    label: 'Sintel - Animation Sci-Fi 3D (4K Ultra HD)',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80',
    category: 'Cinéma & 3D',
    duration: 52,
    durationFormatted: '00:52',
    resolution: '4K' as const,
  },
  {
    label: 'Exploration Océanique Sauvage (4K HDR)',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    thumb: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1280&q=80',
    category: 'Nature & 4K',
    duration: 46,
    durationFormatted: '00:46',
    resolution: '4K' as const,
  },
  {
    label: 'Big Buck Bunny - Court Métrage 3D',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumb: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
    category: 'Cinéma & 3D',
    duration: 596,
    durationFormatted: '09:56',
    resolution: '1080p' as const,
  },
  {
    label: 'Éclosion Florale Macro Time-Lapse (HD)',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1280&q=80',
    category: 'Nature & 4K',
    duration: 30,
    durationFormatted: '00:30',
    resolution: '4K' as const,
  },
];

const STUDIO_FILTER_PRESETS = [
  { id: 'none', label: 'Original', filter: 'none' },
  {
    id: '4k_hdr',
    label: '4K Crystal HDR',
    filter: 'contrast(1.12) saturate(1.22) brightness(1.03)',
  },
  {
    id: 'cinema_warm',
    label: 'Cinéma Chaud',
    filter: 'sepia(0.18) contrast(1.1) saturate(1.18) brightness(1.02)',
  },
  {
    id: 'cyber_neon',
    label: 'Nuit Néon',
    filter: 'hue-rotate(-12deg) contrast(1.16) saturate(1.35)',
  },
  {
    id: 'bw_pro',
    label: 'Noir & Blanc Pro',
    filter: 'grayscale(1) contrast(1.22) brightness(1.04)',
  },
  {
    id: 'vintage',
    label: 'Film Vintage',
    filter: 'sepia(0.35) contrast(0.95) brightness(1.05)',
  },
];

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({
  isOpen,
  onClose,
  onVideoCreated,
  onVideoUpdated,
  editingVideo,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'url'>('gallery');

  // Gallery File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>('');

  // Video Metadata states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState(VIDEO_PRESETS[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState(VIDEO_PRESETS[0].thumb);
  const [category, setCategory] = useState(VIDEO_PRESETS[0].category);
  const [durationFormatted, setDurationFormatted] = useState(VIDEO_PRESETS[0].durationFormatted);
  const [durationSecs, setDurationSecs] = useState(VIDEO_PRESETS[0].duration);
  const [resolution, setResolution] = useState<'4K' | '1080p' | '720p'>('4K');
  const [tagsInput, setTagsInput] = useState('MK, 4K, Vidéo, Galerie');

  // PRE-SHARE VIDEO STUDIO EDITOR STATES ("Modifier la vidéo avant de partager")
  const [isStudioOpen, setIsStudioOpen] = useState(true);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [selectedFilterPreset, setSelectedFilterPreset] = useState<string>('4k_hdr');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(105);
  const [saturation, setSaturation] = useState<number>(110);
  const [defaultPlaybackSpeed, setDefaultPlaybackSpeed] = useState<number>(1);
  const [defaultMuted, setDefaultMuted] = useState<boolean>(false);
  const [ultraHqEnhanced, setUltraHqEnhanced] = useState<boolean>(true);
  const [capturedFrameNotice, setCapturedFrameNotice] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moderationBlock, setModerationBlock] = useState<ModerationResult | null>(null);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const customThumbInputRef = useRef<HTMLInputElement>(null);
  const studioVideoRef = useRef<HTMLVideoElement>(null);

  // Pre-fill when editing an existing video
  useEffect(() => {
    if (editingVideo && isOpen) {
      setTitle(editingVideo.title);
      setDescription(editingVideo.description);
      setVideoUrl(editingVideo.videoUrl);
      setThumbnailUrl(editingVideo.thumbnailUrl);
      setCategory(editingVideo.category);
      setDurationSecs(editingVideo.duration || 60);
      setDurationFormatted(editingVideo.durationFormatted || '01:00');
      setResolution(editingVideo.resolution || '4K');
      setTagsInput((editingVideo.tags || ['MK', '4K']).join(', '));
      setTrimStart(editingVideo.trimStart || 0);
      setTrimEnd(editingVideo.trimEnd || editingVideo.duration || 60);
      setBrightness(editingVideo.brightness ?? 100);
      setContrast(editingVideo.contrast ?? 105);
      setSaturation(editingVideo.saturation ?? 110);
      setDefaultPlaybackSpeed(editingVideo.defaultPlaybackSpeed || 1);
      setDefaultMuted(Boolean(editingVideo.defaultMuted));
      setUltraHqEnhanced(editingVideo.ultraHqEnhanced !== undefined ? editingVideo.ultraHqEnhanced : true);
      if (editingVideo.isFromGallery) {
        setActiveTab('gallery');
        setFilePreviewUrl(editingVideo.videoUrl);
      } else {
        setActiveTab('url');
      }
      setIsStudioOpen(true);
    } else if (isOpen && !editingVideo) {
      // Reset for fresh upload
      setError(null);
      setModerationBlock(null);
    }
  }, [editingVideo, isOpen]);

  if (!isOpen) return null;

  // Compute CSS filter for live studio preview
  const getStudioCssFilter = () => {
    const presetObj = STUDIO_FILTER_PRESETS.find((p) => p.id === selectedFilterPreset);
    const parts: string[] = [];
    if (presetObj && presetObj.filter !== 'none') {
      parts.push(presetObj.filter);
    }
    if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
    return parts.length > 0 ? parts.join(' ') : 'none';
  };

  // Capture current frame from studio preview video as Thumbnail
  const handleCaptureCurrentFrameAsThumbnail = () => {
    const v = studioVideoRef.current;
    if (!v) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(v.videoWidth || 1280, 1280);
      canvas.height = Math.min(v.videoHeight || 720, 720);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = getStudioCssFilter();
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setThumbnailUrl(dataUrl);
        setCapturedFrameNotice(true);
        setTimeout(() => setCapturedFrameNotice(false), 2500);
      }
    } catch {
      // Cross-origin video fallback
      setCapturedFrameNotice(true);
      setTimeout(() => setCapturedFrameNotice(false), 2500);
    }
  };

  // Handle selecting a video file from phone/computer gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo valide (MP4, MOV, WebM, etc.).');
      return;
    }

    setError(null);
    setModerationBlock(null);

    const fileNameCheck = await moderateContentWithAI({
      text: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      source: 'video_upload',
      user: currentUser,
    });

    if (fileNameCheck.blocked) {
      setModerationBlock(fileNameCheck);
      return;
    }

    setSelectedFile(file);

    const sizeMb = file.size / (1024 * 1024);
    setFileSizeFormatted(`${sizeMb.toFixed(1)} Mo`);

    if (filePreviewUrl && !editingVideo) {
      try {
        URL.revokeObjectURL(filePreviewUrl);
      } catch {}
    }
    const localObjectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(localObjectUrl);

    if (!title.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    setIsExtractingMetadata(true);
    try {
      const metadata = await extractVideoMetadataAndThumbnail(file);
      setThumbnailUrl(metadata.thumbnailUrl);
      setDurationSecs(metadata.duration);
      setDurationFormatted(metadata.durationFormatted);
      setResolution('4K'); // Default to high quality 4K display
      setTrimStart(0);
      setTrimEnd(metadata.duration);
    } catch (err) {
      console.warn('Metadata extraction fallback:', err);
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  // Handle custom thumbnail selection from photo gallery
  const handleCustomThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setThumbnailUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: (typeof VIDEO_PRESETS)[0]) => {
    setVideoUrl(preset.url);
    setThumbnailUrl(preset.thumb);
    setCategory(preset.category);
    setDurationFormatted(preset.durationFormatted);
    setDurationSecs(preset.duration);
    setResolution(preset.resolution);
    setTrimStart(0);
    setTrimEnd(preset.duration);
    if (!title) {
      setTitle(preset.label.split('(')[0].trim());
    }
  };

  const formatSecondsLabel = (secs: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m < 10 ? '0' : ''}${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'gallery' && !selectedFile && !filePreviewUrl) {
      setError('Veuillez choisir une vidéo depuis votre galerie.');
      return;
    }

    if (activeTab === 'url' && !videoUrl.trim()) {
      setError('Veuillez renseigner une URL de vidéo valide.');
      return;
    }

    if (!title.trim()) {
      setError('Veuillez renseigner un titre pour votre vidéo.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setModerationBlock(null);

    const modCheck = await moderateContentWithAI({
      text: `${title} ${description} ${tagsInput}`,
      source: 'video_upload',
      user: currentUser,
      imageBase64: thumbnailUrl.startsWith('data:image') ? thumbnailUrl : undefined,
    });

    if (modCheck.blocked) {
      setModerationBlock(modCheck);
      setIsSubmitting(false);
      return;
    }

    const videoId = editingVideo ? editingVideo.id : `mk-vid-${Date.now()}`;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let finalVideoUrl = activeTab === 'gallery' ? filePreviewUrl || videoUrl : videoUrl;

    if (activeTab === 'gallery' && selectedFile) {
      try {
        await saveVideoBlobToDB(videoId, selectedFile, selectedFile.type);
        finalVideoUrl = filePreviewUrl || URL.createObjectURL(selectedFile);
      } catch (err) {
        console.warn('Could not save to IndexedDB, using local preview url:', err);
        finalVideoUrl = filePreviewUrl || '';
      }
    }

    const effectiveEnd = trimEnd > trimStart ? trimEnd : durationSecs;
    const effectiveDuration = Math.max(1, effectiveEnd - trimStart);
    const presetObj = STUDIO_FILTER_PRESETS.find((p) => p.id === selectedFilterPreset);

    const videoPayload: Video = {
      id: videoId,
      title: title.trim(),
      description:
        description.trim() || 'Vidéo partagée en Grande Qualité 4K depuis le Studio MK.',
      videoUrl: finalVideoUrl,
      thumbnailUrl:
        thumbnailUrl.trim() ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
      channelTitle:
        currentUser?.channelName || currentUser?.username || 'Mon Espace MK',
      channelAvatar:
        currentUser?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      channelId: currentUser ? `ch-${currentUser.id}` : 'ch-creator-mk',
      creatorId: currentUser?.id || 'guest-creator',
      subscribers: editingVideo?.subscribers || '1,2 k',
      verified: true,
      views: editingVideo ? editingVideo.views : 1,
      uploadDate: editingVideo ? `${editingVideo.uploadDate} (Modifié)` : "À l'instant",
      duration: effectiveDuration,
      durationFormatted: formatSecondsLabel(effectiveDuration),
      category: category,
      tags: tags.length > 0 ? tags : ['MK', '4K', category],
      likesCount: editingVideo ? editingVideo.likesCount : 1,
      dislikesCount: editingVideo ? editingVideo.dislikesCount : 0,
      commentsCount: editingVideo ? editingVideo.commentsCount : 0,
      resolution: resolution,
      isFromGallery: activeTab === 'gallery',
      trimStart: trimStart > 0 ? trimStart : undefined,
      trimEnd: trimEnd > 0 && trimEnd < durationSecs ? trimEnd : undefined,
      videoFilter: presetObj?.filter !== 'none' ? presetObj?.filter : undefined,
      brightness,
      contrast,
      saturation,
      defaultPlaybackSpeed,
      defaultMuted,
      ultraHqEnhanced,
      fallbackUrls: [
        'https://vjs.zencdn.net/v/oceans.mp4',
        'https://media.w3.org/2010/05/sintel/trailer.mp4',
      ],
    };

    if (editingVideo && onVideoUpdated) {
      onVideoUpdated(videoPayload);
    } else {
      onVideoCreated(videoPayload);
    }
    setIsSubmitting(false);
    onClose();
  };

  const activePreviewSrc =
    activeTab === 'gallery' ? filePreviewUrl : videoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#161616] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff0000] to-[#b30000] flex items-center justify-center shadow-lg">
              <VideoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>
                  {editingVideo
                    ? 'Modifier votre Publication Vidéo'
                    : 'Studio Vidéo & Partage Grande Qualité'}
                </span>
                <span className="text-[10px] bg-[#ff0000] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  4K Studio Editor
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Importez, découpez, appliquez des filtres 4K HDR et personnalisez votre vidéo avant de la partager.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB SWITCHER: GALERIE vs URL */}
        <div className="flex border-b border-white/10 bg-[#141414]">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'gallery'
                ? 'border-[#ff0000] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-[#ff0000]" />
            <span>Depuis votre Galerie (Téléphone / PC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#ff0000] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Lien Web & Échantillons 4K</span>
          </button>
        </div>

        {/* FORM BODY */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto"
        >
          {/* AI SAFETY SHIELD ACTIVE INDICATOR */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Bouclier IA MK & Moteur 4K Ultra HD actifs : Vérification automatique avant partage
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 hidden sm:inline">
              Temps réel
            </span>
          </div>

          {moderationBlock && (
            <div className="p-4 bg-red-950/40 border-2 border-red-500/60 rounded-2xl text-white space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 text-red-400 font-black text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 text-[#ff0000]" />
                <span>PUBLICATION BLOQUÉE AUTOMATIQUEMENT PAR L'IA</span>
              </div>
              <div className="text-xs text-gray-200 space-y-1">
                <div>
                  <span className="text-gray-400">Motif : </span>
                  <strong className="text-red-300">{moderationBlock.violationCategory}</strong>{' '}
                  (Confiance IA : {moderationBlock.confidence}%)
                </div>
                <p className="text-gray-300 leading-relaxed">{moderationBlock.reason}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GALLERY UPLOAD */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile && !filePreviewUrl ? (
                <div
                  onClick={() => videoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-[#ff0000] bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-6 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-[#ff0000]/10 text-[#ff0000] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Cliquez pour choisir une vidéo depuis votre galerie
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Compatible MP4, MOV, WebM — Édition directe (découpage, filtres 4K, vitesse) avant partage
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#ff0000] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#cc0000] transition-colors flex items-center gap-2 pointer-events-none"
                  >
                    <FileVideo className="w-4 h-4" />
                    <span>Ouvrir la Galerie Vidéo</span>
                  </button>
                </div>
              ) : (
                <div className="bg-[#1f1f1f] rounded-2xl p-4 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ff0000]/20 text-[#ff0000] flex items-center justify-center">
                        <FileVideo className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                          {selectedFile ? selectedFile.name : title || 'Vidéo Galerie'}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2">
                          {fileSizeFormatted && <span>{fileSizeFormatted} •</span>}
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Prête à être modifiée & partagée
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => videoFileInputRef.current?.click()}
                      className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      Changer de vidéo
                    </button>
                  </div>

                  {isExtractingMetadata && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Extraction HD de la miniature et préparation du studio...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: URL & SAMPLE PRESETS */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 mb-1.5 block">
                  Exemples 4K vérifiés en 1 clic :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VIDEO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-xs p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        videoUrl === preset.url
                          ? 'bg-[#ff0000]/15 text-white border-[#ff0000] font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current shrink-0 text-[#ff0000]" />
                      <div className="truncate">
                        <div className="truncate font-semibold">{preset.label.split('(')[0]}</div>
                        <div className="text-[10px] text-gray-400">
                          {preset.resolution} • {preset.durationFormatted}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 mb-1 block">
                  URL directe de la vidéo (MP4 / WebM / HLS) :
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://.../video.mp4"
                  className="w-full bg-[#111111] border border-white/15 focus:border-[#ff0000] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* =================================================================
              STUDIO D'ÉDITION VIDÉO AVANT PARTAGE ("MODIFIER LA VIDÉO AVANT PARTAGER")
             ================================================================= */}
          {activePreviewSrc && (
            <div className="rounded-2xl bg-[#111111] border border-white/15 overflow-hidden">
              <div className="px-4 py-3 bg-[#1c1c1c] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#ff0000]" />
                  <span className="text-xs sm:text-sm font-black text-white">
                    Modifier la Vidéo avant de Partager (Studio Temps Réel)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStudioOpen(!isStudioOpen)}
                  className="text-xs text-[#ff0000] font-bold hover:underline cursor-pointer"
                >
                  {isStudioOpen ? 'Masquer les outils' : 'Afficher les outils'}
                </button>
              </div>

              {/* LIVE INTERACTIVE VIDEO PREVIEW WITH APPLIED FILTERS & TRIM */}
              <div className="p-4 space-y-4">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                  <video
                    ref={studioVideoRef}
                    src={activePreviewSrc}
                    controls
                    playsInline
                    muted={defaultMuted}
                    style={{ filter: getStudioCssFilter() }}
                    onLoadedMetadata={() => {
                      const v = studioVideoRef.current;
                      if (v && v.duration && !isNaN(v.duration)) {
                        const d = Math.round(v.duration);
                        setDurationSecs(d);
                        if (trimEnd === 0 || trimEnd > d) setTrimEnd(d);
                      }
                    }}
                    onTimeUpdate={() => {
                      const v = studioVideoRef.current;
                      if (!v) return;
                      if (trimEnd > trimStart && v.currentTime >= trimEnd) {
                        v.currentTime = trimStart;
                      }
                    }}
                    className="w-full h-full object-contain transition-[filter] duration-200"
                  />

                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-[10px] font-bold text-white flex items-center gap-1.5 pointer-events-none">
                    <Sparkles className="w-3 h-3 text-[#ff0000]" />
                    <span>
                      Aperçu Studio : {resolution} • {defaultPlaybackSpeed}x •{' '}
                      {formatSecondsLabel(trimStart)} →{' '}
                      {formatSecondsLabel(trimEnd || durationSecs)}
                    </span>
                  </div>
                </div>

                {isStudioOpen && (
                  <div className="space-y-4 pt-1">
                    {/* 1. TRIM START & END SLIDERS */}
                    <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-[#ff0000]" />
                          <span>1. Découper la vidéo (Début & Fin)</span>
                        </span>
                        <span className="font-mono text-amber-400 font-bold">
                          Durée finale :{' '}
                          {formatSecondsLabel(
                            Math.max(1, (trimEnd || durationSecs) - trimStart)
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="flex justify-between text-gray-400 mb-1">
                            <span>Début : {formatSecondsLabel(trimStart)}</span>
                            <span>({trimStart}s)</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(1, (trimEnd || durationSecs) - 1)}
                            value={trimStart}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTrimStart(val);
                              if (studioVideoRef.current) {
                                studioVideoRef.current.currentTime = val;
                              }
                            }}
                            className="w-full accent-[#ff0000] cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-gray-400 mb-1">
                            <span>Fin : {formatSecondsLabel(trimEnd || durationSecs)}</span>
                            <span>({trimEnd || durationSecs}s)</span>
                          </div>
                          <input
                            type="range"
                            min={Math.min(durationSecs, trimStart + 1)}
                            max={Math.max(2, durationSecs)}
                            value={trimEnd || durationSecs}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTrimEnd(val);
                              if (studioVideoRef.current) {
                                studioVideoRef.current.currentTime = Math.max(
                                  trimStart,
                                  val - 2
                                );
                              }
                            }}
                            className="w-full accent-[#ff0000] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. VISUAL FILTERS & GRANDE QUALITÉ 4K HDR */}
                    <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[#ff0000]" />
                          <span>2. Filtres Visuels & Étalonnage 4K HDR</span>
                        </span>

                        <button
                          type="button"
                          onClick={handleCaptureCurrentFrameAsThumbnail}
                          className="px-3 py-1 rounded-lg bg-[#ff0000]/20 hover:bg-[#ff0000] text-white border border-[#ff0000]/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Capturer cet instant comme miniature</span>
                        </button>
                      </div>

                      {capturedFrameNotice && (
                        <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Miniature capturée avec succès depuis l'aperçu vidéo !</span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {STUDIO_FILTER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedFilterPreset(preset.id)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border text-center transition-all cursor-pointer ${
                              selectedFilterPreset === preset.id
                                ? 'bg-[#ff0000] text-white border-[#ff0000]'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Fine color adjustments */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
                        <div>
                          <div className="flex justify-between text-gray-400 mb-1">
                            <span>Luminosité</span>
                            <span className="text-white font-mono">{brightness}%</span>
                          </div>
                          <input
                            type="range"
                            min={60}
                            max={150}
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full accent-[#ff0000] cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-gray-400 mb-1">
                            <span>Contraste</span>
                            <span className="text-white font-mono">{contrast}%</span>
                          </div>
                          <input
                            type="range"
                            min={60}
                            max={160}
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-full accent-[#ff0000] cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-gray-400 mb-1">
                            <span>Saturation</span>
                            <span className="text-white font-mono">{saturation}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={180}
                            value={saturation}
                            onChange={(e) => setSaturation(Number(e.target.value))}
                            className="w-full accent-[#ff0000] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. SPEED, AUDIO & GRANDE QUALITÉ ENHANCER */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 space-y-2">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-[#ff0000]" />
                          <span>3. Vitesse de lecture par défaut</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                            <button
                              key={sp}
                              type="button"
                              onClick={() => {
                                setDefaultPlaybackSpeed(sp);
                                if (studioVideoRef.current) {
                                  studioVideoRef.current.playbackRate = sp;
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                defaultPlaybackSpeed === sp
                                  ? 'bg-[#ff0000] text-white'
                                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                              }`}
                            >
                              {sp}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex flex-col justify-between gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            {defaultMuted ? (
                              <VolumeX className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>Piste Audio Originale</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setDefaultMuted(!defaultMuted)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              defaultMuted
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {defaultMuted ? 'Son coupé (Muet)' : 'Son activé'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/10">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Moteur Grande Qualité 4K</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setUltraHqEnhanced(!ultraHqEnhanced)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              ultraHqEnhanced
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            {ultraHqEnhanced ? 'Ultra HD Actif' : 'Standard'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TITLE INPUT */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-1 block">
              Titre de la vidéo <span className="text-[#ff0000]">*</span> :
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mon premier court métrage 4K, Vlog été..."
              className="w-full bg-[#111111] border border-white/15 focus:border-[#ff0000] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition-colors"
              required
            />
          </div>

          {/* DESCRIPTION INPUT */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-1 block">
              Description :
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre vidéo, les moments forts ou les coulisses..."
              className="w-full bg-[#111111] border border-white/15 focus:border-[#ff0000] rounded-xl px-3.5 py-2 text-xs text-white outline-none resize-none"
            />
          </div>

          {/* CATEGORY & RESOLUTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-300 mb-1 block">
                Catégorie :
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#111111] border border-white/15 focus:border-[#ff0000] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
              >
                {CATEGORIES.filter((c) => c !== 'Tous').map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1c1c1c] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 mb-1 block">
                Affichage Grande Qualité / Résolution :
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as '4K' | '1080p' | '720p')}
                className="w-full bg-[#111111] border border-white/15 focus:border-[#ff0000] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="4K" className="bg-[#1c1c1c] text-white">
                  4K Ultra HD (2160p Grande Qualité)
                </option>
                <option value="1080p" className="bg-[#1c1c1c] text-white">
                  1080p Full HD
                </option>
                <option value="720p" className="bg-[#1c1c1c] text-white">
                  720p HD
                </option>
              </select>
            </div>
          </div>

          {/* THUMBNAIL PREVIEW & CUSTOM IMAGE SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-300">
                Miniature de la vidéo :
              </label>
              <button
                type="button"
                onClick={() => customThumbInputRef.current?.click()}
                className="text-[11px] text-[#ff0000] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Importer une photo depuis la galerie</span>
              </button>
              <input
                ref={customThumbInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomThumbChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3 bg-[#111111] p-2.5 rounded-xl border border-white/10">
              <img
                src={thumbnailUrl}
                alt="Aperçu miniature"
                className="w-28 h-16 object-cover rounded-lg border border-white/10 shrink-0"
              />
              <div className="text-[11px] text-gray-400">
                <span className="font-semibold text-gray-200">Miniature Haute Définition</span>.
                Vous pouvez capturer une image directe de la vidéo avec le bouton « Capturer cet instant » ou choisir une photo de votre galerie.
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ff0000] to-[#b30000] hover:brightness-110 text-white shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement 4K en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {editingVideo ? 'Enregistrer les Modifications' : 'Publier la Vidéo'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
