import React, { useState } from 'react';
import {
  X,
  Video as VideoIcon,
  Upload,
  Sparkles,
  CheckCircle2,
  Play,
  Film,
  Image as ImageIcon,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import { Video, User } from '../../types';
import { CATEGORIES } from '../../data/mockVideos';

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

// High-speed, robust MP4 stream samples for quick one-click selection
const VIDEO_PRESETS: VideoPreset[] = [
  {
    label: 'Big Buck Bunny (Animation 3D 60 FPS)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280&q=80',
    category: 'Cinéma & 3D',
    duration: 596,
    durationFormatted: '09:56',
    resolution: '1080p',
  },
  {
    label: 'Tears of Steel (Sci-Fi VFX 4K)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
    category: 'Cinéma & 3D',
    duration: 734,
    durationFormatted: '12:14',
    resolution: '4K',
  },
  {
    label: 'For Bigger Blazes (Tech & Hardware 4K)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80',
    category: 'Tech & IA',
    duration: 360,
    durationFormatted: '06:00',
    resolution: '4K',
  },
  {
    label: 'Grand Canyon Nature & Wild Animals (4K HDR)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&q=80',
    category: 'Nature & 4K',
    duration: 480,
    durationFormatted: '08:00',
    resolution: '4K',
  },
  {
    label: 'Tokyo Cyberpunk Night Lights (4K)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&q=80',
    category: 'Musique',
    duration: 540,
    durationFormatted: '09:00',
    resolution: '4K',
  },
];

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({
  isOpen,
  onClose,
  onVideoCreated,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cinéma & 3D');
  const [videoUrl, setVideoUrl] = useState(VIDEO_PRESETS[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState(VIDEO_PRESETS[0].thumbnail);
  const [durationFormatted, setDurationFormatted] = useState('08:30');
  const [resolution, setResolution] = useState<'4K' | '1080p' | '720p'>('4K');
  const [tagsInput, setTagsInput] = useState('MK, Vidéo, Studio');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof VIDEO_PRESETS[0]) => {
    setVideoUrl(preset.url);
    setThumbnailUrl(preset.thumbnail);
    setCategory(preset.category);
    setDurationFormatted(preset.durationFormatted);
    setResolution(preset.resolution);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Veuillez renseigner un titre pour votre vidéo.');
      return;
    }
    if (!videoUrl.trim()) {
      setError('Veuillez renseigner une URL de vidéo valide.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Calculate duration in seconds approximately
    const parts = durationFormatted.split(':').map((p) => parseInt(p, 10));
    let totalSecs = 300;
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      totalSecs = parts[0] * 60 + parts[1];
    }

    const newVideo: Video = {
      id: `mk-custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Vidéo publiée par un créateur MK.',
      videoUrl: videoUrl.trim(),
      thumbnailUrl:
        thumbnailUrl.trim() ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
      channelTitle: currentUser?.channelName || currentUser?.username || 'Ma Chaîne MK',
      channelAvatar:
        currentUser?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      channelId: currentUser ? `ch-${currentUser.id}` : 'ch-creator-mk',
      subscribers: '1 k',
      verified: true,
      views: 1,
      uploadDate: "À l'instant",
      duration: totalSecs,
      durationFormatted: durationFormatted || '05:00',
      category: category,
      tags: tags.length > 0 ? tags : ['MK', category],
      likesCount: 1,
      dislikesCount: 0,
      commentsCount: 0,
      resolution: resolution,
    };

    setTimeout(() => {
      onVideoCreated(newVideo);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#161616] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff0000] to-[#b30000] flex items-center justify-center shadow-md">
              <VideoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Créer et Publier une Vidéo</span>
                <span className="text-[10px] bg-[#ff0000] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  MK Studio
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Mettez en ligne du contenu visible immédiatement dans le catalogue MK.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Quick Presets Selection */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ff0000]" />
              <span>Préréglages rapides vidéo (1 clic pour tester) :</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {VIDEO_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    videoUrl === preset.url
                      ? 'bg-[#ff0000] text-white border-[#ff0000] font-bold shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{preset.label.split('(')[0].trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Titre de la vidéo *</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mon premier court-métrage / Démo Web 2026..."
              className="w-full px-4 py-2.5 bg-[#222222] border border-white/15 focus:border-[#ff0000] rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>

          {/* Category & Resolution Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                <span>Catégorie</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#222222] border border-white/15 focus:border-[#ff0000] rounded-xl text-sm text-white outline-none"
              >
                {CATEGORIES.filter((c) => c !== 'Tous').map((cat) => (
                  <option key={cat} value={cat} className="bg-[#222222] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Durée affichée & Résolution</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={durationFormatted}
                  onChange={(e) => setDurationFormatted(e.target.value)}
                  placeholder="10:30"
                  className="w-1/2 px-3 py-2.5 bg-[#222222] border border-white/15 rounded-xl text-sm text-white outline-none"
                />
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as '4K' | '1080p' | '720p')}
                  className="w-1/2 px-3 py-2.5 bg-[#222222] border border-white/15 rounded-xl text-sm text-white outline-none"
                >
                  <option value="4K">4K Ultra HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Video Stream URL & Thumbnail URL */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-gray-400" />
                <span>URL directe du fichier vidéo (.mp4) *</span>
              </label>
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://.../video.mp4"
                className="w-full px-4 py-2 bg-[#222222] border border-white/15 focus:border-[#ff0000] rounded-xl text-xs text-white placeholder-gray-500 font-mono outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>URL de la miniature (Image)</span>
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-2 bg-[#222222] border border-white/15 focus:border-[#ff0000] rounded-xl text-xs text-white placeholder-gray-500 font-mono outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-gray-300 mb-1.5 block">
              Description de la vidéo
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement le sujet de votre vidéo..."
              className="w-full px-4 py-2 bg-[#222222] border border-white/15 focus:border-[#ff0000] rounded-xl text-xs text-white placeholder-gray-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#ff0000] to-[#c40000] hover:from-[#ff1a1a] hover:to-[#db0000] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,0,0.4)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? 'Publication en cours...' : 'Publier sur MK Stream'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
