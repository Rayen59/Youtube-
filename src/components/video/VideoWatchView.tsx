import React, { useState, useEffect } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Download,
  Check,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Bell,
  CornerDownRight,
  Send,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Video, Comment, User, UserFavorites } from '../../types';
import { VideoPlayer } from './VideoPlayer';
import { VideoCard } from './VideoCard';
import { MOCK_COMMENTS } from '../../data/mockVideos';
import { getPersonalizedRecommendations } from '../../services/recommendationEngine';
import {
  getUserFile,
  saveUserFile,
  logUserActivity,
} from '../../storage/userNamespace';

interface VideoWatchViewProps {
  video: Video;
  currentUser: User | null;
  onSelectVideo: (video: Video) => void;
  onRequireAuth: (restrictionMessage: string) => void;
}

export const VideoWatchView: React.FC<VideoWatchViewProps> = ({
  video,
  currentUser,
  onSelectVideo,
  onRequireAuth,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Recommendations for side panel
  const recommendations = getPersonalizedRecommendations(
    currentUser ? currentUser.id : null,
    video.id
  );

  // Initialize comments & user states (liked, saved, downloaded)
  useEffect(() => {
    const list = MOCK_COMMENTS[video.id] || [
      {
        id: `c-default-${video.id}`,
        videoId: video.id,
        userId: 'u-comm',
        userName: 'Spectateur Passionné',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
        text: 'Vidéo exceptionnelle ! La clarté des explications et le montage sont remarquables.',
        timestamp: 'Il y a 1 jour',
        likes: 42,
        replies: []
      }
    ];
    setComments(list);

    // If user is connected, check their favorites file
    if (currentUser) {
      const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json');
      if (favorites) {
        setIsLiked(favorites.likedVideoIds.includes(video.id));
        setIsDisliked(favorites.dislikedVideoIds.includes(video.id));
        setIsSaved(favorites.savedVideoIds.includes(video.id));
        setIsDownloaded(favorites.downloadedVideos.some(d => d.videoId === video.id));
      }

      // Log watch activity
      logUserActivity(currentUser.id, {
        action: 'watch',
        videoId: video.id,
        videoTitle: video.title,
        category: video.category,
        watchTimeSeconds: 30,
      });
    } else {
      setIsLiked(false);
      setIsDisliked(false);
      setIsSaved(false);
      setIsDownloaded(false);
    }
  }, [video.id, currentUser]);

  // Handle Like
  const handleLike = () => {
    if (!currentUser) {
      onRequireAuth('Pour aimer ou donner votre avis sur cette vidéo, connectez-vous ou créez un compte.');
      return;
    }

    const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json') || {
      likedVideoIds: [],
      dislikedVideoIds: [],
      savedVideoIds: [],
      downloadedVideos: [],
      customPlaylists: [],
    };

    if (isLiked) {
      favorites.likedVideoIds = favorites.likedVideoIds.filter(id => id !== video.id);
      setIsLiked(false);
    } else {
      favorites.likedVideoIds.push(video.id);
      favorites.dislikedVideoIds = favorites.dislikedVideoIds.filter(id => id !== video.id);
      setIsLiked(true);
      setIsDisliked(false);
      logUserActivity(currentUser.id, {
        action: 'like',
        videoId: video.id,
        videoTitle: video.title,
        category: video.category,
      });
    }

    saveUserFile(currentUser.id, 'favorites.json', favorites);
  };

  // Handle Dislike
  const handleDislike = () => {
    if (!currentUser) {
      onRequireAuth('Pour donner votre avis sur cette vidéo, connectez-vous ou créez un compte.');
      return;
    }

    const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json') || {
      likedVideoIds: [],
      dislikedVideoIds: [],
      savedVideoIds: [],
      downloadedVideos: [],
      customPlaylists: [],
    };

    if (isDisliked) {
      favorites.dislikedVideoIds = favorites.dislikedVideoIds.filter(id => id !== video.id);
      setIsDisliked(false);
    } else {
      favorites.dislikedVideoIds.push(video.id);
      favorites.likedVideoIds = favorites.likedVideoIds.filter(id => id !== video.id);
      setIsDisliked(true);
      setIsLiked(false);
      logUserActivity(currentUser.id, {
        action: 'dislike',
        videoId: video.id,
        videoTitle: video.title,
        category: video.category,
      });
    }

    saveUserFile(currentUser.id, 'favorites.json', favorites);
  };

  // Handle Save / Favorite
  const handleSaveFavorite = () => {
    if (!currentUser) {
      onRequireAuth('L\'enregistrement dans vos favoris ou playlists nécessite un compte MK connecté.');
      return;
    }

    const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json') || {
      likedVideoIds: [],
      dislikedVideoIds: [],
      savedVideoIds: [],
      downloadedVideos: [],
      customPlaylists: [],
    };

    if (isSaved) {
      favorites.savedVideoIds = favorites.savedVideoIds.filter(id => id !== video.id);
      setIsSaved(false);
    } else {
      favorites.savedVideoIds.push(video.id);
      setIsSaved(true);
      logUserActivity(currentUser.id, {
        action: 'favorite',
        videoId: video.id,
        videoTitle: video.title,
        category: video.category,
      });
    }

    saveUserFile(currentUser.id, 'favorites.json', favorites);
  };

  // Handle Share
  const handleShare = () => {
    if (!currentUser) {
      onRequireAuth('Le partage de vidéos et génération de liens directs est réservé aux membres connectés.');
      return;
    }
    setShowShareModal(true);
  };

  // Handle Download
  const handleDownload = () => {
    if (!currentUser) {
      onRequireAuth('Le téléchargement haute fidélité pour visionnage hors-ligne nécessite un compte MK.');
      return;
    }

    if (isDownloaded || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(10);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setIsDownloaded(true);

          // Save to user favorites namespace
          const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json') || {
            likedVideoIds: [],
            dislikedVideoIds: [],
            savedVideoIds: [],
            downloadedVideos: [],
            customPlaylists: [],
          };

          favorites.downloadedVideos.push({
            videoId: video.id,
            downloadedAt: new Date().toISOString(),
            fileSizeMb: Math.round(video.duration * 0.18 * 10) / 10,
            title: video.title,
          });

          saveUserFile(currentUser.id, 'favorites.json', favorites);

          logUserActivity(currentUser.id, {
            action: 'download',
            videoId: video.id,
            videoTitle: video.title,
            category: video.category,
          });

          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  // Handle Post Comment
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth('Pour poster un commentaire sous cette vidéo, veuillez vous connecter ou créer un compte.');
      return;
    }

    if (!newCommentText.trim()) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      videoId: video.id,
      userId: currentUser.id,
      userName: currentUser.username,
      userAvatar: currentUser.avatar,
      text: newCommentText.trim(),
      timestamp: 'À l\'instant',
      likes: 0,
      replies: [],
    };

    setComments([newComment, ...comments]);
    setNewCommentText('');

    logUserActivity(currentUser.id, {
      action: 'comment',
      videoId: video.id,
      videoTitle: video.title,
      category: video.category,
    });
  };

  // Handle Post Reply
  const handlePostReply = (commentId: string) => {
    if (!currentUser) {
      onRequireAuth('Pour répondre à ce commentaire, vous devez être connecté.');
      return;
    }
    if (!replyText.trim()) return;

    setComments(comments.map(c => {
      if (c.id === commentId) {
        const replies = c.replies || [];
        return {
          ...c,
          replies: [
            ...replies,
            {
              id: `cr-${Date.now()}`,
              commentId,
              userId: currentUser.id,
              userName: currentUser.username,
              userAvatar: currentUser.avatar,
              text: replyText.trim(),
              timestamp: 'À l\'instant',
              likes: 0,
            }
          ]
        };
      }
      return c;
    }));

    setReplyText('');
    setReplyingToCommentId(null);
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: PLAYER + VIDEO DETAILS + COMMENTS (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* CUSTOM VIDEO PLAYER WITH DOUBLE CLICK 10S AND EXACT SECONDS PROGRESS LINE */}
        <VideoPlayer
          video={video}
          onProgressUpdate={(secs) => {
            // Periodic update if user is logged in
            if (currentUser && secs > 0 && secs % 15 === 0) {
              logUserActivity(currentUser.id, {
                action: 'watch',
                videoId: video.id,
                videoTitle: video.title,
                category: video.category,
                watchTimeSeconds: 15,
              });
            }
          }}
        />

        {/* VIDEO TITLE */}
        <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
          {video.title}
        </h1>

        {/* CHANNEL BAR & ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          
          {/* Channel info */}
          <div className="flex items-center gap-3">
            <img
              src={video.channelAvatar}
              alt={video.channelTitle}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/15"
            />
            <div>
              <div className="flex items-center gap-1 font-bold text-sm text-white">
                <span>{video.channelTitle}</span>
                {video.verified && <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 fill-gray-400" />}
              </div>
              <div className="text-xs text-gray-400">{video.subscribers} abonnés</div>
            </div>

            <button
              onClick={() => {
                if (!currentUser) {
                  onRequireAuth('Pour vous abonner à cette chaîne, veuillez vous connecter.');
                  return;
                }
                setIsSubscribed(!isSubscribed);
              }}
              className={`ml-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                isSubscribed
                  ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                  : 'bg-white hover:bg-gray-100 text-black shadow-md'
              }`}
            >
              {isSubscribed ? 'Abonné' : 'S\'abonner'}
            </button>
          </div>

          {/* Action buttons (Like/Dislike, Share, Save, Download) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            
            {/* Like / Dislike Pill */}
            <div className="flex items-center bg-[#222222] rounded-full border border-white/5 overflow-hidden">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors ${
                  isLiked ? 'text-[#ff0000] font-bold' : 'text-gray-200'
                }`}
                title="J'aime cette vidéo"
              >
                <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-[#ff0000]' : ''}`} />
                <span>{(video.likesCount + (isLiked ? 1 : 0)).toLocaleString()}</span>
              </button>
              <div className="w-[1px] h-4 bg-white/20" />
              <button
                onClick={handleDislike}
                className={`px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors ${
                  isDisliked ? 'text-gray-400' : 'text-gray-300'
                }`}
                title="Je n'aime pas cette vidéo"
              >
                <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-gray-400' : ''}`} />
              </button>
            </div>

            {/* Share button (Requires Login per specification) */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#222222] hover:bg-white/10 text-xs font-semibold text-gray-200 border border-white/5 transition-colors"
              title={currentUser ? 'Partager cette vidéo' : 'Connexion requise pour partager'}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden xs:inline">Partager</span>
              {!currentUser && <Lock className="w-3 h-3 text-gray-400 ml-0.5" />}
            </button>

            {/* Download button (Requires Login per specification) */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border border-white/5 transition-colors ${
                isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#222222] hover:bg-white/10 text-gray-200'
              }`}
              title={currentUser ? 'Télécharger hors-ligne' : 'Connexion requise pour télécharger'}
            >
              {isDownloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{downloadProgress}%</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Téléchargé</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden xs:inline">Télécharger</span>
                  {!currentUser && <Lock className="w-3 h-3 text-gray-400 ml-0.5" />}
                </>
              )}
            </button>

            {/* Save / Favorite (Requires Login per specification) */}
            <button
              onClick={handleSaveFavorite}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border border-white/5 transition-colors ${
                isSaved
                  ? 'bg-[#ff0000]/20 text-[#ff0000] border-[#ff0000]/40'
                  : 'bg-[#222222] hover:bg-white/10 text-gray-200'
              }`}
              title={currentUser ? 'Enregistrer dans les favoris' : 'Connexion requise pour enregistrer'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#ff0000]' : ''}`} />
              <span className="hidden xs:inline">{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
              {!currentUser && <Lock className="w-3 h-3 text-gray-400 ml-0.5" />}
            </button>

          </div>
        </div>

        {/* EXPANDABLE VIDEO DESCRIPTION BOX */}
        <div
          onClick={() => setIsDescExpanded(!isDescExpanded)}
          className="p-3.5 rounded-2xl bg-[#202020] hover:bg-[#252525] border border-white/5 text-xs text-gray-300 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-white mb-1.5">
            <span>{video.views.toLocaleString()} vues</span>
            <span>•</span>
            <span>Publié le {video.uploadDate}</span>
            <span>•</span>
            <span className="text-[#ff0000]">#{video.category}</span>
          </div>

          <p className={`whitespace-pre-line leading-relaxed ${isDescExpanded ? '' : 'line-clamp-2'}`}>
            {video.description}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {video.tags.map((tag, idx) => (
              <span key={idx} className="text-[11px] text-gray-400 font-medium">
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-2 font-bold text-gray-400 text-[11px]">
            {isDescExpanded ? 'Afficher moins' : '...Afficher plus'}
          </div>
        </div>

        {/* COMMENTS SECTION */}
        <div className="mt-4">
          <div className="flex items-center gap-2 font-black text-base text-white mb-4">
            <MessageSquare className="w-4 h-4 text-[#ff0000]" />
            <span>{comments.length} Commentaires</span>
          </div>

          {/* Add comment box */}
          {currentUser ? (
            <form onSubmit={handlePostComment} className="flex gap-3 mb-6">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10"
              />
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Ajouter un commentaire public sur MK..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#ff0000] py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCommentText('')}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-full"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-4 py-1.5 bg-[#ff0000] hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs rounded-full shadow-sm transition-all"
                  >
                    Commenter
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div
              onClick={() => onRequireAuth('Pour poster un commentaire, veuillez vous connecter ou créer un compte MK.')}
              className="p-4 rounded-2xl bg-[#1e1e1e] border border-white/10 flex items-center justify-between gap-3 mb-6 cursor-pointer hover:border-[#ff0000]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Vous souhaitez commenter cette vidéo ?
                  </span>
                  <span className="text-xs text-gray-400">
                    Connectez-vous pour réagir et discuter avec les créateurs MK.
                  </span>
                </div>
              </div>
              <button className="px-4 py-1.5 rounded-full bg-[#ff0000] text-xs font-bold text-white shadow-md">
                Connexion
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <img
                  src={comment.userAvatar}
                  alt={comment.userName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{comment.userName}</span>
                    <span className="text-[11px] text-gray-400">{comment.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-200 mt-1 leading-relaxed">{comment.text}</p>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <button className="flex items-center gap-1 hover:text-white transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{comment.likes}</span>
                    </button>
                    <button
                      onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                      className="hover:text-white font-semibold transition-colors"
                    >
                      Répondre
                    </button>
                  </div>

                  {/* Reply Input Box */}
                  {replyingToCommentId === comment.id && (
                    <div className="mt-2 pl-4 border-l-2 border-white/10 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Répondre à ${comment.userName}...`}
                        className="flex-1 bg-[#222222] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff0000]"
                      />
                      <button
                        onClick={() => handlePostReply(comment.id)}
                        className="px-3 py-1.5 bg-[#ff0000] text-white rounded-xl text-xs font-bold"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Replies List */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2.5">
                          <img
                            src={reply.userAvatar}
                            alt={reply.userName}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{reply.userName}</span>
                              <span className="text-[10px] text-gray-400">{reply.timestamp}</span>
                            </div>
                            <p className="text-xs text-gray-300 mt-0.5">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: AI RECOMMENDATIONS & NEXT VIDEOS (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        
        {/* AI Recommendation Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-[#ff4444] mb-1">
            <Sparkles className="w-4 h-4 text-[#ff0000]" />
            <span>Algorithme IA MK Recommande</span>
          </div>
          <p className="text-[11px] text-gray-300">
            Analysé d'après vos centres d'intérêts et temps de rétention sur la catégorie{' '}
            <strong className="text-white">{video.category}</strong>.
          </p>
        </div>

        {/* Video list */}
        <div className="flex flex-col gap-3">
          {recommendations.slice(0, 8).map(({ video: recVideo, matchReasons }) => (
            <div
              key={recVideo.id}
              onClick={() => onSelectVideo(recVideo)}
              className="flex gap-2.5 group cursor-pointer p-1.5 rounded-2xl hover:bg-white/5 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/5">
                <img
                  src={recVideo.thumbnailUrl}
                  alt={recVideo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/85 text-[10px] font-mono font-bold text-white">
                  {recVideo.durationFormatted}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#ff3b30] transition-colors">
                  {recVideo.title}
                </h4>
                <div className="text-[11px] text-gray-400 mt-1 truncate">
                  {recVideo.channelTitle}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {recVideo.views.toLocaleString()} vues • {recVideo.uploadDate}
                </div>
                {matchReasons[0] && (
                  <span className="text-[9px] text-[#ff6666] font-medium mt-1 truncate block">
                    {matchReasons[0]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* SHARE MODAL (ONLY ACCESSIBLE ONCE LOGGED IN) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 text-white shadow-2xl">
            <h3 className="text-lg font-black tracking-tight mb-2">Partager la vidéo MK</h3>
            <p className="text-xs text-gray-400 mb-4">
              Copiez le lien direct vers cette vidéo ou partagez-la sur vos réseaux préférés.
            </p>

            <div className="flex items-center gap-2 bg-[#222222] border border-white/10 rounded-2xl p-2 mb-4">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="bg-transparent text-xs text-gray-300 flex-1 px-2 focus:outline-none"
              />
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 rounded-xl bg-[#ff0000] text-xs font-bold text-white flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
