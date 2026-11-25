import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  Workflow,
  Users,
  SlidersHorizontal,
  GitBranch,
  Cog,
} from 'lucide-react';
import { Collaborator } from '../types/process';
import * as api from '../services/api';

interface AuthLoginScreenProps {
  onAuthenticated: (user: Collaborator) => void;
}

export const AuthLoginScreen: React.FC<AuthLoginScreenProps> = ({
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { user } = await api.loginUser(email.trim(), password);
        onAuthenticated(user);
      } else {
        const { user } = await api.registerUser({
          name: name.trim(),
          email: email.trim(),
          password,
          roleTitle: roleTitle.trim() || 'Collaborateur',
        });
        onAuthenticated(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F5F5F7] grid grid-cols-1 lg:grid-cols-2 selection:bg-[#007AFF]/15 overflow-x-hidden">
      {/* LEFT PANEL — Apple HIG Frosted-Glass Editorial Showcase (50%) */}
      <div
        className="hidden lg:flex relative items-center justify-center p-10 xl:p-14 overflow-hidden"
        style={{
          background: `
            radial-gradient(560px 420px at 14% 16%, rgba(90, 200, 250, 0.28), transparent 72%),
            radial-gradient(640px 480px at 88% 24%, rgba(175, 82, 222, 0.22), transparent 70%),
            radial-gradient(520px 380px at 70% 92%, rgba(52, 199, 89, 0.14), transparent 72%),
            #F4F5F9
          `,
        }}
      >
        <div className="w-full max-w-[600px] bg-white/80 backdrop-blur-2xl rounded-[28px] border border-white/90 shadow-[0_28px_70px_-24px_rgba(15,23,42,0.14)] p-9 xl:p-11 flex flex-col gap-7">
          {/* Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#1F93FF] text-white flex items-center justify-center shadow-sm">
              <Workflow className="w-5 h-5" />
            </div>
            <span className="text-[16px] font-semibold tracking-tight text-[#1D1D1F]">
              Process Architect
            </span>
          </div>

          {/* Editorial Headline */}
          <div>
            <h1 className="text-[32px] xl:text-[36px] leading-[1.12] font-bold tracking-[-0.025em] text-[#1D1D1F]">
              Modélisez, auditez et simulez vos processus BPMN 2.0.
            </h1>
            <p className="text-[15px] leading-relaxed text-[#6E6E73] mt-3 max-w-[460px]">
              La plateforme collaborative qui réunit vos équipes métier et vos agents IA.
            </p>
          </div>

          {/* Floating Mini BPMN 2.0 Preview Card */}
          <div className="relative bg-white/95 rounded-2xl border border-black/[0.06] shadow-[0_14px_34px_-16px_rgba(15,23,42,0.14)] px-5 py-7">
            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-white border border-black/[0.08] shadow-xs text-[11px] font-semibold text-[#1D1D1F]">
              5 Agents IA · Export BPMN 2.0
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {/* Start Event */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full border-2 border-[#34C759] bg-[#34C759]/10" />
              </div>

              {/* Arrow 1 */}
              <div className="h-[1.5px] flex-1 bg-slate-300 relative min-w-[16px]">
                <span className="absolute -right-0.5 -top-[3.5px] w-2 h-2 border-t-[1.5px] border-r-[1.5px] border-slate-400 rotate-45" />
              </div>

              {/* User Task Card */}
              <div className="relative w-[108px] rounded-xl border border-[#007AFF]/35 bg-[#007AFF]/[0.04] px-2.5 py-2.5 shrink-0">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-semibold whitespace-nowrap">
                  Conforme
                </span>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-4 h-4 rounded bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center">
                    <User className="w-2.5 h-2.5" />
                  </span>
                  <span className="h-1.5 w-12 rounded-full bg-slate-300" />
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-200" />
                  <div className="h-1.5 w-2/3 rounded-full bg-slate-200/80" />
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="h-[1.5px] flex-1 bg-slate-300 relative min-w-[14px]">
                <span className="absolute -right-0.5 -top-[3.5px] w-2 h-2 border-t-[1.5px] border-r-[1.5px] border-slate-400 rotate-45" />
              </div>

              {/* XOR Diamond Gateway */}
              <div className="w-9 h-9 rounded-md rotate-45 border-[1.5px] border-amber-400 bg-amber-50 flex items-center justify-center shrink-0 shadow-2xs">
                <span className="-rotate-45 text-[14px] font-bold text-amber-700 leading-none">
                  ×
                </span>
              </div>

              {/* Arrow 3 */}
              <div className="h-[1.5px] flex-1 bg-slate-300 relative min-w-[14px]">
                <span className="absolute -right-0.5 -top-[3.5px] w-2 h-2 border-t-[1.5px] border-r-[1.5px] border-slate-400 rotate-45" />
              </div>

              {/* Service Task Card */}
              <div className="relative w-[108px] rounded-xl border border-purple-400/40 bg-purple-500/[0.04] px-2.5 py-2.5 shrink-0">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[9.5px] font-semibold whitespace-nowrap">
                  Seuil / Escalade
                </span>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-4 h-4 rounded bg-purple-500/15 text-purple-600 flex items-center justify-center">
                    <Cog className="w-2.5 h-2.5" />
                  </span>
                  <span className="h-1.5 w-12 rounded-full bg-slate-300" />
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-200" />
                  <div className="h-1.5 w-3/4 rounded-full bg-slate-200/80" />
                </div>
              </div>

              {/* Arrow 4 */}
              <div className="h-[1.5px] flex-1 bg-slate-300 relative min-w-[14px]">
                <span className="absolute -right-0.5 -top-[3.5px] w-2 h-2 border-t-[1.5px] border-r-[1.5px] border-slate-400 rotate-45" />
              </div>

              {/* End Event (Thick BPMN border) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full border-[4px] border-[#248A3D] bg-[#34C759]/10" />
              </div>
            </div>
          </div>

          {/* 3-Pillar Feature Strip */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-black/[0.06]">
            <div className="flex items-start gap-2.5">
              <GitBranch className="w-4 h-4 text-[#6E6E73] mt-0.5 shrink-0" />
              <div>
                <div className="text-[12.5px] font-semibold text-[#1D1D1F]">BPMN 2.0</div>
                <div className="text-[11px] text-[#6E6E73]">ISO 19510</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 border-l border-black/[0.06] pl-4">
              <Users className="w-4 h-4 text-[#6E6E73] mt-0.5 shrink-0" />
              <div>
                <div className="text-[12.5px] font-semibold text-[#1D1D1F]">5 Agents IA</div>
                <div className="text-[11px] text-[#6E6E73]">collaborateurs</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 border-l border-black/[0.06] pl-4">
              <SlidersHorizontal className="w-4 h-4 text-[#6E6E73] mt-0.5 shrink-0" />
              <div>
                <div className="text-[12.5px] font-semibold text-[#1D1D1F]">Simulation</div>
                <div className="text-[11px] text-[#6E6E73]">& Recette</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Pure Frosted-White Auth Card (50%) */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-[#FAFAFC]">
        <div className="w-full max-w-[400px] bg-white rounded-3xl border border-black/[0.07] shadow-[0_20px_50px_-24px_rgba(15,23,42,0.14)] p-8">
          {/* Mobile-only Brand Header */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#1F93FF] text-white flex items-center justify-center shadow-sm">
              <Workflow className="w-5 h-5" />
            </div>
            <span className="text-[16px] font-semibold text-[#1D1D1F]">
              Process Architect
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-[24px] font-bold tracking-tight text-[#1D1D1F]">
              {mode === 'login' ? 'Bienvenue' : 'Créer un compte'}
            </h2>
            <p className="text-[13px] text-[#6E6E73] mt-1">
              {mode === 'login'
                ? 'Connectez-vous ou créez votre compte collaborateur'
                : 'Rejoignez votre espace Process Architect'}
            </p>
          </div>

          {/* Apple Segmented Control */}
          <div className="grid grid-cols-2 p-1 rounded-full bg-[#F2F2F7] border border-black/[0.05] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-1.5 rounded-full text-[12.5px] font-semibold transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#1D1D1F] shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-1.5 rounded-full text-[12.5px] font-semibold transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#1D1D1F] shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold text-[#1D1D1F] mb-1.5">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex. Nadia Laurent"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F5F5F7]/80 border border-black/[0.09] text-[13.5px] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#007AFF] focus:ring-3 focus:ring-[#007AFF]/15 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#1D1D1F] mb-1.5">
                    Fonction <span className="font-normal text-[#86868B]">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="Ex. Chef de Projet MOA"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F5F5F7]/80 border border-black/[0.09] text-[13.5px] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#007AFF] focus:ring-3 focus:ring-[#007AFF]/15 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[12px] font-semibold text-[#1D1D1F] mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@organisation.fr"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F5F5F7]/80 border border-black/[0.09] text-[13.5px] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#007AFF] focus:ring-3 focus:ring-[#007AFF]/15 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#1D1D1F] mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F5F5F7]/80 border border-black/[0.09] text-[13.5px] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#007AFF] focus:ring-3 focus:ring-[#007AFF]/15 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-60 text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>
                {loading
                  ? 'Vérification...'
                  : mode === 'login'
                  ? 'Se connecter'
                  : 'Créer mon compte'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
