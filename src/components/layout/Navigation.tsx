import React from 'react';
import {
  Home,
  Flame,
  Tv,
  Bookmark,
  User as UserIcon,
  Shield,
  Sparkles,
  Compass,
} from 'lucide-react';
import { User } from '../../types';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onOpenAdmin: () => void;
  onRequireAuth: (message: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenAdmin,
  onRequireAuth,
}) => {
  const navItems = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'trending', label: 'Tendances', icon: Flame },
    { id: 'subscriptions', label: 'Abonnements', icon: Tv, requiresAuth: true },
    { id: 'library', label: 'Bibliothèque', icon: Bookmark, requiresAuth: true },
    { id: 'profile', label: 'Profil', icon: UserIcon, requiresAuth: true },
  ];

  const handleItemClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !currentUser) {
      onRequireAuth(`Pour accéder à l'onglet "${item.label}", veuillez vous connecter ou créer un compte.`);
      return;
    }
    onNavigate(item.id);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR (Visible on md and above) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 fixed top-16 left-0 bottom-0 z-30 bg-[#0f0f0f] border-r border-white/10 p-3 overflow-y-auto select-none">
        
        {/* Main Section */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
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
        <div className="my-4 border-t border-white/10" />

        {/* AI & Discovery section */}
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
          <span>Découverte IA</span>
          <Sparkles className="w-3 h-3 text-[#ff0000]" />
        </div>

        <div className="p-3 bg-gradient-to-br from-[#1a1a1a] to-[#222222] border border-white/5 rounded-2xl mb-4 text-xs">
          <span className="font-bold text-white block mb-1">Moteur IA Personnalisé</span>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Recommandations ajustées en temps réel selon vos visionnages et interactions.
          </p>
        </div>

        {/* Admin Section (If logged in as admin) */}
        {currentUser?.role === 'admin' && (
          <div className="mt-auto pt-3 border-t border-white/10">
            <button
              onClick={onOpenAdmin}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold bg-[#ff0000]/15 text-[#ff4444] border border-[#ff0000]/30 hover:bg-[#ff0000]/25 transition-colors shadow-sm"
            >
              <Shield className="w-4 h-4 text-[#ff0000]" />
              <span>Tableau de Bord Admin</span>
            </button>
          </div>
        )}
      </aside>

      {/* MOBILE BOTTOM NAVIGATION (Visible below md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f0f0f]/95 backdrop-blur-lg border-t border-white/10 z-40 px-2 flex items-center justify-around select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[#ff0000]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
