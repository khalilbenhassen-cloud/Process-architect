import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Bot, Trash2, Check } from 'lucide-react';
import { AIProviderConfig, Collaborator, Team } from '../../types/process';
import * as api from '../../services/api';

interface AIAgentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentToEdit: Collaborator | null;
  teams: Team[];
  onSaveAgent: (payload: {
    id?: string;
    name: string;
    handle: string;
    roleTitle: string;
    teamId?: string | null;
    avatarInitials: string;
    avatarColor: string;
    aiSpecialty: string;
    aiProviderModel: string;
    systemPrompt: string;
    aiCapabilities: string[];
  }) => Promise<void>;
  onDeleteAgent?: (agentId: string) => Promise<void>;
}

const CAPABILITY_OPTIONS = [
  {
    id: 'model_steps',
    label: 'Générer / modifier des étapes du diagramme',
    desc: 'Transforme un besoin exprimé en texte en activités, décisions et connecteurs.',
  },
  {
    id: 'audit_rules',
    label: 'Créer / auditer des règles de gestion (RG-*)',
    desc: 'Vérifie la cohérence structurelle du flux et rédige des règles métier.',
  },
  {
    id: 'generate_tests',
    label: 'Générer des scénarios de test QA & couverture',
    desc: 'Génère les cas de test nominaux/erreurs et contrôle la couverture des règles.',
  },
  {
    id: 'summarize_and_schedule',
    label: 'Synthétiser les échanges & préparer des réunions Outlook',
    desc: 'Synthétise les échanges entre collaborateurs, structure les comptes-rendus et prépare les invitations Microsoft Outlook.',
  },
];

const AGENT_COLORS = ['#1F93FF', '#7C3AED', '#D97706', '#059669', '#0284C7', '#EC4899', '#4F46E5'];

