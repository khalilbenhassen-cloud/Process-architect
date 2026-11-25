import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Tag,
  FolderKanban,
  ShieldCheck,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AIProviderConfig, Category, TagItem } from '../../types/process';
import * as api from '../../services/api';

interface SettingsAndTagsViewProps {
  categories: Category[];
  tags: TagItem[];
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onDeleteCategory: (catId: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onResetWorkspaceBlank: () => Promise<void>;
}

const COLORS = ['#1F93FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export const SettingsAndTagsView: React.FC<SettingsAndTagsViewProps> = ({
  categories,
  tags,
  onCreateCategory,
  onDeleteCategory,
  onCreateTag,
  onDeleteTag,
  onResetWorkspaceBlank,
}) => {
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#1F93FF');

  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#F59E0B');

  // AI Providers (Admin BYOK)
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('openai');
  const [providerNameInput, setProviderNameInput] = useState('');
  const [modelsLabelInput, setModelsLabelInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [endpointInput, setEndpointInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [providerFeedback, setProviderFeedback] = useState<string | null>(null);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  useEffect(() => {
    api
      .fetchAIProviders()
      .then((list) => {
        setProviders(list);
        const first = list.find((p) => p.providerId === 'openai') || list[0];
        if (first) {
          setSelectedProviderId(first.providerId);
          setProviderNameInput(first.name);
          setModelsLabelInput(first.modelsLabel);
          setEndpointInput(first.endpointUrl);
        }
      })
      .catch(() => {});
  }, []);

  const activeProvider =
    providers.find((p) => p.providerId === selectedProviderId) || null;

  const isBuiltInProvider = (id: string) =>
    ['openai', 'anthropic', 'google', 'custom_endpoint'].includes(id);

  const handleSelectProvider = (p: AIProviderConfig) => {
    setIsCreatingProvider(false);
    setSelectedProviderId(p.providerId);
    setProviderNameInput(p.name);
    setModelsLabelInput(p.modelsLabel);
    setApiKeyInput('');
    setEndpointInput(p.endpointUrl);
    setProviderFeedback(null);
  };

  const handleStartCreateProvider = () => {
    setIsCreatingProvider(true);
    setProviderNameInput('');
    setModelsLabelInput('deepseek-chat, llama-3.3-70b');
    setApiKeyInput('');
    setEndpointInput('https://api.deepseek.com/v1');
    setProviderFeedback(null);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProvider(true);
    setProviderFeedback(null);
    try {
      if (isCreatingProvider) {
        if (!providerNameInput.trim()) return;
        const created = await api.createAIProvider({
          name: providerNameInput.trim(),
          modelsLabel: modelsLabelInput.trim() || 'custom-model',
          apiKey: apiKeyInput.trim(),
          endpointUrl: endpointInput.trim() || 'https://api.example.com/v1',
          enabled: true,
        });
        setProviders((prev) => [...prev, created]);
        setIsCreatingProvider(false);
        setSelectedProviderId(created.providerId);
        setProviderNameInput(created.name);
        setModelsLabelInput(created.modelsLabel);
        setEndpointInput(created.endpointUrl);
        setApiKeyInput('');
        setProviderFeedback(`Nouveau fournisseur « ${created.name} » ajouté et activé.`);
        return;
      }

      if (!activeProvider) return;
      const updated = await api.updateAIProvider(activeProvider.providerId, {
        name: providerNameInput.trim() || activeProvider.name,
        modelsLabel: modelsLabelInput.trim() || activeProvider.modelsLabel,
        ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
        endpointUrl: endpointInput.trim(),
        enabled: true,
      });
      setProviders((prev) =>
        prev.map((p) => (p.providerId === updated.providerId ? updated : p))
      );
      setApiKeyInput('');
      setProviderFeedback(`Connexion ${updated.name} enregistrée et active.`);
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteCustomProvider = async (providerId: string) => {
    setSavingProvider(true);
    try {
      await api.deleteAIProvider(providerId);
      const remaining = providers.filter((p) => p.providerId !== providerId);
      setProviders(remaining);
      if (remaining.length > 0) {
        handleSelectProvider(remaining[0]);
      }
      setProviderFeedback('Fournisseur IA personnalisé supprimé.');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDisconnectProvider = async () => {
    if (!activeProvider) return;
    setSavingProvider(true);
    try {
      const updated = await api.updateAIProvider(activeProvider.providerId, {
        apiKey: '',
        enabled: false,
      });
      setProviders((prev) =>
        prev.map((p) => (p.providerId === updated.providerId ? updated : p))
      );
      setApiKeyInput('');
      setProviderFeedback(`${updated.name} repassé en mode Moteur MCP Local.`);
    } finally {
      setSavingProvider(false);
    }
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await onCreateCategory(catName.trim(), catColor);
    setCatName('');
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    await onCreateTag(tagName.trim(), tagColor);
    setTagName('');
  };

  return (
    <div className="flex-1 h-full bg-[#FAFAFA] overflow-y-auto p-6 pb-28 text-[#1C2024] apple-workspace-enter">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-white border border-[#ECEEF0] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F93FF] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[18px] font-cw-620 text-[#1C2024] apple-title-tracking">
                Paramètres, Fournisseurs IA & Référentiels
              </h1>
              <p className="text-[12.5px] text-[#60646C]">
                Connectez les clés API IA de votre organisation, gérez vos catégories/tags ou réinitialisez un espace vierge.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Voulez-vous réinitialiser la plateforme en Espace Vierge ? (Les catégories, projets et exemples seront vidés ; vos 5 Agents IA collaborateurs resteront actifs).'
                )
              ) {
                onResetWorkspaceBlank();
              }
            }}
            className="apple-pressable px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-cw-620 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser (Espace Vierge)</span>
          </button>
        </div>

        {/* Admin AI Providers Section (BYOK / Enterprise LLM) */}
        <div className="bg-white border border-[#ECEEF0] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECEEF0] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-cw-620 text-[#1C2024]">
                    Fournisseurs IA & Clés API de l'Organisation
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF5FF] text-[#1F93FF] text-[10.5px] font-cw-620">
                    Admin uniquement
                  </span>
                </div>
                <p className="text-[12px] text-[#60646C]">
                  Reliez vos Agents IA à OpenAI, Claude, Gemini ou ajoutez n'importe quel autre fournisseur IA (DeepSeek, Groq, Scaleway, OVH, Ollama...) avec son propre Endpoint URL et ses identifiants de modèles.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartCreateProvider}
              className="apple-pressable shrink-0 px-3.5 py-2 rounded-xl border border-[#1F93FF]/40 bg-[#EBF5FF] hover:bg-[#1F93FF] text-[#1F93FF] hover:text-white text-[12px] font-cw-620 flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Autre Fournisseur IA</span>
            </button>
          </div>

          {/* Provider Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {providers.map((p) => {
              const isSelected = !isCreatingProvider && p.providerId === selectedProviderId;
              const isConnected = p.status === 'connected';
              return (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => handleSelectProvider(p)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-[#1F93FF] bg-[#EBF5FF]/40 ring-1 ring-[#1F93FF]'
                      : 'border-[#ECEEF0] bg-[#FAFAFA] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[12.5px] font-cw-620 text-[#1C2024] truncate">
                      {p.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isConnected ? 'bg-[#30A46C]' : 'bg-[#8B8D98]'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] text-[#60646C] truncate">
                    {p.modelsLabel}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#ECEEF0]/80">
                    <span
                      className={`text-[10.5px] font-cw-620 ${
                        isConnected ? 'text-[#30A46C]' : 'text-[#8B8D98]'
                      }`}
                    >
                      {isConnected ? '● Connecté (API active)' : '● Mode MCP Local'}
                    </span>
                    {p.apiKeyMasked && (
                      <span className="text-[10px] font-mono text-[#60646C]">
                        {p.apiKeyMasked}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active or New Provider Configuration Form */}
          {(activeProvider || isCreatingProvider) && (
            <form
              onSubmit={handleSaveProvider}
              className="bg-[#FAFAFA] border border-[#ECEEF0] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-cw-620 text-[#1C2024]">
                  {isCreatingProvider
                    ? 'Ajouter un nouveau Fournisseur IA personnalisé (Compatible OpenAI / v1)'
                    : `Configuration : ${activeProvider?.name}`}
                </span>
                {isCreatingProvider && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingProvider(false);
                      if (activeProvider) handleSelectProvider(activeProvider);
                    }}
                    className="text-[11.5px] text-[#60646C] hover:text-[#1C2024]"
                  >
                    Annuler
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-cw-520 text-[#1C2024] mb-1">
                    Nom du Fournisseur IA
                  </label>
                  <input
                    type="text"
                    required
                    value={providerNameInput}
                    onChange={(e) => setProviderNameInput(e.target.value)}
                    placeholder="Ex: DeepSeek, Groq, Scaleway AI, Ollama Interne..."
                    className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px] focus:outline-none focus:border-[#1F93FF]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-cw-520 text-[#1C2024] mb-1">
                    Identifiants des Modèles (Model IDs séparés par virgule ou ·)
                  </label>
                  <input
                    type="text"
                    required
                    value={modelsLabelInput}
                    onChange={(e) => setModelsLabelInput(e.target.value)}
                    placeholder="Ex: deepseek-chat, llama-3.3-70b, qwen-2.5-72b"
                    className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px] font-mono focus:outline-none focus:border-[#1F93FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-cw-520 text-[#1C2024] mb-1">
                    Clé API {isCreatingProvider ? '(Optionnelle si serveur local)' : activeProvider?.name}{' '}
                    {!isCreatingProvider && activeProvider?.apiKeyMasked && (
                      <span className="text-[#30A46C] font-mono">
                        (Actuelle : {activeProvider.apiKeyMasked})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-[#8B8D98] absolute left-3 top-2.5" />
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={
                        !isCreatingProvider && activeProvider?.providerId === 'openai'
                          ? 'sk-proj-...'
                          : !isCreatingProvider && activeProvider?.providerId === 'anthropic'
                          ? 'sk-ant-api03-...'
                          : !isCreatingProvider && activeProvider?.providerId === 'google'
                          ? 'AIzaSy...'
                          : 'Clé API Bearer (ou vide si Ollama/vLLM local)...'
                      }
                      className="w-full pl-8 pr-8 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px] font-mono focus:outline-none focus:border-[#1F93FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2.5 top-2 text-[#8B8D98] hover:text-[#1C2024]"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-cw-520 text-[#1C2024] mb-1">
                    Endpoint URL (Passerelle API / Instance Entreprise)
                  </label>
                  <input
                    type="text"
                    required
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="https://api.deepseek.com/v1 ou http://localhost:11434/v1"
                    className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px] font-mono focus:outline-none focus:border-[#1F93FF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="text-[11.5px] text-[#60646C] flex items-center gap-1.5">
                  {providerFeedback ? (
                    <span className="text-[#30A46C] font-cw-520 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {providerFeedback}
                    </span>
                  ) : (
                    <span>
                      Les modèles déclarés ci-dessus apparaissent automatiquement dans la création d'Agents IA.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isCreatingProvider &&
                    activeProvider &&
                    !isBuiltInProvider(activeProvider.providerId) && (
                      <button
                        type="button"
                        disabled={savingProvider}
                        onClick={() => handleDeleteCustomProvider(activeProvider.providerId)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-cw-520 flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}

                  {!isCreatingProvider && activeProvider?.status === 'connected' && (
                    <button
                      type="button"
                      disabled={savingProvider}
                      onClick={handleDisconnectProvider}
                      className="px-3 py-1.5 rounded-lg border border-[#DFE3E6] bg-white hover:bg-rose-50 hover:text-rose-600 text-[12px] font-cw-520 transition"
                    >
                      Déconnecter
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={savingProvider}
                    className="apple-pressable px-4 py-1.5 rounded-lg bg-[#1F93FF] hover:bg-[#007BE5] text-white text-[12px] font-cw-620 transition"
                  >
                    {savingProvider
                      ? 'Enregistrement...'
                      : isCreatingProvider
                      ? 'Ajouter & Activer ce Fournisseur'
                      : 'Connecter & Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Catégories de Projets */}
          <div className="bg-white border border-[#ECEEF0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#1F93FF]" />
              <h2 className="text-[15px] font-cw-620 text-[#1C2024]">
                Catégories de Projets ({categories.length})
              </h2>
            </div>

            <form onSubmit={handleAddCat} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Nouvelle catégorie (ex: Direction Opérations)..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#DFE3E6] text-[13px] focus:outline-none focus:border-[#1F93FF]"
                />
                <button
                  type="submit"
                  className="apple-pressable px-3.5 py-2 rounded-xl bg-[#1F93FF] hover:bg-[#007BE5] text-white text-[12.5px] font-cw-620 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatColor(c)}
                    className={`w-5 h-5 rounded-full ${
                      catColor === c ? 'ring-2 ring-offset-1 ring-[#1C2024]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </form>

            <div className="divide-y divide-[#ECEEF0] pt-2">
              {categories.length === 0 ? (
                <p className="text-[12px] text-[#8B8D98] py-3">
                  Aucune catégorie créée.
                </p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="py-2.5 flex items-center justify-between text-[13px]"
                  >
                    <span className="flex items-center gap-2 font-cw-520">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-1 text-[#8B8D98] hover:text-rose-600"
                      title="Supprimer cette catégorie"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Tags Carrés Colorés (■) */}
          <div className="bg-white border border-[#ECEEF0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#F59E0B]" />
              <h2 className="text-[15px] font-cw-620 text-[#1C2024]">
                Tags Carrés Colorés ■ ({tags.length})
              </h2>
            </div>

            <form onSubmit={handleAddTag} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Nouveau tag (ex: prioritaire, en-revue)..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#DFE3E6] text-[13px] focus:outline-none focus:border-[#1F93FF]"
                />
                <button
                  type="submit"
                  className="apple-pressable px-3.5 py-2 rounded-xl bg-[#1F93FF] hover:bg-[#007BE5] text-white text-[12.5px] font-cw-620 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagColor(c)}
                    className={`w-5 h-5 rounded-[4px] ${
                      tagColor === c ? 'ring-2 ring-offset-1 ring-[#1C2024]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {tags.length === 0 ? (
                <p className="text-[12px] text-[#8B8D98] py-3">Aucun tag configuré.</p>
              ) : (
                tags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAFAFA] border border-[#DFE3E6] text-[12px] font-cw-520"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-[2px]"
                      style={{ backgroundColor: t.color }}
                    />
                    <span>{t.name}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteTag(t.id)}
                      className="ml-1 text-[#8B8D98] hover:text-rose-600"
                      title="Supprimer ce tag"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white border border-[#ECEEF0] rounded-2xl p-4 flex items-center gap-3 text-[12.5px] text-[#60646C]">
          <ShieldCheck className="w-5 h-5 text-[#30A46C] shrink-0" />
          <span>
            Tous vos projets, catégories, tags et jalons sont persistés dans SQLite. En cas de réinitialisation (« Espace Vierge »), vos 5 Agents IA collaborateurs restent actifs et disponibles dans le Dock.
          </span>
        </div>
      </div>
    </div>
  );
};
