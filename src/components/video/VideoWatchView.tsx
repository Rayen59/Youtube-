import React, { useState, useEffect, useRef } from 'react';
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
  BellOff,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Edit3,
  Mic,
  MicOff,
} from 'lucide-react';
import { Video, Comment, User, UserFavorites } from '../../types';
import { VideoPlayer } from './VideoPlayer';
import { getPersonalizedRecommendations } from '../../services/recommendationEngine';
import {
  getUserFile,
  saveUserFile,
  logUserActivity,
  isChannelSubscribed,
  toggleChannelSubscription,
  toggleChannelNotificationBell,
  getRealVideoEngagement,
  recordRealVideoView,
  recordRealVideoWatchSeconds,
  saveRealVideoComment,
  updateRealVideoCommentsList,
  addNotification,
} from '../../storage/userNamespace';
import {
  moderateContentWithAI,
  ModerationResult,
} from '../../services/aiModerationService';
import {
  transcribeAudioBlob,
  translateVoiceText,
  VoiceLangCode,
} from '../../services/voiceService';

interface VideoWatchViewProps {
  video: Video;
  currentUser: User | null;
  onSelectVideo: (video: Video) => void;
  onRequireAuth: (restrictionMessage: string) => void;
  onEditVideo?: (video: Video) => void;
  onDeleteVideo?: (video: Video) => void;
  onControlsVisibilityChange?: (visible: boolean) => void;
}