export const AIAgentBuilderModal: React.FC<AIAgentBuilderModalProps> = ({
  isOpen,
  onClose,
  agentToEdit,
  teams,
  onSaveAgent,
  onDeleteAgent,
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [avatarInitials, setAvatarInitials] = useState('IA');
  const [avatarColor, setAvatarColor] = useState('#7C3AED');
  const [aiSpecialty, setAiSpecialty] = useState('custom');
  const [aiProviderModel, setAiProviderModel] = useState('openai:gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [aiCapabilities, setAiCapabilities] = useState<string[]>([
    'model_steps',
    'audit_rules',
    'generate_tests',
    'summarize_and_schedule',
  ]);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api
      .fetchAIProviders()
      .then((list) => setProviders(list))
      .catch(() => {});
  }, [isOpen]);

  const providerModelOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    if (providers.length > 0) {
      providers.forEach((p) => {
        const rawModels = (p.modelsLabel || '')
          .split(/[,·]/)
          .map((m) => m.trim())
          .filter(Boolean);
        const models = rawModels.length > 0 ? rawModels : ['default'];
        models.forEach((m) => {
          const slug = m
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9._:-]/g, '');
          const val = `${p.providerId}:${slug || m}`;
          const statusTag = p.status === 'connected' ? '● Connecté' : 'MCP';
          opts.push({
            value: val,
            label: `${p.name} · ${m} (${statusTag})`,
          });
        });
      });
    } else {
      opts.push(
        { value: 'openai:gpt-4o', label: 'OpenAI · GPT-4o' },
        { value: 'anthropic:claude-3-7-sonnet', label: 'Anthropic · Claude 3.7 Sonnet' },
        { value: 'google:gemini-2.5-pro', label: 'Google · Gemini 2.5 Pro' },
        { value: 'google:gemini-2.5-flash', label: 'Google · Gemini 2.5 Flash' },
        { value: 'custom_endpoint:mistral-large', label: 'Endpoint Souverain · Mistral / Azure' }
      );
    }
    opts.push({
      value: 'mcp:local',
      label: 'Moteur MCP Local (Sans clé API externe)',
    });
    return opts;
  }, [providers]);

  useEffect(() => {
    if (agentToEdit) {
      setName(agentToEdit.name.replace(/^[^\p{L}\p{N}]+/gu, '').trim());
      setHandle(agentToEdit.handle);
      setRoleTitle(
        (agentToEdit.roleTitle || '').replace(
          /Décisions & Agenda Outlook/gi,
          'Comptes-Rendus & Agenda Outlook'
        )
      );
      setTeamId(agentToEdit.teamId || '');
      setAvatarInitials(agentToEdit.avatarInitials || 'IA');
      setAvatarColor(agentToEdit.avatarColor || '#7C3AED');
      setAiSpecialty(agentToEdit.aiSpecialty || 'custom');
      setAiProviderModel(agentToEdit.aiProviderModel || 'openai:gpt-4o');
      setSystemPrompt(
        (agentToEdit.systemPrompt || '').replace(
          /extrais les décisions clés sous forme de Note Privée/gi,
          "structures les comptes-rendus d'équipe"
        )
      );
      setAiCapabilities(
        agentToEdit.aiCapabilities && agentToEdit.aiCapabilities.length > 0
          ? agentToEdit.aiCapabilities
          : ['model_steps', 'audit_rules']
      );
    } else {
      setName('Agent Métier Personnalisé');
      setHandle('ExpertIA');
      setRoleTitle('Assistant IA Spécialisé');
      setTeamId('');
      setAvatarInitials('IA');
      setAvatarColor('#7C3AED');
      setAiSpecialty('custom');
      setAiProviderModel('openai:gpt-4o');
      setSystemPrompt(
        "Agis comme un expert en architecture de processus selon les standards internes de notre organisation. Vérifie que chaque étape possède un responsable clair et une règle associée."
      );
      setAiCapabilities([
        'model_steps',
        'audit_rules',
        'generate_tests',
        'summarize_and_schedule',
      ]);
    }
  }, [agentToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleCap = (capId: string) => {
    setAiCapabilities((prev) =>
      prev.includes(capId) ? prev.filter((c) => c !== capId) : [...prev, capId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSaveAgent({
        id: agentToEdit?.id,
        name: name.trim(),
        handle: handle.trim().replace(/^@/, '') || 'AgentIA',
        roleTitle: roleTitle.trim() || 'Agent IA Collaborateur',
        teamId: teamId || null,
        avatarInitials: avatarInitials.trim().slice(0, 2).toUpperCase() || 'IA',
        avatarColor,
        aiSpecialty,
        aiProviderModel,
        systemPrompt: systemPrompt.trim(),
        aiCapabilities,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isBuiltIn =
    agentToEdit &&
    [
      'agent-copilot',
      'agent-modelisateur',
      'agent-auditeur',
      'agent-qa',
      'agent-secretaire',
    ].includes(agentToEdit.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white border border-[#ECEEF0] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ECEEF0] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-cw-620 text-sm shadow-xs"
              style={{ backgroundColor: avatarColor }}
            >
              {avatarInitials || <Bot className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-[15px] font-cw-620 text-[#1C2024] flex items-center gap-1.5">
                <span>
                  {agentToEdit
                    ? `Configurer ${agentToEdit.name.replace(/^[^\p{L}\p{N}]+/gu, '').trim()}`
                    : 'Créer un Agent IA Collaborateur'}
                </span>
                <Sparkles className="w-4 h-4 text-[#1F93FF]" />
              </h2>
              <p className="text-[12px] text-[#60646C]">
                Cet agent sera actif dans vos Conversations (1-to-1 ou mention @{handle || 'agent'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#60646C] hover:bg-[#ECEEF0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-[13px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Nom de l'Agent IA
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Agent Conformité Interne"
                className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[13px] focus:outline-none focus:border-[#1F93FF]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Identifiant de mention (@handle)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[#8B8D98] font-cw-620">@</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ''))}
                  placeholder="MonAgent"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-[#DFE3E6] text-[13px] focus:outline-none focus:border-[#1F93FF]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Titre / Rôle dans l'équipe
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Ex: Spécialiste Méthodologie & Qualité"
                className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[13px] focus:outline-none focus:border-[#1F93FF]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Équipe de rattachement (Optionnel)
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[13px] bg-white focus:outline-none focus:border-[#1F93FF]"
              >
                <option value="">Toutes les équipes (Transverse)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Fournisseur & Modèle IA (AI Provider)
              </label>
              <select
                value={aiProviderModel}
                onChange={(e) => setAiProviderModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[13px] bg-white focus:outline-none focus:border-[#1F93FF]"
              >
                {providerModelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Mode de spécialité principal
              </label>
              <select
                value={aiSpecialty}
                onChange={(e) => setAiSpecialty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[13px] bg-white focus:outline-none focus:border-[#1F93FF]"
              >
                <option value="custom">Polyvalent / Personnalisé (selon instructions)</option>
                <option value="orchestrator">Orchestrateur Général (@Copilot)</option>
                <option value="modeler">Conception de Flux & Étapes (@Modelisateur)</option>
                <option value="auditor">Audit de Cohérence & Règles (@Auditeur)</option>
                <option value="qa">Scénarios de Test & Couverture (@QA)</option>
                <option value="secretary">Synthèse, Comptes-Rendus & Agenda Outlook (@Secretaire)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
              Couleur & Initiales d'avatar
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={2}
                value={avatarInitials}
                onChange={(e) => setAvatarInitials(e.target.value.toUpperCase())}
                className="w-12 px-2 py-1.5 text-center rounded-lg border border-[#DFE3E6] font-cw-620 text-xs"
              />
              <div className="flex items-center gap-1.5">
                {AGENT_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setAvatarColor(col)}
                    className={`w-5 h-5 rounded-full transition ${
                      avatarColor === col ? 'ring-2 ring-offset-1 ring-[#1C2024]' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
              Instructions Système (Prompt Métier propre à votre organisation)
            </label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Définissez les règles internes, la méthodologie projet ou le ton que cet Agent IA doit appliquer lorsqu'il répond aux collaborateurs..."
              className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[12.5px] focus:outline-none focus:border-[#1F93FF]"
            />
          </div>

          {/* Enabled Capabilities */}
          <div>
            <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1.5">
              Compétences & Actions autorisées dans les Conversations et le Studio
            </label>
            <div className="space-y-1.5">
              {CAPABILITY_OPTIONS.map((cap) => {
                const checked = aiCapabilities.includes(cap.id);
                return (
                  <label
                    key={cap.id}
                    onClick={() => toggleCap(cap.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      checked
                        ? 'border-[#1F93FF] bg-[#EBF5FF]/50'
                        : 'border-[#ECEEF0] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        checked
                          ? 'bg-[#1F93FF] text-white'
                          : 'border border-[#DFE3E6] bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-cw-520 text-[#1C2024]">{cap.label}</div>
                      <div className="text-[11px] text-[#60646C]">{cap.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#ECEEF0] flex items-center justify-between">
            <div>
              {agentToEdit && !isBuiltIn && onDeleteAgent && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Supprimer l'agent IA ${agentToEdit.name} ?`)) {
                      await onDeleteAgent(agentToEdit.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-cw-520 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer cet agent</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-[12.5px] font-cw-520 text-[#60646C] hover:bg-[#F2F3F7]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-[12.5px] font-cw-620 bg-[#1F93FF] hover:bg-[#007BE5] text-white shadow-xs transition"
              >
                {saving
                  ? 'Enregistrement...'
                  : agentToEdit
                  ? 'Enregistrer la configuration'
                  : 'Créer cet Agent IA'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
