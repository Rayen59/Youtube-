import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  FileCode,
  Lock,
  Download,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { User } from '../../types';
import { getUserFile } from '../../storage/userNamespace';

interface UserProfileViewProps {
  currentUser: User | null;
  onRequireAuth: (message: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  onRequireAuth,
}) => {
  const [activeFile, setActiveFile] = useState<'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json'>('profile.json');

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-white">
        <UserIcon className="w-12 h-12 text-[#ff0000] mx-auto mb-3" />
        <h2 className="text-xl font-black mb-2">Espace Utilisateur Privé</h2>
        <p className="text-xs text-gray-400 mb-6">
          Veuillez vous connecter pour accéder à vos données de profil et inspecter votre dossier isolé.
        </p>
        <button
          onClick={() => onRequireAuth('Connectez-vous pour accéder à votre profil.')}
          className="px-6 py-2.5 bg-[#ff0000] text-white font-bold text-xs rounded-full"
        >
          Se connecter
        </button>
      </div>
    );
  }

  const fileContent = getUserFile(currentUser.id, activeFile);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(fileContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentUser.username}_${activeFile}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 text-white space-y-6">
      
      {/* Profile Header */}
      <div className="p-6 bg-[#181818] border border-white/10 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <img
            src={currentUser.avatar}
            alt={currentUser.username}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-[#ff0000]"
          />
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-black text-white">{currentUser.username}</h1>
              {currentUser.role === 'admin' ? (
                <span className="text-[10px] bg-[#ff0000] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  ADMINISTRATEUR
                </span>
              ) : (
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-semibold">
                  MEMBRE MK
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{currentUser.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-gray-500 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Membre depuis le {new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs text-emerald-300">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Namespace privé & chiffré</span>
        </div>
      </div>

      {/* ISOLATED NAMESPACE INSPECTOR */}
      <div className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-[#202020] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#ff0000]" />
              Mon Dossier Isolé : <code className="text-xs font-mono text-gray-300">/users/{currentUser.id}/</code>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Chaque utilisateur possède son propre espace de stockage privé et isolé. Aucun accès croisé.
            </p>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter {activeFile}</span>
          </button>
        </div>

        {/* Tab buttons for 4 files */}
        <div className="flex border-b border-white/10 bg-[#161616] px-4 overflow-x-auto">
          {(['profile.json', 'activities.json', 'preferences.json', 'favorites.json'] as const).map(file => (
            <button
              key={file}
              onClick={() => setActiveFile(file)}
              className={`py-3 px-4 text-xs font-mono font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeFile === file
                  ? 'border-[#ff0000] text-[#ff0000]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <span>{file}</span>
            </button>
          ))}
        </div>

        {/* File Content Preview */}
        <div className="p-4 bg-[#111111] max-h-96 overflow-y-auto">
          <pre className="text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto selection:bg-[#ff0000]/30">
            {JSON.stringify(fileContent, null, 2)}
          </pre>
        </div>
      </div>

    </div>
  );
};
