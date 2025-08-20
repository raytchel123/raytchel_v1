import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MessageSquare, 
  User, 
  AlertCircle, 
  UserCheck,
  Filter,
  Search,
  ArrowRight,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QueueItem {
  id: string;
  clientName: string;
  waitTime: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'waiting' | 'in_progress' | 'completed';
  stage: 'greeting' | 'discovery' | 'presentation' | 'quotation' | 'closing';
  subject?: string;
  lastMessage?: string;
}

export function ChatQueue() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    loadQueue();
    const subscription = supabase
      .channel('queue-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_queue'
      }, () => {
        loadQueue();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('wait_time', { ascending: true });

      if (error) throw error;

      setQueueItems(data || []);
    } catch (err) {
      console.error('Error loading queue:', err);
      setError('Falha ao carregar fila de atendimento');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = queueItems.filter(item => {
    const matchesSearch = 
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    
    return matchesSearch && matchesPriority;
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'greeting': return 'bg-blue-100 text-blue-800';
      case 'discovery': return 'bg-purple-100 text-purple-800';
      case 'presentation': return 'bg-indigo-100 text-indigo-800';
      case 'quotation': return 'bg-green-100 text-green-800';
      case 'closing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'greeting': return 'Saudação';
      case 'discovery': return 'Descoberta';
      case 'presentation': return 'Apresentação';
      case 'quotation': return 'Orçamento';
      case 'closing': return 'Fechamento';
      default: return stage;
    }
  };

  const queueMetrics = {
    total: queueItems.length,
    byStage: queueItems.reduce((acc, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPriority: queueItems.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Total em Atendimento</p>
              <p className="text-2xl font-semibold mt-1">{queueMetrics.total}</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Prioridade Alta</p>
              <p className="text-2xl font-semibold mt-1">{queueMetrics.byPriority.high || 0}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-2xl font-semibold mt-1">4:30</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Filter className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-medium">Fila de Atendimento</h3>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando atendimentos...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum atendimento em andamento
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.clientName}</h4>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-500">
                          Aguardando: {formatDistanceToNow(item.waitTime)}
                        </p>
                        {item.subject && (
                          <p className="text-sm text-gray-500">
                            Assunto: {item.subject}
                          </p>
                        )}
                        {item.lastMessage && (
                          <p className="text-sm text-gray-500 line-clamp-1">
                            "{item.lastMessage}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : item.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.priority === 'high' ? 'Alta' : 
                           item.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(item.stage)}`}>
                          {getStageLabel(item.stage)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'waiting'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.status === 'waiting' ? 'Aguardando' : 'Em Atendimento'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <Tag className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stage Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4">Distribuição por Etapa</h3>
        <div className="space-y-4">
          {Object.entries(queueMetrics.byStage).map(([stage, count]) => (
            <div key={stage}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{getStageLabel(stage)}</span>
                <span className="font-medium">{count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getStageColor(stage).replace('text-', 'bg-')}`}
                  style={{ width: `${(count / queueMetrics.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}