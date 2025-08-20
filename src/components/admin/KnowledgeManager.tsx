import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Brain, 
  MessageSquare,
  Upload,
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  Shield,
  FileText,
  Target
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { PageHeader } from '../common/PageHeader';
import type { Intent, QAItem } from '../../types/admin';

export function KnowledgeManager() {
  const { 
    intents, 
    qaItems, 
    loading, 
    error,
    loadIntents,
    loadQAItems,
    createIntent,
    createQAItem,
    clearError 
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<'intents' | 'qa'>('intents');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  useEffect(() => {
    loadIntents();
    loadQAItems();
  }, []);

  const filteredIntents = intents.filter(intent =>
    intent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    intent.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQAItems = qaItems.filter(qa =>
    qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qa.answer_richtext.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Base de Conhecimento"
        subtitle="Gerencie intenções e respostas da IA"
        icon={<Brain className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              {activeTab === 'intents' ? 'Nova Intenção' : 'Nova Q&A'}
            </button>
          </div>
        }
        showBackButton={true}
        backTo="/admin"
      />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('intents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'intents'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Intenções ({intents.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qa'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Q&A ({qaItems.length})</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab === 'intents' ? 'intenções' : 'perguntas'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Filter className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'intents' ? (
            <IntentsTable intents={filteredIntents} />
          ) : (
            <QATable qaItems={filteredQAItems} />
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateKnowledgeModal
          type={activeTab}
          onClose={() => setShowCreateModal(false)}
          onCreate={activeTab === 'intents' ? createIntent : createQAItem}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          type={activeTab}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  );
}

interface IntentsTableProps {
  intents: Intent[];
}

function IntentsTable({ intents }: IntentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b">
            <th className="pb-3 text-sm font-medium text-gray-600">Nome</th>
            <th className="pb-3 text-sm font-medium text-gray-600">Amostras</th>
            <th className="pb-3 text-sm font-medium text-gray-600">Confiança</th>
            <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
            <th className="pb-3 text-sm font-medium text-gray-600">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {intents.map((intent) => (
            <tr key={intent.id} className="hover:bg-gray-50">
              <td className="py-3">
                <div>
                  <p className="font-medium">{intent.name}</p>
                  {intent.description && (
                    <p className="text-sm text-gray-600">{intent.description}</p>
                  )}
                </div>
              </td>
              <td className="py-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{intent.samples.length}</span>
                  <div className="flex -space-x-1">
                    {intent.samples.slice(0, 3).map((sample, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-xs rounded-full"
                        title={sample}
                      >
                        {sample.substring(0, 10)}...
                      </span>
                    ))}
                  </div>
                </div>
              </td>
              <td className="py-3">
                <span className="text-sm font-medium">
                  {(intent.confidence_threshold * 100).toFixed(0)}%
                </span>
              </td>
              <td className="py-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  intent.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {intent.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface QATableProps {
  qaItems: QAItem[];
}

function QATable({ qaItems }: QATableProps) {
  return (
    <div className="space-y-4">
      {qaItems.map((qa) => (
        <div key={qa.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-medium">{qa.question}</h3>
                {qa.requires_guardrail && (
                  <span className="flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Guardrail
                  </span>
                )}
                <span className={`px-2 py-1 text-xs rounded-full ${
                  qa.confidence_policy === 'strict' 
                    ? 'bg-red-100 text-red-800'
                    : qa.confidence_policy === 'low_fallback'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {qa.confidence_policy}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{qa.answer_richtext}</p>
              
              {qa.variations.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Variações:</span>
                  <div className="flex space-x-1">
                    {qa.variations.slice(0, 3).map((variation, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-xs rounded-full"
                        title={variation}
                      >
                        {variation.substring(0, 15)}...
                      </span>
                    ))}
                    {qa.variations.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                        +{qa.variations.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CreateKnowledgeModalProps {
  type: 'intents' | 'qa';
  onClose: () => void;
  onCreate: (data: any) => Promise<any>;
}

function CreateKnowledgeModal({ type, onClose, onCreate }: CreateKnowledgeModalProps) {
  const [formData, setFormData] = useState(
    type === 'intents' 
      ? {
          name: '',
          description: '',
          samples: [''],
          confidence_threshold: 0.8,
          is_active: true
        }
      : {
          question: '',
          variations: [''],
          answer_richtext: '',
          confidence_policy: 'low_confirm',
          requires_guardrail: false,
          guardrail_conditions: {},
          is_active: true
        }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (type === 'intents') {
        const samples = formData.samples.filter(s => s.trim());
        await onCreate({
          ...formData,
          samples
        });
      } else {
        const variations = formData.variations.filter(v => v.trim());
        await onCreate({
          ...formData,
          variations
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating:', error);
    }
  };

  const addSample = () => {
    setFormData(prev => ({
      ...prev,
      samples: [...prev.samples, '']
    }));
  };

  const updateSample = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      samples: prev.samples.map((s, i) => i === index ? value : s)
    }));
  };

  const removeSample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      samples: prev.samples.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium">
            {type === 'intents' ? 'Nova Intenção' : 'Nova Q&A'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'intents' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Intenção *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: preco_aliancas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descreva quando esta intenção deve ser detectada"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amostras de Treinamento *
                </label>
                <div className="space-y-2">
                  {formData.samples.map((sample, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={sample}
                        onChange={(e) => updateSample(index, e.target.value)}
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: quanto custa a aliança"
                      />
                      {formData.samples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSample(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSample}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-sm text-gray-600"
                  >
                    + Adicionar Amostra
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite de Confiança
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.confidence_threshold}
                  onChange={(e) => setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pergunta *
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Qual o preço das alianças?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resposta *
                </label>
                <textarea
                  required
                  value={formData.answer_richtext}
                  onChange={(e) => setFormData({ ...formData, answer_richtext: e.target.value })}
                  rows={4}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Digite a resposta que a IA deve dar..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Política de Confiança
                </label>
                <select
                  value={formData.confidence_policy}
                  onChange={(e) => setFormData({ ...formData, confidence_policy: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low_confirm">Baixa - Confirmar</option>
                  <option value="low_fallback">Baixa - Fallback</option>
                  <option value="strict">Estrita</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_guardrail}
                  onChange={(e) => setFormData({ ...formData, requires_guardrail: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="text-sm text-gray-700">
                  Requer validação de guardrail
                </label>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Criar {type === 'intents' ? 'Intenção' : 'Q&A'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BulkImportModalProps {
  type: 'intents' | 'qa';
  onClose: () => void;
}

function BulkImportModal({ type, onClose }: BulkImportModalProps) {
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const { bulkImportIntents } = useAdminStore();

  const handleImport = async () => {
    try {
      setImporting(true);
      const data = JSON.parse(importData);
      
      if (type === 'intents') {
        await bulkImportIntents(data);
      }
      
      onClose();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Erro no formato dos dados. Verifique o JSON.');
    } finally {
      setImporting(false);
    }
  };

  const exampleData = type === 'intents' 
    ? `[
  {
    "name": "preco_produto",
    "description": "Cliente pergunta sobre preços",
    "samples": ["quanto custa", "qual o preço", "valor"],
    "confidence_threshold": 0.8,
    "is_active": true
  }
]`
    : `[
  {
    "question": "Qual o horário de funcionamento?",
    "variations": ["que horas abrem", "horário da loja"],
    "answer_richtext": "Funcionamos de segunda a sábado, das 9h às 18h.",
    "confidence_policy": "low_confirm",
    "requires_guardrail": false,
    "is_active": true
  }
]`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium">
            Importar {type === 'intents' ? 'Intenções' : 'Q&A'} em Lote
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dados JSON
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={12}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder={exampleData}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Formato Esperado:</h4>
            <pre className="text-xs text-blue-700 overflow-x-auto">
              {exampleData}
            </pre>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!importData.trim() || importing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}