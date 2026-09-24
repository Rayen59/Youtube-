import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { registerUser, authenticateUser, saveSession } from '../../storage/userNamespace';
import { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
  restrictionMessage?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  restrictionMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let authenticatedUser: User;
      if (mode === 'register') {
        if (!username.trim() || !email.trim() || !password) {
          throw new Error('Veuillez remplir tous les champs obligatoires.');
        }
        if (password.length < 6) {
          throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
        }
        authenticatedUser = await registerUser(username, email, password);
      } else {
        const identifier = email || username;
        if (!identifier.trim() || !password) {
          throw new Error('Veuillez saisir votre identifiant (nom ou email) et mot de passe.');
        }
        authenticatedUser = await authenticateUser(identifier, password);
      }

      saveSession(authenticatedUser);
      onSuccess(authenticatedUser);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur inattendue est survenue.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-10 bg-gradient-to-r from-[#ff0000] to-[#b80000] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.4)] mb-3">
            <span className="font-black text-white text-xl tracking-tight">MK</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {mode === 'login' ? 'Connexion à votre compte' : 'Créer un compte MK'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login'
              ? 'Accédez à vos recommandations personnalisées et vos favoris'
              : 'Rejoignez la communauté pour interagir, enregistrer et télécharger'}
          </p>
        </div>

        {/* Restriction alert banner if opened because of guest action */}
        {restrictionMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-[#ff0000]/15 border border-[#ff0000]/30 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#ff0000] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">Action réservée aux membres</span>
              <span>{restrictionMessage}</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex : AlexandreDev"
                  className="w-full bg-[#242424] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              {mode === 'login' ? 'Email ou Nom d\'utilisateur' : 'Adresse Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={mode === 'register' ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'Votre email ou nom de compte' : 'nom@exemple.com'}
                className="w-full bg-[#242424] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#242424] border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#ff0000] hover:bg-[#d60000] active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              'Se connecter'
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-400">
          {mode === 'login' ? (
            <span>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-[#ff0000] font-bold hover:underline"
              >
                Créer un compte gratuitement
              </button>
            </span>
          ) : (
            <span>
              Vous possédez déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-[#ff0000] font-bold hover:underline"
              >
                Connectez-vous
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
