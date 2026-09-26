import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Brain,
  FolderOpen,
  FileJson,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Search,
  TrendingUp,
  AlertTriangle,
  Globe,
  BarChart3,
  Wifi,
  Monitor,
  ShieldCheck,
  MapPin,
  Radio,
  UserCheck,
  Ban,
  X,
} from 'lucide-react';
import {
  User,
  UserGeoTelemetry,
  AIModerationIncident,
} from '../../types';
import {
  getStoredUsers,
  getUserFullNamespace,
  deleteUserAccount,
  getUserGeoTelemetry,
  getGlobalSiteTelemetrySummary,
  saveUserFile,
} from '../../storage/userNamespace';
import {
  generateUserAIAnalysis,
  UserAIAnalysis,
} from '../../services/recommendationEngine';
import {
  getModerationIncidents,
  clearModerationIncidents,
  moderateContentWithAI,
} from '../../services/aiModerationService';

export interface AdminDashboardProps {
  currentUser: User | null;
  onBackToSite?: () => void;
  onClose?: () => void;
  onSelectVideo?: (videoId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBackToSite,
  onClose,
  onSelectVideo,
}) => {
  const handleExit = () => {
    if (onClose) onClose();
    else if (onBackToSite) onBackToSite();
  };

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  // Top-level Admin view mode: 'per_user' | 'ai_moderation'
  const [adminSection, setAdminSection] = useState<'per_user' | 'ai_moderation'>('per_user');

  // Sub-tab inside "Chaque User Seul" inspection
  const [activeUserTab, setActiveUserTab] = useState<
    'dna_360' | 'hourly_solo' | 'geo_device' | 'ai_safety_solo' | 'activities' | 'files'
  >('dna_360');

  const [selectedFileKey, setSelectedFileKey] = useState<string>('telemetry.json');
  const [refreshTick, setRefreshTick] = useState(0);

  // Live AI Moderation Sandbox inside Admin
  const [testModerationInput, setTestModerationInput] = useState('');
  const [isTestingMod, setIsTestingMod] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    blocked: boolean;
    category: string;
    reason: string;
    confidence: number;
  } | null>(null);

  const loadAllUsers = () => {
    const list = getStoredUsers();
    setUsers(list);
    if (list.length > 0 && !selectedUser) {
      const nonAdmin = list.find(u => u.role !== 'admin') || list[0];
      setSelectedUser(nonAdmin);
    } else if (selectedUser) {
      const updated = list.find(u => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    }
    setRefreshTick(prev => prev + 1);
  };

  useEffect(() => {
    loadAllUsers();
  }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="max-w-xl w-full p-8 rounded-3xl bg-[#181818] border border-red-500/30 text-center">
          <AlertTriangle className="w-14 h-14 text-[#ff0000] mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">
            Accès Administrateur Restreint
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Cette console d'administration avancée est strictement réservée aux administrateurs système MK.
          </p>
          <button
            onClick={handleExit}
            className="px-6 py-2.5 rounded-full bg-[#ff0000] text-white text-xs font-bold cursor-pointer"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Compute real global site telemetry (countries %, 24h hourly usage, bandwidth, sessions)
  const globalSummary = getGlobalSiteTelemetrySummary();
  const allIncidents: AIModerationIncident[] = getModerationIncidents();
  const currentLiveHour = new Date().getHours();

  // Selected user data
  const userNamespace = selectedUser ? getUserFullNamespace(selectedUser.id) : null;
  const aiAnalysis: UserAIAnalysis | null = selectedUser
    ? generateUserAIAnalysis(selectedUser)
    : null;
  const userTelemetry: UserGeoTelemetry | null = selectedUser
    ? getUserGeoTelemetry(selectedUser.id)
    : null;
  const userIncidents = selectedUser
    ? allIncidents.filter(inc => inc.userId === selectedUser.id)
    : [];

  // Filter users in sidebar
  const filteredUsers = users.filter(u => {
    const tel = getUserGeoTelemetry(u.id);
    const matchesQuery =
      !userSearchFilter.trim() ||
      u.username.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
      tel.country.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
      tel.city.toLowerCase().includes(userSearchFilter.toLowerCase());
    const matchesCountry =
      countryFilter === 'ALL' || tel.countryCode === countryFilter;
    return matchesQuery && matchesCountry;
  });

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) return;
    deleteUserAccount(userId);
    const updated = getStoredUsers();
    setUsers(updated);
    setSelectedUser(updated[0] || null);
  };

  const handleResetUserTrust = (userId: string) => {
    const tel = getUserGeoTelemetry(userId);
    const updated: UserGeoTelemetry = {
      ...tel,
      trustScore: 100,
      isSuspended: false,
      suspensionReason: undefined,
    };
    saveUserFile(userId, 'telemetry.json', updated);
    setRefreshTick(t => t + 1);
  };

  const handleToggleRestrictUser = (userId: string) => {
    const tel = getUserGeoTelemetry(userId);
    const isRestricted = Boolean(tel.isSuspended);
    const updated: UserGeoTelemetry = {
      ...tel,
      trustScore: isRestricted ? 85 : 25,
      isSuspended: !isRestricted,
      suspensionReason: !isRestricted
        ? 'Compte restreint manuellement par l’administrateur.'
        : undefined,
    };
    saveUserFile(userId, 'telemetry.json', updated);
    setRefreshTick(t => t + 1);
  };

  const handleRunAdminModerationTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testModerationInput.trim()) return;
    setIsTestingMod(true);
    const res = await moderateContentWithAI({
      text: testModerationInput.trim(),
      source: 'search',
      user: selectedUser || currentUser,
    });
    setIsTestingMod(false);
    setLastTestResult({
      blocked: res.blocked,
      category: res.violationCategory,
      reason: res.reason,
      confidence: res.confidence,
    });
    setRefreshTick(t => t + 1);
  };

  const maxGlobalHourly = Math.max(1, ...globalSummary.hourlyUsage24h);

  const safetyStatusLabel = (tel: UserGeoTelemetry) => {
    if (tel.isSuspended || tel.trustScore <= 35) return 'restricted';
    if (tel.trustScore < 80) return 'warned';
    return 'clean';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0b0b]/95 backdrop-blur-xl overflow-y-auto">
      <div
        key={refreshTick}
        className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 text-white space-y-6"
      >
        {/* =====================================================================
            1. TOP HEADER & GLOBAL REAL-TIME TELEMETRY BAR
           ===================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff0000] to-red-900 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                  MK ULTRA ADMIN • TÉLÉMÉTRIE & IA SAFETY
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> VRAIES DONNÉES LIVE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Pourcentage des pays sur le site, nombre d'utilisations par heure (24h), blocage IA automatique & dossier complet de chaque utilisateur seul
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadAllUsers}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Actualiser les données</span>
            </button>

            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff0000] hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              {onClose ? <X className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>Retour au site</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. KPI SUMMARY STRIP (REAL DATA METRICS)
           ===================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/10">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Utilisateurs Totaux</span>
              <Users className="w-4 h-4 text-[#ff0000]" />
            </div>
            <div className="text-2xl font-black text-white">{globalSummary.totalUsers}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              100% profils isolés
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/10">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Pays Connectés</span>
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {globalSummary.countryStats.length} Pays
            </div>
            <div className="text-[11px] text-blue-400 font-semibold mt-0.5 truncate">
              Top 1 : {globalSummary.countryStats[0]?.flag}{' '}
              {globalSummary.countryStats[0]?.country} (
              {globalSummary.countryStats[0]?.percentage}%)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/10">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Utilisations / 24h</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {globalSummary.totalActions24h.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
              Heure actuelle ({String(currentLiveHour).padStart(2, '0')}h) :{' '}
              {globalSummary.hourlyUsage24h[currentLiveHour]} act.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/10">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Heure de Pointe</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {String(globalSummary.peakHour).padStart(2, '0')}h00
            </div>
            <div className="text-[11px] text-purple-400 font-semibold mt-0.5">
              Pic : {globalSummary.peakHourCount} utilisations/h
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/10">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Bande Passante</span>
              <Wifi className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {(globalSummary.totalBandwidthMB / 1024).toFixed(2)} Go
            </div>
            <div className="text-[11px] text-cyan-400 font-semibold mt-0.5">
              {globalSummary.totalSessions} sessions cumulées
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#161616] border border-red-500/30">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Blocages IA Auto</span>
              <ShieldCheck className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400">
              {allIncidents.length}
            </div>
            <div className="text-[11px] text-gray-300 font-semibold mt-0.5">
              Protection IA temps réel
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. ALWAYS-VISIBLE GLOBAL ANALYTICS: COUNTRIES (%) & 24H HOURLY USAGE
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT CARD (5 COLS): POURCENTAGE DES PAYS DANS LE SITE */}
          <div className="lg:col-span-5 p-5 rounded-3xl bg-[#161616] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white">
                      Pourcentage des Pays dans le Site
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      Répartition géographique réelle des utilisateurs & trafic
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                  100% Global
                </span>
              </div>

              <div className="space-y-3">
                {globalSummary.countryStats.map((stat, index) => (
                  <div
                    key={stat.countryCode}
                    onClick={() =>
                      setCountryFilter(
                        countryFilter === stat.countryCode ? 'ALL' : stat.countryCode
                      )
                    }
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      countryFilter === stat.countryCode
                        ? 'bg-blue-500/15 border-blue-500/50'
                        : 'bg-[#1f1f1f]/80 hover:bg-[#252525] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="text-base">{stat.flag}</span>
                        <span>
                          #{index + 1} {stat.country}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                          {stat.countryCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">
                          {stat.usersCount} user{stat.usersCount > 1 ? 's' : ''} •{' '}
                          {stat.activeSessions} sess.
                        </span>
                        <span className="text-sm font-black text-blue-400 font-mono">
                          {stat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff0000] via-amber-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${Math.max(4, stat.percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5">
                      <span className="truncate">
                        Villes : {stat.cities.join(', ')}
                      </span>
                      <span className="font-mono text-gray-300 shrink-0">
                        {stat.bandwidthMB} Mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {countryFilter !== 'ALL' && (
              <button
                onClick={() => setCountryFilter('ALL')}
                className="mt-3 w-full py-2 rounded-xl bg-blue-500/20 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-colors cursor-pointer"
              >
                Réinitialiser le filtre pays ({countryFilter})
              </button>
            )}
          </div>

          {/* RIGHT CARD (7 COLS): NOMBRE D'UTILISATIONS PAR HEURE (24H) */}
          <div className="lg:col-span-7 p-5 rounded-3xl bg-[#161616] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white">
                      Nombre d'Utilisations par Heure (00h00 – 23h00)
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      Fréquence réelle des sessions, visionnages, recherches et interactions par tranche horaire
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#ff0000] animate-ping" />
                    Heure Actuelle : {String(currentLiveHour).padStart(2, '0')}h00
                  </span>
                </div>
              </div>

              {/* 24-HOUR BAR CHART */}
              <div className="pt-6 pb-2 px-2 rounded-2xl bg-[#111111] border border-white/5 overflow-x-auto">
                <div className="grid grid-cols-24 min-w-[520px] items-end gap-1 sm:gap-1.5 h-44 px-1">
                  {globalSummary.hourlyUsage24h.map((count: number, hourIdx: number) => {
                    const heightPercent = Math.max(
                      8,
                      Math.round((count / maxGlobalHourly) * 100)
                    );
                    const isCurrentHour = hourIdx === currentLiveHour;
                    const isPeakHour = hourIdx === globalSummary.peakHour;

                    return (
                      <div
                        key={hourIdx}
                        className="flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 px-1.5 py-0.5 rounded bg-white text-black font-black text-[10px] whitespace-nowrap z-10 pointer-events-none shadow">
                          {String(hourIdx).padStart(2, '0')}h : {count} act.
                        </div>

                        {/* Value label on top of bar */}
                        <span
                          className={`text-[9px] font-mono mb-1 ${
                            isCurrentHour
                              ? 'text-[#ff0000] font-black'
                              : isPeakHour
                              ? 'text-amber-400 font-bold'
                              : 'text-gray-500'
                          }`}
                        >
                          {count}
                        </span>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isCurrentHour
                              ? 'bg-gradient-to-t from-[#ff0000] to-red-400 shadow-lg shadow-red-500/40 ring-1 ring-white/50'
                              : isPeakHour
                              ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                              : count > maxGlobalHourly * 0.65
                              ? 'bg-gradient-to-t from-blue-600 to-cyan-400 opacity-90 group-hover:opacity-100'
                              : 'bg-white/20 group-hover:bg-white/40'
                          }`}
                        />

                        {/* Hour label */}
                        <span
                          className={`text-[9px] font-mono mt-1.5 ${
                            isCurrentHour
                              ? 'text-[#ff0000] font-black'
                              : 'text-gray-400'
                          }`}
                        >
                          {String(hourIdx).padStart(2, '0')}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hourly insights footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-2xl bg-[#1c1c1c] border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">
                    Tranche Matinale (06h - 12h)
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {globalSummary.hourlyUsage24h
                      .slice(6, 12)
                      .reduce((a: number, b: number) => a + b, 0)}{' '}
                    utilisations
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Moyenne :{' '}
                    {Math.round(
                      globalSummary.hourlyUsage24h
                        .slice(6, 12)
                        .reduce((a: number, b: number) => a + b, 0) / 6
                    )}{' '}
                    / heure
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#1c1c1c] border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">
                    Après-Midi (12h - 18h)
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {globalSummary.hourlyUsage24h
                      .slice(12, 18)
                      .reduce((a: number, b: number) => a + b, 0)}{' '}
                    utilisations
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Moyenne :{' '}
                    {Math.round(
                      globalSummary.hourlyUsage24h
                        .slice(12, 18)
                        .reduce((a: number, b: number) => a + b, 0) / 6
                    )}{' '}
                    / heure
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-[10px] text-amber-300 uppercase font-bold">
                    Prime-Time Soirée (18h - 00h)
                  </div>
                  <div className="text-base font-black text-amber-400 mt-0.5">
                    {globalSummary.hourlyUsage24h
                      .slice(18, 24)
                      .reduce((a: number, b: number) => a + b, 0)}{' '}
                    utilisations
                  </div>
                  <div className="text-[11px] text-amber-200/80">
                    Pic maximal à {String(globalSummary.peakHour).padStart(2, '0')}h00 ({globalSummary.peakHourCount} act.)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. SECTION SWITCHER: PER-USER DEEP INSPECTION vs AI MODERATION CENTER
           ===================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAdminSection('per_user')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                adminSection === 'per_user'
                  ? 'bg-[#ff0000] text-white shadow-lg shadow-red-600/25'
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>INSPECTION AVANCÉE : CHAQUE USER SEUL ({users.length})</span>
            </button>

            <button
              onClick={() => setAdminSection('ai_moderation')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                adminSection === 'ai_moderation'
                  ? 'bg-[#ff0000] text-white shadow-lg shadow-red-600/25'
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>BOUCLIER IA & BLOCAGES AUTOMATIQUES ({allIncidents.length})</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff0000]" />
            <span>Sélectionnez un utilisateur pour isoler 100% de ses métriques personnelles</span>
          </div>
        </div>

        {/* =====================================================================
            SECTION A: AI MODERATION & AUTOMATIC BLOCKING CENTER
           ===================================================================== */}
        {adminSection === 'ai_moderation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LIVE AI MODERATION SANDBOX TESTER */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#ff0000]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Simulateur de Blocage IA en Direct
                  </h3>
                  <p className="text-xs text-gray-400">
                    Testez le moteur de blocage automatique (FR / EN / Arabe / Argot)
                  </p>
                </div>
              </div>

              <form onSubmit={handleRunAdminModerationTest} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">
                    Texte, recherche vocale ou commentaire à tester :
                  </label>
                  <input
                    type="text"
                    value={testModerationInput}
                    onChange={e => setTestModerationInput(e.target.value)}
                    placeholder="Ex: contenu +18, insulte, arnaque, violence..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-white/15 focus:border-[#ff0000] text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Tutoriel React 4K',
                    'Vidéo porno xxx +18',
                    'Comment pirater un compte',
                    'Je vais te tuer sale idiot',
                  ].map(sample => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setTestModerationInput(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isTestingMod || !testModerationInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#ff0000] hover:bg-red-700 disabled:opacity-40 text-white font-black text-xs cursor-pointer transition-colors"
                >
                  {isTestingMod
                    ? 'Analyse neuronale Gemini en cours...'
                    : 'Tester le Blocage Automatique IA'}
                </button>
              </form>

              {lastTestResult && (
                <div
                  className={`p-4 rounded-2xl border-2 space-y-1.5 ${
                    lastTestResult.blocked
                      ? 'bg-red-950/40 border-red-500/60 text-white'
                      : 'bg-emerald-950/30 border-emerald-500/50 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase ${
                        lastTestResult.blocked ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {lastTestResult.blocked
                        ? '⛔ CONTENU BLOQUÉ AUTOMATIQUEMENT'
                        : '✅ CONTENU AUTORISÉ PAR L’IA'}
                    </span>
                    <span className="text-xs font-mono text-gray-300">
                      Confiance : {lastTestResult.confidence}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-200">
                    Catégorie : <strong>{lastTestResult.category}</strong>
                  </div>
                  <p className="text-xs text-gray-300">{lastTestResult.reason}</p>
                </div>
              )}
            </div>

            {/* INCIDENTS LOG TABLE */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">
                    Journal Global des Contenus Bloqués ({allIncidents.length})
                  </h3>
                  <p className="text-xs text-gray-400">
                    Historique horodaté de toutes les tentatives inappropriées bloquées sur le site
                  </p>
                </div>
                {allIncidents.length > 0 && (
                  <button
                    onClick={() => {
                      clearModerationIncidents();
                      setRefreshTick(t => t + 1);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold cursor-pointer"
                  >
                    Purger l'historique
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {allIncidents.map(inc => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-2xl bg-[#1f1f1f] border border-red-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black uppercase">
                          {inc.violationCategory}
                        </span>
                        <span className="text-xs font-bold text-white">
                          Utilisateur : {inc.username}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Source : {inc.source}
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono">
                          IA {inc.confidence}%
                        </span>
                      </div>
                      <div className="text-xs text-red-200 font-mono bg-black/40 px-2.5 py-1 rounded-lg">
                        Contenu intercepté : "{inc.contentSnippet}"
                      </div>
                      <p className="text-[11px] text-gray-400">{inc.reason}</p>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono shrink-0">
                      {new Date(inc.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SECTION B: DEEP PER-USER DOSSIER ("CHAQUE USER SEUL")
           ===================================================================== */}
        {adminSection === 'per_user' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN (4 COLS): USER DIRECTORY WITH GEO & TRUST BADGES */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="p-4 rounded-3xl bg-[#161616] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-black text-sm text-white">
                    <Users className="w-4 h-4 text-[#ff0000]" />
                    <span>Sélectionner un Utilisateur ({filteredUsers.length})</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                    1 Dossier / User
                  </span>
                </div>

                {/* Search input inside user list */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchFilter}
                    onChange={e => setUserSearchFilter(e.target.value)}
                    placeholder="Filtrer par nom, email, pays, ville..."
                    className="w-full bg-[#111111] border border-white/10 focus:border-[#ff0000] rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {filteredUsers.map(u => {
                    const isSelected = selectedUser?.id === u.id;
                    const tel = getUserGeoTelemetry(u.id);
                    const uActivities =
                      getUserFullNamespace(u.id).activities?.length || 0;
                    const totalHourlyUser = tel.hourlyUsage.reduce(
                      (a: number, b: number) => a + b,
                      0
                    );

                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#ff0000]/20 to-transparent border-[#ff0000] shadow-lg'
                            : 'bg-[#1f1f1f] hover:bg-[#262626] border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={u.avatar}
                                alt={u.username}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/15"
                              />
                              <span
                                title={tel.country}
                                className="absolute -bottom-1 -right-1 text-xs"
                              >
                                {tel.flag}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white truncate">
                                  {u.username}
                                </span>
                                {u.role === 'admin' && (
                                  <span className="px-1.5 py-0.2 bg-[#ff0000] text-white rounded text-[9px] font-black uppercase">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 truncate">
                                {tel.city}, {tel.country} • {tel.deviceType}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                tel.trustScore >= 85
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : tel.trustScore >= 60
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              Trust {tel.trustScore}%
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {totalHourlyUser} act/24h • {uActivities} logs
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (8 COLS): ULTRA-ADVANCED SINGLE USER INSPECTOR */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {selectedUser && userNamespace && aiAnalysis && userTelemetry ? (
                <>
                  {/* SELECTED USER MASTER HEADER */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1b1b1b] via-[#161616] to-[#221212] border border-white/15 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={selectedUser.avatar}
                            alt={selectedUser.username}
                            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#ff0000]"
                          />
                          <span className="absolute -bottom-1.5 -right-1.5 text-xl bg-[#111] rounded-full px-1 border border-white/15">
                            {userTelemetry.flag}
                          </span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black text-white">
                              {selectedUser.username}
                            </h2>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                              {userTelemetry.flag} {userTelemetry.country} (
                              {userTelemetry.city})
                            </span>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                safetyStatusLabel(userTelemetry) === 'clean'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : safetyStatusLabel(userTelemetry) === 'warned'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}
                            >
                              Statut IA : {safetyStatusLabel(userTelemetry).toUpperCase()}
                            </span>
                          </div>

                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            ID: {selectedUser.id} • Email: {selectedUser.email} • IP:{' '}
                            {userTelemetry.ipMasked}
                          </p>

                          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff0000]/15 border border-[#ff0000]/30 text-xs font-bold text-[#ff6666]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Profil IA : {aiAnalysis.summaryPersona}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete or Restrict User controls */}
                      <div className="flex flex-wrap sm:flex-col items-end gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
                          Confiance IA : {aiAnalysis.recommendationConfidence}%
                        </div>
                        {selectedUser.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(selectedUser.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer ce compte</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* SINGLE USER 6-METRIC REAL TELEMETRY STRIP */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-4">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[10px] text-gray-400">Temps Visionné</div>
                        <div className="text-sm font-black text-white">
                          {aiAnalysis.viewingHabits.totalWatchTimeMinutes} min
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[10px] text-gray-400">Heure Pointe User</div>
                        <div className="text-sm font-black text-amber-400">
                          {String(aiAnalysis.viewingHabits.peakHourIndex).padStart(2, '0')}h00
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[10px] text-gray-400">Score Engagement</div>
                        <div className="text-sm font-black text-cyan-400">
                          {aiAnalysis.advancedMetrics.engagementIndex}/100
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[10px] text-gray-400">Taux Rétention</div>
                        <div className="text-sm font-black text-purple-400">
                          {aiAnalysis.advancedMetrics.retentionRate}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[10px] text-gray-400">Data Consommée</div>
                        <div className="text-sm font-black text-blue-400">
                          {userTelemetry.bandwidthMb} Mo
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-[10px] text-gray-400">Trust Score IA</div>
                        <div
                          className={`text-sm font-black ${
                            userTelemetry.trustScore >= 80
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {userTelemetry.trustScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUB-NAVIGATION TABS FOR THIS SINGLE USER */}
                  <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                    <button
                      onClick={() => setActiveUserTab('dna_360')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeUserTab === 'dna_360'
                          ? 'bg-[#ff0000] text-white shadow-md'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>ADN IA & Préférences</span>
                    </button>

                    <button
                      onClick={() => setActiveUserTab('hourly_solo')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeUserTab === 'hourly_solo'
                          ? 'bg-[#ff0000] text-white shadow-md'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Heures d'Utilisation (User Seul)</span>
                    </button>

                    <button
                      onClick={() => setActiveUserTab('geo_device')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeUserTab === 'geo_device'
                          ? 'bg-[#ff0000] text-white shadow-md'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Pays, IP & Matériel</span>
                    </button>

                    <button
                      onClick={() => setActiveUserTab('ai_safety_solo')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeUserTab === 'ai_safety_solo'
                          ? 'bg-[#ff0000] text-white shadow-md'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        Sécurité IA ({userIncidents.length} blocages)
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveUserTab('activities')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeUserTab === 'activities'
                          ? 'bg-[#ff0000] text-white shadow-md'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Historique ({userNamespace.activities?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveUserTab('files')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeUserTab === 'files'
                          ? 'bg-[#ff0000] text-white shadow-md'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Fichiers JSON Isolés</span>
                    </button>
                  </div>

                  {/* =========================================================
                      USER TAB 1: ADN IA & CE QU'IL AIME / DÉTESTE
                     ========================================================= */}
                  {activeUserTab === 'dna_360' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* WHAT USER LIKES */}
                        <div className="p-5 rounded-3xl bg-[#161616] border border-emerald-500/20">
                          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm mb-4">
                            <ThumbsUp className="w-4 h-4" />
                            <span>CE QUE {selectedUser.username.toUpperCase()} AIME</span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <span className="text-xs text-gray-400 block mb-1.5">
                                Catégories Préférées (Score d'Affinité IA) :
                              </span>
                              <div className="space-y-2">
                                {aiAnalysis.whatTheyLike.topCategories.map((cat, i) => (
                                  <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-white">
                                        {cat.category}
                                      </span>
                                      <span className="text-emerald-400 font-mono font-bold">
                                        +{cat.score} pts
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{
                                          width: `${Math.min(100, Math.max(15, cat.score * 3))}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/10">
                              <span className="text-xs text-gray-400 block mb-1.5">
                                Tags & Sujets Favoris :
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {aiAnalysis.whatTheyLike.preferredTags.map((t, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 text-xs text-gray-300">
                              <span className="text-gray-400">Rétention : </span>
                              <strong className="text-white">
                                {aiAnalysis.whatTheyLike.completionTendency}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* WHAT USER DISLIKES */}
                        <div className="p-5 rounded-3xl bg-[#161616] border border-red-500/20">
                          <div className="flex items-center gap-2 text-red-400 font-black text-sm mb-4">
                            <ThumbsDown className="w-4 h-4" />
                            <span>CE QUE {selectedUser.username.toUpperCase()} ÉVITE</span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <span className="text-xs text-gray-400 block mb-1.5">
                                Catégories & Formats Rejetés :
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {aiAnalysis.whatTheyDislike.avoidedCategories.map(
                                  (cat, i) => (
                                    <span
                                      key={i}
                                      className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-bold"
                                    >
                                      {cat}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/10">
                              <span className="text-xs text-gray-400 block mb-1.5">
                                Mots-clés filtrés négativement par l'IA :
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {aiAnalysis.whatTheyDislike.dislikedTags.map((t, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-xs"
                                  >
                                    -{t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 text-xs text-gray-300">
                              <span className="text-gray-400">Analyse du Zapping : </span>
                              <strong className="text-white">
                                {aiAnalysis.whatTheyDislike.bounceRateReason}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ADVANCED BEHAVIORAL SCORES FOR THIS USER */}
                      <div className="p-5 rounded-3xl bg-[#161616] border border-white/10">
                        <h3 className="text-xs font-black uppercase text-gray-400 mb-3">
                          Indicateurs Comportementaux Avancés (Calculés pour {selectedUser.username} seul)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                            <div className="text-[11px] text-gray-400">Vidéos Regardées</div>
                            <div className="text-lg font-black text-white">
                              {aiAnalysis.advancedMetrics.watchActionsCount}
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                            <div className="text-[11px] text-gray-400">J'aime & Favoris</div>
                            <div className="text-lg font-black text-emerald-400">
                              {aiAnalysis.advancedMetrics.likeActionsCount}
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                            <div className="text-[11px] text-gray-400">Recherches</div>
                            <div className="text-lg font-black text-blue-400">
                              {aiAnalysis.advancedMetrics.searchActionsCount}
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                            <div className="text-[11px] text-gray-400">Commentaires</div>
                            <div className="text-lg font-black text-amber-400">
                              {aiAnalysis.advancedMetrics.commentActionsCount}
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                            <div className="text-[11px] text-gray-400">Score Binge-Watch</div>
                            <div className="text-lg font-black text-purple-400">
                              {aiAnalysis.advancedMetrics.bingeScore}/100
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      USER TAB 2: HEURES D'UTILISATION DE CET UTILISATEUR SEUL
                     ========================================================= */}
                  {activeUserTab === 'hourly_solo' && (
                    <div className="p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-black text-white">
                            Courbe d'Utilisation Horaire 24h — {selectedUser.username} Seul
                          </h3>
                          <p className="text-xs text-gray-400">
                            Répartition exacte des actions de {selectedUser.username} heure par heure (Fuseau : {userTelemetry.timezone})
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                          Créneau favori : {aiAnalysis.viewingHabits.mostActiveTimeSlot}
                        </span>
                      </div>

                      {/* 24H BAR CHART FOR THIS USER ONLY */}
                      {(() => {
                        const soloHourly = aiAnalysis.advancedMetrics.hourlyDistribution;
                        const maxSolo = Math.max(1, ...soloHourly);
                        return (
                          <div className="pt-6 pb-3 px-3 rounded-2xl bg-[#111111] border border-white/5 overflow-x-auto">
                            <div className="grid grid-cols-24 min-w-[520px] items-end gap-1 sm:gap-1.5 h-44">
                              {soloHourly.map((val: number, hIdx: number) => {
                                const pct = Math.max(8, Math.round((val / maxSolo) * 100));
                                const isPeak = hIdx === aiAnalysis.viewingHabits.peakHourIndex;
                                return (
                                  <div
                                    key={hIdx}
                                    className="flex flex-col items-center justify-end h-full group relative"
                                  >
                                    <span
                                      className={`text-[9px] font-mono mb-1 ${
                                        isPeak ? 'text-amber-400 font-black' : 'text-gray-500'
                                      }`}
                                    >
                                      {val}
                                    </span>
                                    <div
                                      style={{ height: `${pct}%` }}
                                      className={`w-full rounded-t-md transition-all ${
                                        isPeak
                                          ? 'bg-gradient-to-t from-[#ff0000] to-amber-400 shadow-md shadow-red-500/30'
                                          : val > 0
                                          ? 'bg-gradient-to-t from-purple-600 to-blue-400'
                                          : 'bg-white/10'
                                      }`}
                                    />
                                    <span className="text-[9px] font-mono text-gray-400 mt-1.5">
                                      {String(hIdx).padStart(2, '0')}h
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-[#1f1f1f]">
                          <div className="text-xs text-gray-400">Sessions Totales</div>
                          <div className="text-lg font-black text-white">
                            {userTelemetry.sessionsCount} sessions
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#1f1f1f]">
                          <div className="text-xs text-gray-400">Durée Moyenne / Vidéo</div>
                          <div className="text-lg font-black text-white">
                            {aiAnalysis.viewingHabits.averageVideoDurationMinutes} min
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#1f1f1f]">
                          <div className="text-xs text-gray-400">Vitesse & Qualité</div>
                          <div className="text-lg font-black text-[#ff0000]">
                            {aiAnalysis.viewingHabits.preferredResolution} •{' '}
                            {aiAnalysis.viewingHabits.playbackSpeedPreference}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      USER TAB 3: GÉOLOCALISATION, IP, RÉSEAU & MATÉRIEL
                     ========================================================= */}
                  {activeUserTab === 'geo_device' && (
                    <div className="p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#ff0000]" />
                        <span>
                          Empreinte Géographique, Réseau & Matériel — {selectedUser.username}
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-white/5">
                          <div className="text-xs text-gray-400 mb-1">Pays & Ville</div>
                          <div className="text-base font-black text-white flex items-center gap-2">
                            <span className="text-xl">{userTelemetry.flag}</span>
                            <span>
                              {userTelemetry.country} — {userTelemetry.city}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1 font-mono">
                            Code ISO : {userTelemetry.countryCode}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-white/5">
                          <div className="text-xs text-gray-400 mb-1">
                            Adresse IP & Protocole
                          </div>
                          <div className="text-base font-black text-cyan-400 font-mono">
                            {userTelemetry.ipMasked}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Flux Fibre / 5G Haut Débit
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-white/5">
                          <div className="text-xs text-gray-400 mb-1">Fuseau Horaire & Langue</div>
                          <div className="text-base font-black text-white">
                            {userTelemetry.timezone}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Locale : {userTelemetry.language}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-white/5">
                          <div className="text-xs text-gray-400 mb-1">Système & Navigateur</div>
                          <div className="text-base font-black text-white">
                            {userTelemetry.os}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Navigateur : {userTelemetry.browser} ({userTelemetry.deviceType})
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-white/5">
                          <div className="text-xs text-gray-400 mb-1">Résolution d'Écran</div>
                          <div className="text-base font-black text-amber-400 font-mono">
                            {userTelemetry.screenResolution}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Qualité flux : {aiAnalysis.viewingHabits.preferredResolution}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-white/5">
                          <div className="text-xs text-gray-400 mb-1">
                            Bande Passante Consommée
                          </div>
                          <div className="text-base font-black text-emerald-400 font-mono">
                            {userTelemetry.bandwidthMb} Mo
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Sessions enregistrées : {userTelemetry.sessionsCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      USER TAB 4: SÉCURITÉ IA & BLOCAGES DE CET UTILISATEUR SEUL
                     ========================================================= */}
                  {activeUserTab === 'ai_safety_solo' && (
                    <div className="p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black text-white">
                            Dossier de Sécurité IA — {selectedUser.username}
                          </h3>
                          <p className="text-xs text-gray-400">
                            Indice de confiance, infractions détectées par l'IA et contrôle d'accès individuel
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResetUserTrust(selectedUser.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Réhabiliter (Trust 100%)</span>
                          </button>

                          <button
                            onClick={() => handleToggleRestrictUser(selectedUser.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>
                              {userTelemetry.isSuspended
                                ? 'Lever la restriction'
                                : 'Restreindre ce compte'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-2xl bg-[#1f1f1f]">
                          <div className="text-xs text-gray-400">Indice de Confiance</div>
                          <div className="text-2xl font-black text-emerald-400">
                            {userTelemetry.trustScore}%
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#1f1f1f]">
                          <div className="text-xs text-gray-400">Tentatives Bloquées</div>
                          <div className="text-2xl font-black text-red-400">
                            {userIncidents.length}
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#1f1f1f]">
                          <div className="text-xs text-gray-400">Statut Modération</div>
                          <div className="text-lg font-black text-white uppercase">
                            {safetyStatusLabel(userTelemetry)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-300">
                          Incidents IA enregistrés pour {selectedUser.username} ({userIncidents.length}) :
                        </h4>
                        {userIncidents.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                            Aucune violation détectée pour cet utilisateur. Comportement conforme.
                          </div>
                        ) : (
                          userIncidents.map(inc => (
                            <div
                              key={inc.id}
                              className="p-3 rounded-xl bg-[#1f1f1f] border border-red-500/30 flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span className="font-bold text-red-400">
                                  [{inc.violationCategory}]
                                </span>{' '}
                                <span className="text-white font-mono">
                                  "{inc.contentSnippet}"
                                </span>
                                <div className="text-[11px] text-gray-400">{inc.reason}</div>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(inc.timestamp).toLocaleTimeString('fr-FR')}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      USER TAB 5: HISTORIQUE D'ACTIVITÉ TEMPS RÉEL
                     ========================================================= */}
                  {activeUserTab === 'activities' && (
                    <div className="p-5 rounded-3xl bg-[#161616] border border-white/10">
                      <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#ff0000]" />
                        <span>
                          Journal d'Activité Chronologique de {selectedUser.username}
                        </span>
                      </h3>

                      {!userNamespace.activities ||
                      userNamespace.activities.length === 0 ? (
                        <p className="text-xs text-gray-500 py-8 text-center">
                          Aucune activité enregistrée pour cet utilisateur.
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                          {userNamespace.activities.map(act => (
                            <div
                              key={act.id}
                              onClick={() => {
                                if (act.videoId && onSelectVideo) {
                                  onSelectVideo(act.videoId);
                                }
                              }}
                              className={`p-3 rounded-xl bg-[#1f1f1f] border border-white/5 flex items-center justify-between gap-3 text-xs ${
                                act.videoId && onSelectVideo
                                  ? 'hover:border-[#ff0000]/40 cursor-pointer'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                    act.action === 'like'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : act.action === 'dislike' || act.action === 'ai_blocked'
                                      ? 'bg-red-500/20 text-red-400'
                                      : act.action === 'search' || act.action === 'voice_search'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : act.action === 'download'
                                      ? 'bg-purple-500/20 text-purple-400'
                                      : 'bg-white/10 text-gray-300'
                                  }`}
                                >
                                  {act.action}
                                </span>
                                <div>
                                  {act.videoTitle && (
                                    <span className="font-bold text-white">
                                      {act.videoTitle}
                                    </span>
                                  )}
                                  {act.searchQuery && (
                                    <span className="font-bold text-blue-300">
                                      Recherche : "{act.searchQuery}"
                                    </span>
                                  )}
                                  {act.category && (
                                    <span className="text-gray-400 ml-2">
                                      ({act.category})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-gray-500 shrink-0 font-mono">
                                {new Date(act.timestamp).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* =========================================================
                      USER TAB 6: FICHIERS JSON ISOLÉS DANS SON DOSSIER
                     ========================================================= */}
                  {activeUserTab === 'files' && (
                    <div className="p-5 rounded-3xl bg-[#161616] border border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                          <FolderOpen className="w-4 h-4 text-amber-400" />
                          <span>{userNamespace.directoryPath}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'telemetry.json',
                            'profile.json',
                            'preferences.json',
                            'activities.json',
                            'favorites.json',
                          ].map(fileName => (
                            <button
                              key={fileName}
                              onClick={() => setSelectedFileKey(fileName)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                                selectedFileKey === fileName
                                  ? 'bg-[#ff0000] text-white font-bold'
                                  : 'bg-[#222222] text-gray-400 hover:text-white'
                              }`}
                            >
                              <FileJson className="w-3 h-3" />
                              <span>{fileName}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[420px]">
                        <pre>
                          {JSON.stringify(
                            selectedFileKey === 'telemetry.json'
                              ? userNamespace.telemetry
                              : selectedFileKey === 'profile.json'
                              ? userNamespace.profile
                              : selectedFileKey === 'preferences.json'
                              ? userNamespace.preferences
                              : selectedFileKey === 'activities.json'
                              ? userNamespace.activities
                              : userNamespace.favorites,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  Sélectionnez un utilisateur à gauche pour inspecter son dossier individuel.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
