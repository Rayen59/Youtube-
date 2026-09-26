import React from 'react';
import {
  Home,
  Flame,
  Tv,
  Bookmark,
  User as UserIcon,
  Shield,
  Sparkles,
  Plus,
  PlaySquare,
} from 'lucide-react';
import { User } from '../../types';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onOpenAdmin: () => void;
  onRequireAuth: (message: string) => void;
  onOpenCreateModal?: () => void;
  watchControlsVisible?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenAdmin,
  onRequireAuth,
  onOpenCreateModal,
  watchControlsVisible = false,
}) => {
  const desktopNavItems = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'trending', label: 'Tendances', icon: Flame },
    { id: 'subscriptions', label: 'Abonnements', icon: Tv },
    { id: 'library', label: 'Bibliothèque', icon: Bookmark },
    { id: 'profile', label: 'Profil & Statistiques', icon: UserIcon },
  ];

  const handleItemClick = (id: string, requiresAuth = false, label = '') => {
    if (requiresAuth && !currentUser) {
      onRequireAuth(`Pour accéder à l'onglet "${label}", veuillez vous connecter ou créer un compte.`);
      return;
    }
    onNavigate(id);
  };

  return (
    <>
      {/* ========================================================
          DESKTOP SIDEBAR (Visible on md and above)
         ======================================================== */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 fixed top-14 sm:top-16 left-0 bottom-0 z-30 bg-[#0f0f0f] border-r border-[#282828] p-3 overflow-y-auto select-none">
        
        {/* Main Navigation Links */}
        <div className="space-y-1">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id, false, item.label)}
                className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ff0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.35)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-[#282828]" />

        {/* AI & Discovery section */}
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
          <span>Découverte IA</span>
          <Sparkles className="w-3 h-3 text-[#ff0000]" />
        </div>

        <div className="p-3 bg-[#181818] border border-white/5 rounded-2xl mb-4 text-xs">
          <span className="font-bold text-white block mb-1">Moteur IA Personnalisé</span>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Recommandations ajustées en temps réel selon vos visionnages et interactions.
          </p>
        </div>

        {/* Admin Section (If logged in as admin) */}
        {currentUser?.role === 'admin' && (
          <div className="mt-auto pt-3 border-t border-[#282828]">
            <button
              onClick={onOpenAdmin}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold bg-[#ff0000]/15 text-[#ff4444] border border-[#ff0000]/30 hover:bg-[#ff0000]/25 transition-colors shadow-sm cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#ff0000]" />
              <span>Tableau de Bord Admin</span>
            </button>
          </div>
        )}
      </aside>

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION (EXACT REPLICA OF SCREENSHOT 2)
          Hides automatically on video open, appears when user clicks video!
          Accueil | Shorts | (+) | Abonnements | Vous
         ======================================================== */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0f0f0f] border-t border-[#282828] z-40 px-2 flex items-center justify-around select-none transition-all duration-300 ${
          currentView === 'watch' && !watchControlsVisible
            ? 'translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        
        {/* 1. ACCUEIL */}
        <button
          onClick={() => handleItemClick('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            currentView === 'home' ? 'text-white' : 'text-zinc-400'
          }`}
        >
          <Home className={`w-5 h-5 ${currentView === 'home' ? 'text-white fill-white' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-medium mt-0.5">Accueil</span>
        </button>

        {/* 2. TENDANCES */}
        <button
          onClick={() => handleItemClick('trending')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            currentView === 'trending' ? 'text-white' : 'text-zinc-400'
          }`}
        >
          <Flame className={`w-5 h-5 ${currentView === 'trending' ? 'text-white fill-[#ff0000]' : 'text-zinc-400'}`} />
          <span className="text-[10px] font-medium mt-0.5">Tendances</span>
        </button>

        {/* 3. CENTER PLUS (+) BUTTON FOR CREATION (SCREENSHOT 2) */}
        <div className="flex items-center justify-center flex-1 py-1">
          <button
            onClick={() => {
              if (onOpenCreateModal) {
                onOpenCreateModal();
              }
            }}
            className="w-9 h-9 rounded-full bg-[#272727] hover:bg-[#333333] border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shadow-md"
            title="Créer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. ABONNEMENTS */}
        <button
          onClick={() => handleItemClick('subscriptions')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer relative ${
            currentView === 'subscriptions' ? 'text-white' : 'text-zinc-400'
          }`}
        >
          <div className="relative">
            <PlaySquare className={`w-5 h-5 ${currentView === 'subscriptions' ? 'text-white' : 'text-zinc-400'}`} />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Abonnements</span>
        </button>

        {/* 5. VOUS / PROFIL */}
        <button
          onClick={() => handleItemClick('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            currentView === 'profile' ? 'text-white' : 'text-zinc-400'
          }`}
        >
          {currentUser ? (
            <img
              src={currentUser.avatar}
              alt=""
              className={`w-5 h-5 rounded-full object-cover ring-1 ${
                currentView === 'profile' ? 'ring-white' : 'ring-zinc-600'
              }`}
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#6a1b9a] text-white text-[11px] font-bold flex items-center justify-center">
              V
            </div>
          )}
          <span className="text-[10px] font-medium mt-0.5">Vous</span>
        </button>

      </nav>
    </>
  );
};
