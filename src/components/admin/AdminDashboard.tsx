import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  FolderTree,
  Brain,
  Activity,
  BarChart3,
  Copy,
  Check,
  Download,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  FileCode,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { User, UserProfileNamespace } from '../../types';
import { getAdminAllUsersData, getUserFile } from '../../storage/userNamespace';
import { generateUserAIAnalysis, UserAIAnalysis } from '../../services/recommendationEngine';
import { MOCK_VIDEOS } from '../../data/mockVideos';

interface AdminDashboardProps {
  currentUser: User | null;
  onClose: () => void;
  onSelectVideo?: (videoId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onClose,
  onSelectVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'namespaces' | 'ai_analysis' | 'activity_stream' | 'charts'>('accounts');
  const [allUsersData, setAllUsersData] = useState<{ user: User; files: Record<string, unknown> }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json'>('profile.json');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<UserAIAnalysis | null>(null);

  const loadData = () => {
    try {
      const data = getAdminAllUsersData(currentUser);
      setAllUsersData(data);
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0].user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Update AI analysis when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      const targetUser = allUsersData.find(d => d.user.id === selectedUserId)?.user;
      if (targetUser) {
        setAiAnalysis(generateUserAIAnalysis(targetUser));
      }
    }
  }, [selectedUserId, allUsersData]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 text-white">
        <div className="p-8 bg-[#181818] border border-red-500/40 rounded-3xl max-w-md text-center">
          <Shield className="w-12 h-12 text-[#ff0000] mx-auto mb-4" />
          <h2 className="text-xl font-bold">Accès Non Autorisé</h2>
          <p className="text-sm text-gray-400 mt-2">
            Ce tableau de bord est strictement réservé au compte administrateur <code className="text-white font-mono bg-white/10 px-1 rounded">nimda981</code>.
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-[#ff0000] rounded-full font-bold text-sm"
          >
            Retourner au site
          </button>
        </div>
      </div>
    );
  }

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadJson = (filename: string, content: unknown) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedUserId}_${filename}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Flattened activities across all users for live activity stream
  const allPlatformActivities = allUsersData.flatMap(item => {
    const activities = (item.files['activities.json'] as Array<{
      id: string;
      action: string;
      videoTitle?: string;
      searchQuery?: string;
      timestamp: string;
    }>) || [];
    return activities.map(act => ({
      ...act,
      user: item.user,
    }));
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const selectedUserData = allUsersData.find(d => d.user.id === selectedUserId);
  const currentFileContent = selectedUserData ? selectedUserData.files[selectedFile] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d] text-white overflow-hidden animate-in fade-in duration-200">
      
      {/* TOP HEADER */}
      <header className="h-16 px-6 bg-[#141414] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff0000] to-red-700 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,0,0.5)]">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight flex items-center gap-2">
              Panneau Administrateur MK <span className="text-xs bg-[#ff0000] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">ROOT</span>
            </h1>
            <p className="text-xs text-gray-400">
              Session certifiée : <span className="text-white font-mono">{currentUser.username}</span> ({currentUser.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Actualiser les namespaces"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white border border-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#ff0000] hover:bg-red-700 text-xs font-bold shadow-md transition-colors"
          >
            Quitter le Dashboard
          </button>
        </div>
      </header>

      {/* METRICS KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-[#111111] border-b border-white/5">
        <div className="bg-[#181818] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Comptes Utilisateurs</div>
            <div className="text-lg font-black text-white">{allUsersData.length} inscrits</div>
          </div>
        </div>

        <div className="bg-[#181818] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Dossiers Isolés</div>
            <div className="text-lg font-black text-white">{allUsersData.length * 4} fichiers JSON</div>
          </div>
        </div>

        <div className="bg-[#181818] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Moteur IA MK</div>
            <div className="text-lg font-black text-white">Hybride v2.4 Actif</div>
          </div>
        </div>

        <div className="bg-[#181818] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ff0000]/10 text-[#ff0000]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Événements Traités</div>
            <div className="text-lg font-black text-white">{allPlatformActivities.length} logs</div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-white/10 px-6 bg-[#141414] overflow-x-auto">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'accounts'
              ? 'border-[#ff0000] text-[#ff0000]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          1. Liste des Comptes & Mots de Passe BCRYPT
        </button>

        <button
          onClick={() => setActiveTab('namespaces')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'namespaces'
              ? 'border-[#ff0000] text-[#ff0000]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          2. Dossiers Isolés (/users/{'{userId}'}/*.json)
        </button>

        <button
          onClick={() => setActiveTab('ai_analysis')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'ai_analysis'
              ? 'border-[#ff0000] text-[#ff0000]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Brain className="w-4 h-4" />
          3. Analyse IA Par Utilisateur
        </button>

        <button
          onClick={() => setActiveTab('activity_stream')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'activity_stream'
              ? 'border-[#ff0000] text-[#ff0000]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          4. Flux d'Activité Globale
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'charts'
              ? 'border-[#ff0000] text-[#ff0000]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          5. Graphiques & Analytiques
        </button>
      </div>

      {/* MAIN TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        
        {/* TAB 1: ACCOUNTS & BCRYPT HASHES */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Comptes Enregistrés sur MK Streaming</h3>
                <p className="text-xs text-gray-400">
                  Tous les mots de passe sont sécurisés avec du salage et hachage BCRYPT irréversible.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filtrer nom ou email..."
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff0000]"
                />
              </div>
            </div>

            <div className="bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#202020] text-gray-300 font-bold border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Utilisateur</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Mot de Passe Hashé (BCRYPT)</th>
                      <th className="py-3 px-4">Rôle</th>
                      <th className="py-3 px-4">Date Inscription</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {allUsersData
                      .filter(u =>
                        u.user.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        u.user.email.toLowerCase().includes(searchFilter.toLowerCase())
                      )
                      .map(({ user }) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                              />
                              <div>
                                <span className="font-bold text-white block">{user.username}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{user.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{user.email}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 max-w-xs font-mono text-[11px] text-gray-300 bg-black/40 px-2 py-1 rounded border border-white/5">
                              <span className="truncate">{user.passwordHash}</span>
                              <button
                                onClick={() => handleCopyHash(user.passwordHash)}
                                title="Copier le hash bcrypt"
                                className="shrink-0 p-1 hover:text-white text-gray-400"
                              >
                                {copiedHash === user.passwordHash ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin'
                                  ? 'bg-[#ff0000]/20 text-[#ff0000] border border-[#ff0000]/30'
                                  : 'bg-white/10 text-gray-300'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setActiveTab('namespaces');
                              }}
                              className="px-2.5 py-1 bg-white/10 hover:bg-[#ff0000] hover:text-white rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Explorer Namespace →
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ISOLATED USER NAMESPACES EXPLORER */}
        {activeTab === 'namespaces' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Left Column: User Selector */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Sélectionner un Espace Utilisateur
              </h3>
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {allUsersData.map(({ user }) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      selectedUserId === user.id
                        ? 'bg-[#222222] border-[#ff0000] shadow-md'
                        : 'bg-[#181818] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          {user.username}
                          {user.role === 'admin' && (
                            <span className="text-[9px] bg-[#ff0000] px-1 rounded font-black">ADMIN</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">/users/{user.id}/</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Files & JSON Viewer */}
            <div className="lg:col-span-8 flex flex-col bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Virtual Files Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#202020] border-b border-white/10">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {(['profile.json', 'activities.json', 'preferences.json', 'favorites.json'] as const).map(fileName => (
                    <button
                      key={fileName}
                      onClick={() => setSelectedFile(fileName)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                        selectedFile === fileName
                          ? 'bg-[#ff0000] text-white shadow-sm'
                          : 'bg-black/30 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{fileName}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadJson(selectedFile, currentFileContent)}
                    title="Télécharger ce fichier JSON"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* JSON Editor View */}
              <div className="flex-1 p-4 bg-[#111111] overflow-auto max-h-[520px]">
                <div className="text-[11px] text-gray-400 font-mono mb-2 flex items-center justify-between pb-2 border-b border-white/5">
                  <span>Chemin : /users/{selectedUserId}/{selectedFile}</span>
                  <span className="text-emerald-400 font-bold">● Synchronisation en direct</span>
                </div>
                <pre className="text-xs font-mono text-gray-200 leading-relaxed overflow-x-auto selection:bg-[#ff0000]/40">
                  {JSON.stringify(currentFileContent, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEEP AI ANALYSIS PER USER */}
        {activeTab === 'ai_analysis' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#ff0000]" />
                  Analyse Comportementale IA par Utilisateur
                </h3>
                <p className="text-xs text-gray-400">
                  Modèle d'apprentissage supervisé et filtrage collaboratif analysant en continu les signaux d'affinité.
                </p>
              </div>

              {/* User Switcher Dropdown */}
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-[#202020] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff0000]"
              >
                {allUsersData.map(({ user }) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {aiAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. CE QU'IL AIME */}
                <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <ThumbsUp className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-wide">Ce qu'il Aime (Affinités)</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1.5 font-medium">Catégories Préférées :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.whatTheyLike.topCategories.map((c, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold"
                          >
                            {c.category} (+{c.score} pts)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1.5 font-medium">Tags à Forte Rétention :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.whatTheyLike.preferredTags.map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-xs text-gray-300">
                      <span className="text-gray-400">Tendance de complétion : </span>
                      <span className="font-bold text-white">{aiAnalysis.whatTheyLike.completionTendency}</span>
                    </div>
                  </div>
                </div>

                {/* 2. CE QU'IL N'AIME PAS */}
                <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4 text-[#ff4444]">
                    <ThumbsDown className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-wide">Ce qu'il N'aime Pas (Pénalités)</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1.5 font-medium">Catégories & Tags Rejetés :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.whatTheyDislike.avoidedCategories.length > 0 ? (
                          aiAnalysis.whatTheyDislike.avoidedCategories.map((c, i) => (
                            <span
                              key={i}
                              className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 font-bold"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">Aucune catégorie pénalisée</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1.5 font-medium">Vidéos Dislikées :</span>
                      <span className="text-sm font-bold text-white">
                        {aiAnalysis.whatTheyDislike.dislikedVideosCount} vidéos signalées
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-xs text-gray-300">
                      <span className="text-gray-400">Comportement de rejet : </span>
                      <span className="font-bold text-white">{aiAnalysis.whatTheyDislike.bounceRateReason}</span>
                    </div>
                  </div>
                </div>

                {/* 3. HABITUDES DE VISIONNAGE */}
                <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4 text-purple-400">
                    <Clock className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-wide">Habitudes de Visionnage</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Temps total estimé :</span>
                      <span className="font-bold text-white">{aiAnalysis.viewingHabits.totalWatchTimeMinutes} minutes</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Créneau horaire favori :</span>
                      <span className="font-bold text-white">{aiAnalysis.viewingHabits.mostActiveTimeSlot}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Vitesse de lecture usuelle :</span>
                      <span className="font-bold text-[#ff0000]">{aiAnalysis.viewingHabits.playbackSpeedPreference}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Résolution préférée :</span>
                      <span className="font-bold text-white">{aiAnalysis.viewingHabits.preferredResolution}</span>
                    </div>

                    <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-gray-400 font-semibold">Indice de Confiance IA :</span>
                        <span className="font-bold text-purple-300">{aiAnalysis.recommendationConfidence}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${aiAnalysis.recommendationConfidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: REAL-TIME GLOBAL ACTIVITY STREAM */}
        {activeTab === 'activity_stream' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Journal d'Événements en Direct</h3>
              <p className="text-xs text-gray-400">
                Chaque interaction utilisateur met à jour automatiquement son dossier isolé privé.
              </p>
            </div>

            <div className="bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="divide-y divide-white/5 max-h-[580px] overflow-y-auto">
                {allPlatformActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    Aucune activité enregistrée pour le moment.
                  </div>
                ) : (
                  allPlatformActivities.map((act) => (
                    <div key={act.id} className="p-3.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={act.user.avatar}
                          alt={act.user.username}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                        />
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-2">
                            <span>{act.user.username}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                              {act.action}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {act.videoTitle ? (
                              <span>Vidéo : <strong className="text-gray-200">{act.videoTitle}</strong></span>
                            ) : act.searchQuery ? (
                              <span>Recherche : <strong className="text-gray-200">"{act.searchQuery}"</strong></span>
                            ) : (
                              <span>Action système</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-500 font-mono shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CHARTS & ANALYTICS */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 shadow-xl">
              <h4 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#ff0000]" />
                Répartition des Vues par Catégorie
              </h4>
              <div className="space-y-3">
                {[
                  { name: 'Cinéma & 3D', percent: 36, color: 'bg-red-500' },
                  { name: 'Tech & IA', percent: 28, color: 'bg-blue-500' },
                  { name: 'Développement', percent: 18, color: 'bg-emerald-500' },
                  { name: 'Nature & 4K', percent: 12, color: 'bg-amber-500' },
                  { name: 'Gaming & Lo-Fi', percent: 6, color: 'bg-purple-500' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 font-medium">{item.name}</span>
                      <span className="text-white font-bold">{item.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Rétention & Efficacité du Lecteur MK
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Métriques d'engagement recueillies lors des sessions de streaming.
                </p>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-xs text-gray-400 block mb-1">Double Clic ±10s</span>
                    <span className="text-xl font-black text-emerald-400">92%</span>
                    <span className="text-[10px] text-gray-500 block mt-1">utilisateurs fréquents</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-xs text-gray-400 block mb-1">Affichage Secondes</span>
                    <span className="text-xl font-black text-[#ff0000]">100%</span>
                    <span className="text-[10px] text-gray-500 block mt-1">précision à l'image</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-gray-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ff0000] shrink-0" />
                <span>Le panneau admin synchronise automatiquement chaque namespace en tâche de fond.</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