export const VideoWatchView: React.FC<VideoWatchViewProps> = ({
  video,
  currentUser,
  onSelectVideo,
  onEditVideo,
  onDeleteVideo,
  onControlsVisibilityChange,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notifBellEnabled, setNotifBellEnabled] = useState(true);
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
  const [commentModerationBlock, setCommentModerationBlock] = useState<ModerationResult | null>(null);
  const [isModeratingComment, setIsModeratingComment] = useState(false);

  // Real video statistics state
  const [realViewsCount, setRealViewsCount] = useState(0);
  const [realWatchSecs, setRealWatchSecs] = useState(0);

  // Voice dictation for comments
  const [isDictatingComment, setIsDictatingComment] = useState(false);
  const [isTranslatingComment, setIsTranslatingComment] = useState(false);
  const commentRecognitionRef = useRef<any>(null);
  const commentRecorderRef = useRef<MediaRecorder | null>(null);
  const commentStreamRef = useRef<MediaStream | null>(null);
  const commentChunksRef = useRef<Blob[]>([]);
  const commentSpeechRecognizedRef = useRef<boolean>(false);

  const recommendations = getPersonalizedRecommendations(
    currentUser ? currentUser.id : null,
    video.id
  );

  // Initialize real views, real comments & user states
  useEffect(() => {
    const updatedStats = recordRealVideoView(video.id);
    setRealViewsCount(updatedStats.realViews);
    setRealWatchSecs(updatedStats.realWatchSeconds);
    setComments(updatedStats.realComments || []);

    const subState = isChannelSubscribed(video.channelTitle, currentUser?.id);
    setIsSubscribed(Boolean(subState));
    setNotifBellEnabled(subState ? subState.notificationsEnabled : true);

    if (currentUser) {
      const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json');
      if (favorites) {
        setIsLiked(favorites.likedVideoIds.includes(video.id));
        setIsDisliked(favorites.dislikedVideoIds.includes(video.id));
        setIsSaved(favorites.savedVideoIds.includes(video.id));
        setIsDownloaded(favorites.downloadedVideos.some((d) => d.videoId === video.id));
      }
    } else {
      const guestLikes = JSON.parse(localStorage.getItem('mk_guest_likes') || '[]') as string[];
      const guestSaved = JSON.parse(localStorage.getItem('mk_guest_saved') || '[]') as string[];
      setIsLiked(guestLikes.includes(video.id));
      setIsDisliked(false);
      setIsSaved(guestSaved.includes(video.id));
      setIsDownloaded(false);
    }

    logUserActivity(currentUser?.id, {
      action: 'watch',
      videoId: video.id,
      videoTitle: video.title,
      category: video.category,
      watchTimeSeconds: 5,
    });
  }, [video.id, currentUser]);

  // Toggle Voice-to-Text Dictation for Comment Input (Hybrid Web Speech + Gemini Audio Transcribe)
  const handleToggleCommentDictation = async () => {
    if (isDictatingComment) {
      try {
        commentRecognitionRef.current?.stop();
      } catch {}
      if (commentRecorderRef.current && commentRecorderRef.current.state === 'recording') {
        try {
          commentRecorderRef.current.stop();
          return;
        } catch {}
      }
      if (commentStreamRef.current) {
        commentStreamRef.current.getTracks().forEach((t) => t.stop());
        commentStreamRef.current = null;
      }
      setIsDictatingComment(false);
      return;
    }

    setIsDictatingComment(true);
    commentSpeechRecognizedRef.current = false;
    const baseText = newCommentText ? newCommentText + ' ' : '';

    // 1. Start MediaRecorder for guaranteed AI transcription inside iframes & all browsers
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      commentStreamRef.current = stream;
      commentChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream);
      commentRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          commentChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (commentStreamRef.current) {
          commentStreamRef.current.getTracks().forEach((t) => t.stop());
          commentStreamRef.current = null;
        }
        setIsDictatingComment(false);

        if (commentSpeechRecognizedRef.current || commentChunksRef.current.length === 0) {
          return;
        }

        setIsTranslatingComment(true);
        const blob = new Blob(commentChunksRef.current, { type: mimeType });
        const res = await transcribeAudioBlob({
          audioBlob: blob,
          mimeType,
          lang: 'fr-FR',
          translateToTarget: true,
        });
        setIsTranslatingComment(false);
        if (res.transcript) {
          setNewCommentText((prev) => ((prev ? prev + ' ' : '') + res.transcript).trim());
        }
      };

      recorder.start(200);
      setTimeout(() => {
        if (recorder.state === 'recording') {
          try {
            recorder.stop();
          } catch {}
        }
      }, 4500);
    } catch {
      // Fallback to SpeechRecognition below
    }

    // 2. Also start SpeechRecognition for instant live words if supported
    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      try {
        const rec = new SpeechRecognitionConstructor();
        commentRecognitionRef.current = rec;
        rec.lang = 'fr-FR';
        rec.continuous = false;
        rec.interimResults = true;

        rec.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            commentSpeechRecognizedRef.current = true;
            setNewCommentText((baseText + transcript).trim());
          }
        };

        rec.start();
      } catch {}
    }
  };

  const handleTranslateCommentText = async (targetLang: VoiceLangCode) => {
    if (!newCommentText.trim()) return;
    setIsTranslatingComment(true);
    const translated = await translateVoiceText(newCommentText, targetLang);
    setIsTranslatingComment(false);
    if (translated) {
      setNewCommentText(translated);
    }
  };

  // Handle Subscribe & Notification Bell
  const handleToggleSubscribe = () => {
    const res = toggleChannelSubscription(
      {
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        channelAvatar: video.channelAvatar,
        subscribers: video.subscribers,
      },
      currentUser?.id
    );
    setIsSubscribed(res.subscribed);
    if (res.subscribed) {
      setNotifBellEnabled(true);
    }
  };

  const handleToggleNotifBell = () => {
    const updatedList = toggleChannelNotificationBell(video.channelTitle, currentUser?.id);
    const found = updatedList.find(
      (c) => c.channelTitle.toLowerCase() === video.channelTitle.toLowerCase()
    );
    if (found) {
      setNotifBellEnabled(found.notificationsEnabled);
    }
  };

  // Handle Like
  const handleLike = () => {
    if (!currentUser) {
      const guestLikes = JSON.parse(localStorage.getItem('mk_guest_likes') || '[]') as string[];
      if (isLiked) {
        localStorage.setItem(
          'mk_guest_likes',
          JSON.stringify(guestLikes.filter((id) => id !== video.id))
        );
        setIsLiked(false);
      } else {
        localStorage.setItem('mk_guest_likes', JSON.stringify([...guestLikes, video.id]));
        setIsLiked(true);
        setIsDisliked(false);
        logUserActivity(null, {
          action: 'like',
          videoId: video.id,
          videoTitle: video.title,
          category: video.category,
        });
      }
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
      favorites.likedVideoIds = favorites.likedVideoIds.filter((id) => id !== video.id);
      setIsLiked(false);
    } else {
      favorites.likedVideoIds.push(video.id);
      favorites.dislikedVideoIds = favorites.dislikedVideoIds.filter((id) => id !== video.id);
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
      setIsDisliked(!isDisliked);
      if (!isDisliked) setIsLiked(false);
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
      favorites.dislikedVideoIds = favorites.dislikedVideoIds.filter((id) => id !== video.id);
      setIsDisliked(false);
    } else {
      favorites.dislikedVideoIds.push(video.id);
      favorites.likedVideoIds = favorites.likedVideoIds.filter((id) => id !== video.id);
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
      const guestSaved = JSON.parse(localStorage.getItem('mk_guest_saved') || '[]') as string[];
      if (isSaved) {
        localStorage.setItem(
          'mk_guest_saved',
          JSON.stringify(guestSaved.filter((id) => id !== video.id))
        );
        setIsSaved(false);
      } else {
        localStorage.setItem('mk_guest_saved', JSON.stringify([...guestSaved, video.id]));
        setIsSaved(true);
        logUserActivity(null, {
          action: 'favorite',
          videoId: video.id,
          videoTitle: video.title,
          category: video.category,
        });
      }
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
      favorites.savedVideoIds = favorites.savedVideoIds.filter((id) => id !== video.id);
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
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: video.title,
          text: `Regardez "${video.title}" sur MK Streaming :`,
          url: window.location.href,
        })
        .catch(() => {
          setShowShareModal(true);
        });
    } else {
      setShowShareModal(true);
    }
  };

  // Handle Download
  const handleDownload = () => {
    if (isDownloaded || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(20);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setIsDownloaded(true);

          try {
            const a = document.createElement('a');
            a.href = video.videoUrl;
            a.download = `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch {}

          if (currentUser) {
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
          }

          logUserActivity(currentUser?.id, {
            action: 'download',
            videoId: video.id,
            videoTitle: video.title,
            category: video.category,
          });

          addNotification({
            userId: currentUser?.id,
            title: 'Téléchargement 4K Terminé',
            message: `La vidéo "${video.title}" a été enregistrée pour une lecture hors-ligne.`,
            type: 'system',
            videoId: video.id,
            thumbnailUrl: video.thumbnailUrl,
          });

          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  // Handle Post Comment with AI Moderation & Real Persistence
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsModeratingComment(true);
    setCommentModerationBlock(null);

    const modResult = await moderateContentWithAI({
      text: newCommentText.trim(),
      source: 'comment',
      user: currentUser,
    });

    setIsModeratingComment(false);

    if (modResult.blocked) {
      setCommentModerationBlock(modResult);
      return;
    }

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      videoId: video.id,
      userId: currentUser ? currentUser.id : 'guest',
      userName: currentUser ? currentUser.username : 'Visiteur MK',
      userAvatar: currentUser
        ? currentUser.avatar
        : 'https://api.dicebear.com/7.x/identicon/svg?seed=VisiteurMK',
      text: newCommentText.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      likes: 0,
      replies: [],
    };

    const updatedStats = saveRealVideoComment(video.id, newComment);
    setComments(updatedStats.realComments);
    setNewCommentText('');

    logUserActivity(currentUser?.id, {
      action: 'comment',
      videoId: video.id,
      videoTitle: video.title,
      category: video.category,
    });

    addNotification({
      userId: currentUser?.id,
      title: 'Commentaire publié',
      message: `Votre commentaire sur "${video.title}" est en ligne.`,
      type: 'comment',
      videoId: video.id,
      thumbnailUrl: video.thumbnailUrl,
    });
  };

  // Handle Post Reply with AI Moderation
  const handlePostReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    const modResult = await moderateContentWithAI({
      text: replyText.trim(),
      source: 'comment',
      user: currentUser,
    });

    if (modResult.blocked) {
      setCommentModerationBlock(modResult);
      return;
    }

    const nextComments = comments.map((c) => {
      if (c.id === commentId) {
        const replies = c.replies || [];
        return {
          ...c,
          replies: [
            ...replies,
            {
              id: `cr-${Date.now()}`,
              commentId,
              userId: currentUser ? currentUser.id : 'guest',
              userName: currentUser ? currentUser.username : 'Visiteur MK',
              userAvatar: currentUser
                ? currentUser.avatar
                : 'https://api.dicebear.com/7.x/identicon/svg?seed=VisiteurMK',
              text: replyText.trim(),
              timestamp: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              likes: 0,
            },
          ],
        };
      }
      return c;
    });

    setComments(nextComments);
    updateRealVideoCommentsList(video.id, nextComments);
    setReplyText('');
    setReplyingToCommentId(null);
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalRealAndBaseViews = (video.isFromGallery ? 0 : video.views) + realViewsCount;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: PLAYER + VIDEO DETAILS + COMMENTS (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* CUSTOM VIDEO PLAYER WITH DOUBLE CLICK 10S AND HIDDEN BOTTOM BAR ON OPEN */}
        <VideoPlayer
          video={video}
          onControlsVisibilityChange={onControlsVisibilityChange}
          onProgressUpdate={(secs) => {
            if (secs > 0 && secs % 5 === 0) {
              const updated = recordRealVideoWatchSeconds(video.id, 5);
              setRealWatchSecs(updated.realWatchSeconds);
              logUserActivity(currentUser?.id, {
                action: 'watch',
                videoId: video.id,
                videoTitle: video.title,
                category: video.category,
                watchTimeSeconds: 5,
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
          {/* Channel info + Subscribe + Notification Bell */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <img
              src={video.channelAvatar}
              alt={video.channelTitle}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/15"
            />
            <div>
              <div className="flex items-center gap-1 font-bold text-sm text-white">
                <span>{video.channelTitle}</span>
                {video.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 fill-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-400">{video.subscribers} abonnés</div>
            </div>

            <button
              type="button"
              onClick={handleToggleSubscribe}
              className={`ml-1 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSubscribed
                  ? 'bg-white/15 hover:bg-white/25 text-white border border-white/15'
                  : 'bg-white hover:bg-gray-100 text-black shadow-md'
              }`}
            >
              {isSubscribed ? 'Abonné' : "S'abonner"}
            </button>

            {isSubscribed && (
              <button
                type="button"
                onClick={handleToggleNotifBell}
                title={
                  notifBellEnabled
                    ? 'Notifications activées pour cette chaîne (cliquer pour couper)'
                    : 'Notifications désactivées (cliquer pour activer)'
                }
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  notifBellEnabled
                    ? 'bg-[#ff0000]/20 border-[#ff0000]/40 text-[#ff4444]'
                    : 'bg-white/10 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {notifBellEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Action buttons (Like/Dislike, Share, Save, Download) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Like / Dislike Pill */}
            <div className="flex items-center bg-[#222222] rounded-full border border-white/5 overflow-hidden">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer ${
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
                className={`px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer ${
                  isDisliked ? 'text-gray-400' : 'text-gray-300'
                }`}
                title="Je n'aime pas cette vidéo"
              >
                <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-gray-400' : ''}`} />
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#222222] hover:bg-white/10 text-xs font-semibold text-gray-200 border border-white/5 transition-colors cursor-pointer"
              title="Partager cette vidéo"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden xs:inline">Partager</span>
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border border-white/5 transition-colors cursor-pointer ${
                isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#222222] hover:bg-white/10 text-gray-200'
              }`}
              title="Télécharger la vidéo"
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
                </>
              )}
            </button>

            {/* Save / Favorite */}
            <button
              onClick={handleSaveFavorite}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border border-white/5 transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-[#ff0000]/20 text-[#ff0000] border-[#ff0000]/40'
                  : 'bg-[#222222] hover:bg-white/10 text-gray-200'
              }`}
              title="Enregistrer dans les favoris"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#ff0000]' : ''}`} />
              <span className="hidden xs:inline">{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
            </button>

            {/* EDIT & DELETE USER PUBLICATION BUTTONS */}
            {(video.isFromGallery ||
              Boolean(video.creatorId) ||
              (currentUser &&
                (video.creatorId === currentUser.id ||
                  video.channelId === `ch-${currentUser.id}` ||
                  currentUser.role === 'admin'))) && (
              <>
                {onEditVideo && (
                  <button
                    type="button"
                    onClick={() => onEditVideo(video)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                    title="Modifier cette vidéo"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                )}

                {onDeleteVideo && (
                  <button
                    type="button"
                    onClick={() => onDeleteVideo(video)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
                    title="Supprimer définitivement cette publication"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer ma publication</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* EXPANDABLE VIDEO DESCRIPTION BOX WITH REAL LIVE STATS */}
        <div
          onClick={() => setIsDescExpanded(!isDescExpanded)}
          className="p-3.5 rounded-2xl bg-[#202020] hover:bg-[#252525] border border-white/5 text-xs text-gray-300 cursor-pointer transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2 font-bold text-white mb-1.5">
            <span>{totalRealAndBaseViews.toLocaleString()} vues</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-mono">
              +{realViewsCount} vue{realViewsCount > 1 ? 's' : ''} réelle{realViewsCount > 1 ? 's' : ''} • {realWatchSecs}s visionnées
            </span>
            <span>•</span>
            <span>Publié le {video.uploadDate}</span>
            <span>•</span>
            <span className="text-[#ff0000]">#{video.category}</span>
          </div>

          <p
            className={`whitespace-pre-line leading-relaxed ${
              isDescExpanded ? '' : 'line-clamp-2'
            }`}
          >
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

        {/* COMMENTS SECTION (100% REAL COMMENTS + VOICE DICTATION) */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 font-black text-base text-white">
              <MessageSquare className="w-4 h-4 text-[#ff0000]" />
              <span>{comments.length} Commentaire{comments.length > 1 ? 's' : ''} Réel{comments.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Modération IA active</span>
            </div>
          </div>

          {commentModerationBlock && (
            <div className="mb-4 p-4 rounded-2xl bg-red-950/40 border-2 border-red-500/60 text-white space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 font-black text-xs sm:text-sm">
                  <ShieldAlert className="w-4 h-4 text-[#ff0000] shrink-0" />
                  <span>COMMENTAIRE BLOQUÉ AUTOMATIQUEMENT PAR LE SYSTÈME IA</span>
                </div>
                <button
                  onClick={() => setCommentModerationBlock(null)}
                  className="text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
              </div>
              <p className="text-xs text-gray-200">
                Catégorie détectée :{' '}
                <strong className="text-red-300">
                  {commentModerationBlock.violationCategory}
                </strong>{' '}
                ({commentModerationBlock.confidence}% de confiance)
              </p>
              <p className="text-xs text-gray-300">{commentModerationBlock.reason}</p>
            </div>
          )}

          {/* Add comment box with Voice-to-Text Microphone button */}
          <form onSubmit={handlePostComment} className="flex gap-3 mb-6">
            <img
              src={
                currentUser
                  ? currentUser.avatar
                  : 'https://api.dicebear.com/7.x/identicon/svg?seed=VisiteurMK'
              }
              alt={currentUser ? currentUser.username : 'Visiteur'}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10"
            />
            <div className="flex-1 flex flex-col gap-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Ajouter un commentaire réel (ou cliquez sur le micro pour dicter)..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#ff0000] py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleToggleCommentDictation}
                  title="Dicter un commentaire avec votre voix"
                  className={`absolute right-1 p-1.5 rounded-full transition-colors cursor-pointer ${
                    isDictatingComment
                      ? 'bg-[#ff0000] text-white animate-pulse'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isDictatingComment ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400">
                    {isDictatingComment
                      ? '🎙️ Parlez maintenant (cliquez sur le micro pour transcrire)...'
                      : isTranslatingComment
                      ? '✨ Transcription / traduction vocale IA...'
                      : 'Traduire :'}
                  </span>
                  {!isDictatingComment && newCommentText.trim() && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTranslateCommentText('fr-FR')}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer"
                      >
                        🇫🇷 FR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateCommentText('en-US')}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer"
                      >
                        🇺🇸 EN
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateCommentText('ar-SA')}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer"
                      >
                        🇹🇳 AR
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCommentText('');
                      setCommentModerationBlock(null);
                    }}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-full cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newCommentText.trim() || isModeratingComment}
                    className="px-4 py-1.5 bg-[#ff0000] hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs rounded-full shadow-sm transition-all cursor-pointer"
                  >
                    {isModeratingComment ? 'Vérification IA...' : 'Commenter'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#181818] border border-white/5 text-center text-xs text-gray-400">
              Aucun commentaire pour le moment. Soyez le premier à commenter cette vidéo !
            </div>
          ) : (
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
                      <button
                        type="button"
                        onClick={() => {
                          const updated = comments.map((c) =>
                            c.id === comment.id ? { ...c, likes: c.likes + 1 } : c
                          );
                          setComments(updated);
                          updateRealVideoCommentsList(video.id, updated);
                        }}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{comment.likes}</span>
                      </button>
                      <button
                        onClick={() =>
                          setReplyingToCommentId(
                            replyingToCommentId === comment.id ? null : comment.id
                          )
                        }
                        className="hover:text-white font-semibold transition-colors cursor-pointer"
                      >
                        Répondre
                      </button>
                      {(comment.userId === 'guest' ||
                        (currentUser &&
                          (comment.userId === currentUser.id ||
                            currentUser.role === 'admin'))) && (
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = comments.filter((c) => c.id !== comment.id);
                            setComments(remaining);
                            updateRealVideoCommentsList(video.id, remaining);
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Supprimer mon commentaire"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Supprimer</span>
                        </button>
                      )}
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
                          className="px-3 py-1.5 bg-[#ff0000] text-white rounded-xl text-xs font-bold cursor-pointer"
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
                                <span className="text-xs font-bold text-white">
                                  {reply.userName}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {reply.timestamp}
                                </span>
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
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: AI RECOMMENDATIONS & NEXT VIDEOS (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
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

        <div className="flex flex-col gap-3">
          {recommendations.slice(0, 8).map(({ video: recVideo, matchReasons }) => (
            <div
              key={recVideo.id}
              onClick={() => onSelectVideo(recVideo)}
              className="flex gap-2.5 group cursor-pointer p-1.5 rounded-2xl hover:bg-white/5 transition-all"
            >
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

      {/* SHARE MODAL */}
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
                className="px-3 py-1.5 rounded-xl bg-[#ff0000] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20 cursor-pointer"
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
