import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Tag,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { formatDistanceToNow } from '../../utils/dateFormat';
import { PageHeader } from '../common/PageHeader';
import type { Conversation } from '../../types/admin';

export function HandoffQueue() {
  const { 
    conversations, 
    loading, 
    error,
    loadConversations,
    resolveHandoff,
    clearError 
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('waiting_human');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadConversations(statusFilter === 'all' ? undefined : statusFilter);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadConversations(statusFilter === 'all' ? undefined : statusFilter);
    }, 30000);

    return () => clearInterval(interval);
  }, [statusFilter]);

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.handoff_reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleResolveHandoff = async () => {
    if (!selectedConversation || !resolutionNote.trim()) return;

    setResolving(true);
    try {
      const success = await resolveHandoff(selectedConversation.id, resolutionNote);
      if (success) {
        setSelectedConversation(null);
        setResolutionNote('');
      }
    } catch (error) {
      console.error('Error resolving handoff:', error);
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting_human': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (reason?: string) => {
    if (!reason) return 'bg-gray-100 text-gray-800';
    
    if (reason.includes('urgente') || reason.includes('reclamação')) {
      return 'bg-red-100 text-red-800';
    }
    if (reason.includes('técnico') || reason.includes('complexo')) {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fila de Handoff"
        subtitle="Gerencie conversas que precisam de atendimento humano"
        icon={<Users className="w-6 h-6 text-indigo-600" />}
        actions={
          <button
            onClick={() => loadConversations(statusFilter === 'all' ? undefined : statusFilter)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Atualizar
          </button>
        }
        showBackButton={true}
        backTo="/admin"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aguardando</p>
              <p className="text-xl font-bold">
                {conversations.filter(c => c.status === 'waiting_human').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Em Atendimento</p>
              <p className="text-xl font-bold">
                {conversations.filter(c => c.status === 'active' && c.assigned_agent_id).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Resolvidos Hoje</p>
              <p className="text-xl font-bold">
                {conversations.filter(c => c.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-xl font-bold">4.2min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou motivo..."
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
            <option value="waiting_human">Aguardando</option>
            <option value="active">Em Atendimento</option>
            <option value="resolved">Resolvidos</option>
            <option value="all">Todos</option>
          </select>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Filter className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-medium">
            Conversas ({filteredConversations.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma conversa encontrada
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onSelect={() => setSelectedConversation(conversation)}
                isSelected={selectedConversation?.id === conversation.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Resolver Handoff</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">{selectedConversation.contact_name}</h4>
                  <p className="text-sm text-gray-600">{selectedConversation.contact_phone}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Motivo:</strong> {selectedConversation.handoff_reason}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Aguardando há:</strong> {
                      selectedConversation.handoff_requested_at 
                        ? formatDistanceToNow(selectedConversation.handoff_requested_at)
                        : 'N/A'
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nota de Resolução *
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={4}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Descreva como o problema foi resolvido..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setResolutionNote('');
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolveHandoff}
                  disabled={!resolutionNote.trim() || resolving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {resolving ? 'Resolvendo...' : 'Resolver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  onSelect: () => void;
  isSelected: boolean;
}

function ConversationItem({ conversation, onSelect, isSelected }: ConversationItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting_human': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (reason?: string) => {
    if (!reason) return 'bg-gray-100 text-gray-800';
    
    if (reason.includes('urgente') || reason.includes('reclamação')) {
      return 'bg-red-100 text-red-800';
    }
    if (reason.includes('técnico') || reason.includes('complexo')) {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div 
      className={`p-4 cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium">
                {conversation.contact_name || 'Cliente'}
              </h3>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(conversation.status)}`}>
                {conversation.status === 'waiting_human' ? 'Aguardando' :
                 conversation.status === 'active' ? 'Em Atendimento' :
                 conversation.status === 'resolved' ? 'Resolvido' : 'Fechado'}
              </span>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              {conversation.contact_phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  <span>{conversation.contact_phone}</span>
                </div>
              )}
              
              {conversation.handoff_reason && (
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>{conversation.handoff_reason}</span>
                </div>
              )}
              
              {conversation.last_intent && (
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  <span>Última intenção: {conversation.last_intent}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-2">
              {conversation.handoff_reason && (
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(conversation.handoff_reason)}`}>
                  {conversation.handoff_reason.includes('urgente') ? 'Urgente' :
                   conversation.handoff_reason.includes('técnico') ? 'Técnico' : 'Normal'}
                </span>
              )}
              
              {conversation.handoff_requested_at && (
                <span className="text-xs text-gray-500">
                  Aguardando há {formatDistanceToNow(conversation.handoff_requested_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {conversation.status === 'waiting_human' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedConversation(conversation);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Atender
            </button>
          )}
        </div>
      </div>
    </div>
  );
}