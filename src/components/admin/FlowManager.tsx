import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  GitBranch, 
  Edit, 
  Play, 
  Archive,
  Upload,
  Download,
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { FlowEditor } from './FlowEditor';
import { PageHeader } from '../common/PageHeader';
import type { Flow } from '../../types/admin';

export function FlowManager() {
  const { 
    flows, 
    loading, 
    error, 
    loadFlows, 
    createFlow,
    clearError 
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');

  useEffect(() => {
    loadFlows();
  }, []);

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = 
      flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) return;

    try {
      const flow = await createFlow(newFlowName, newFlowDescription);
      if (flow) {
        setShowCreateModal(false);
        setNewFlowName('');
        setNewFlowDescription('');
        setEditingFlowId(flow.id);
      }
    } catch (error) {
      console.error('Error creating flow:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (editingFlowId) {
    return (
      <FlowEditor 
        flowId={editingFlowId} 
        onBack={() => setEditingFlowId(null)} 
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Gerenciamento de Fluxos"
        subtitle="Crie e gerencie fluxos de atendimento versionados"
        icon={<GitBranch className="w-6 h-6 text-indigo-600" />}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Fluxo
          </button>
        }
        showBackButton={true}
        backTo="/admin"
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar fluxos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Status</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Filter className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Flow List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-medium">Fluxos ({filteredFlows.length})</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Nenhum fluxo encontrado com os filtros aplicados'
              : 'Nenhum fluxo criado ainda'
            }
          </div>
        ) : (
          <div className="divide-y">
            {filteredFlows.map((flow) => (
              <FlowListItem
                key={flow.id}
                flow={flow}
                onEdit={() => setEditingFlowId(flow.id)}
                onDuplicate={() => {/* TODO: Implement duplicate */}}
                onArchive={() => {/* TODO: Implement archive */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Flow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Criar Novo Fluxo</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Fluxo *
                  </label>
                  <input
                    type="text"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Atendimento Principal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={newFlowDescription}
                    onChange={(e) => setNewFlowDescription(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Descreva o propósito deste fluxo..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewFlowName('');
                    setNewFlowDescription('');
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateFlow}
                  disabled={!newFlowName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Criar Fluxo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FlowListItemProps {
  flow: Flow;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

function FlowListItem({ flow, onEdit, onDuplicate, onArchive }: FlowListItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-medium text-lg">{flow.name}</h3>
            <span className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-full ${getStatusColor(flow.status)}`}>
              {getStatusIcon(flow.status)}
              <span>{flow.status} v{flow.version}</span>
            </span>
          </div>
          
          {flow.description && (
            <p className="text-gray-600 text-sm mb-2">{flow.description}</p>
          )}
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>
              {flow.graph_json.nodes.length} nós
            </span>
            <span>
              Criado em {new Date(flow.created_at).toLocaleDateString()}
            </span>
            {flow.published_at && (
              <span>
                Publicado em {new Date(flow.published_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {flow.validation_errors && flow.validation_errors.length > 0 && (
            <div className="mt-2 flex items-center text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">{flow.validation_errors.length} erros de validação</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Editar fluxo"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={onDuplicate}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Duplicar fluxo"
          >
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
          
          {flow.status !== 'archived' && (
            <button
              onClick={onArchive}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Arquivar fluxo"
            >
              <Archive className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}