import React, { useState, useRef } from 'react';
import {
  X,
  Video as VideoIcon,
  Upload,
  Sparkles,
  CheckCircle2,
  Play,
  Film,
  Image as ImageIcon,
  FolderOpen,
  FileVideo,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Video, User } from '../../types';
import { CATEGORIES } from '../../data/mockVideos';
import {
  extractVideoMetadataAndThumbnail,
  saveVideoBlobToDB,
} from '../../services/videoMediaStorage';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoCreated: (newVideo: Video) => void;
  currentUser: User | null;
}

interface VideoPreset {
  label: string;
  url: string;
  thumbnail: string;
  category: string;
  duration: number;
  durationFormatted: string;
  resolution: '4K' | '1080p' | '720p';
}

const VIDEO_PRESETS: VideoPreset[] = [
  {
    label: 'Big Buck Bunny (Animation 3D 60 FPS)',
    url: 'https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280&q=80',
    category: 'Cinéma & 3D',
    duration: 60,
    durationFormatted: '01:00',
    resolution: '1080p',
  },
  {
    label: 'Sintel - Chef d\'œuvre VFX (4K)',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
    category: 'Cinéma & 3D',
    duration: 52,
    durationFormatted: '00:52',
    resolution: '4K',
  },
  {
    label: 'Exploration Océanique (Nature 4K)',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1280&q=80',
    category: 'Nature & 4K',
    duration: 47,
    durationFormatted: '00:47',
    resolution: '4K',
  },
  {
    label: 'Odyssée Cosmique Echo (Tech & Son)',
    url: 'https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/echo-hereweare.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
    category: 'Tech & IA',
    duration: 65,
    durationFormatted: '01:05',
    resolution: '4K',
  },
];

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({
  isOpen,
  onClose,
  onVideoCreated,
  currentUser,
}) => {
  // Mode: 'gallery' (default & recommended) or 'url'
  const [activeTab, setActiveTab] = useState<'gallery' | 'url'>('gallery');

  // File gallery states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string | null>(null);

  // Video Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cinéma & 3D');
  const [videoUrl, setVideoUrl] = useState(VIDEO_PRESETS[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState(VIDEO_PRESETS[0].thumbnail);
  const [durationSecs, setDurationSecs] = useState(60);
  const [durationFormatted, setDurationFormatted] = useState('01:00');
  const [resolution, setResolution] = useState<'4K' | '1080p' | '720p'>('1080p');
  const [tagsInput, setTagsInput] = useState('MK, Vidéo, Galerie');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const customThumbInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle video file selected from phone/PC gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo valide (MP4, MOV, WebM, etc.).');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Format file size
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileSizeFormatted(`${sizeMb} Mo`);

    // Clean filename for automatic title pre-fill
    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
    if (!title) {
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Create live preview object URL
    const objUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objUrl);

    // Automatically extract 16:9 thumbnail and duration via canvas & video element
    setIsExtractingMetadata(true);
    try {
      const meta = await extractVideoMetadataAndThumbnail(file);
      if (meta.thumbnailUrl) {
        setThumbnailUrl(meta.thumbnailUrl);
      }
      setDurationSecs(meta.duration);
      setDurationFormatted(meta.durationFormatted);
      setResolution(meta.resolution);
    } catch {
      // Fallback
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  // Handle custom thumbnail from user photo gallery
  const handleCustomThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image pour la miniature.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setThumbnailUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: VideoPreset) => {
    setVideoUrl(preset.url);
    setThumbnailUrl(preset.thumbnail);
    setCategory(preset.category);
    setDurationFormatted(preset.durationFormatted);
    setDurationSecs(preset.duration);
    setResolution(preset.resolution);
    if (!title) {
      setTitle(preset.label.split('(')[0].trim());
    }
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

    const videoId = `mk-vid-${Date.now()}`;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let finalVideoUrl = videoUrl;

    // If from gallery, store file permanently into browser IndexedDB
    if (activeTab === 'gallery' && selectedFile) {
      try {
        await saveVideoBlobToDB(videoId, selectedFile, selectedFile.type);
        finalVideoUrl = filePreviewUrl || URL.createObjectURL(selectedFile);
      } catch (err) {
        console.warn('Could not save to IndexedDB, using local preview url:', err);
        finalVideoUrl = filePreviewUrl || '';
      }
    }

    const newVideo: Video = {
      id: videoId,
      title: title.trim(),
      description: description.trim() || 'Vidéo partagée directement depuis la galerie utilisateur.',
      videoUrl: finalVideoUrl,
      thumbnailUrl:
        thumbnailUrl.trim() ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
      channelTitle: currentUser?.channelName || currentUser?.username || 'Mon Espace MK',
      channelAvatar:
        currentUser?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      channelId: currentUser ? `ch-${currentUser.id}` : 'ch-creator-mk',
      subscribers: '1 k',
      verified: true,
      views: 1,
      uploadDate: "À l'instant",
      duration: durationSecs,
      durationFormatted: durationFormatted || '01:00',
      category: category,
      tags: tags.length > 0 ? tags : ['MK', category],
      likesCount: 1,
      dislikesCount: 0,
      commentsCount: 0,
      resolution: resolution,
      isFromGallery: activeTab === 'gallery',
      fallbackUrls: [
        'https://vjs.zencdn.net/v/oceans.mp4',
        'https://media.w3.org/2010/05/sintel/trailer.mp4',
      ],
    };

    onVideoCreated(newVideo);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#161616] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff0000] to-[#b30000] flex items-center justify-center shadow-lg">
              <VideoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Partager une Vidéo</span>
                <span className="text-[10px] bg-[#ff0000] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Galerie & Studio
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Sélectionnez une vidéo de votre appareil ou collez un lien.
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
            <span>Lien Web & Échantillons</span>
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

              {!selectedFile ? (
                /* DRAG AND DROP / SELECT BUTTON ZONE */
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
                      Compatible avec tous les formats : MP4, MOV, WebM, vidéos de smartphone, etc.
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
                /* SELECTED FILE PREVIEW CARD */
                <div className="bg-[#1f1f1f] rounded-2xl p-4 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ff0000]/20 text-[#ff0000] flex items-center justify-center">
                        <FileVideo className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                          {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2">
                          <span>{fileSizeFormatted}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Vidéo prête
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => videoFileInputRef.current?.click()}
                      className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      Changer
                    </button>
                  </div>

                  {/* MINI VIDEO PLAYER PREVIEW */}
                  {filePreviewUrl && (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                      <video
                        src={filePreviewUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {isExtractingMetadata && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Génération automatique de la miniature et calcul de la durée...</span>
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
                  Exemples vérifiés en 1 clic :
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
                        <div className="text-[10px] text-gray-400">{preset.resolution} • {preset.durationFormatted}</div>
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

          {/* TITLE INPUT */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-1 block">
              Titre de la vidéo <span className="text-[#ff0000]">*</span> :
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mon premier court métrage, Vacances d'été..."
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
                Qualité / Résolution :
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as '4K' | '1080p' | '720p')}
                className="w-full bg-[#111111] border border-white/15 focus:border-[#ff0000] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="4K" className="bg-[#1c1c1c] text-white">4K Ultra HD</option>
                <option value="1080p" className="bg-[#1c1c1c] text-white">1080p Full HD</option>
                <option value="720p" className="bg-[#1c1c1c] text-white">720p HD</option>
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
                <span>Changer l'image depuis la galerie photo</span>
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
                className="w-24 h-14 object-cover rounded-lg border border-white/10 shrink-0"
              />
              <div className="text-[11px] text-gray-400">
                <span className="font-semibold text-gray-200">Générée automatiquement</span> à partir de votre vidéo. Vous pouvez également importer une photo personnalisée depuis votre galerie.
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
                  <span>Publication en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publier la Vidéo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
