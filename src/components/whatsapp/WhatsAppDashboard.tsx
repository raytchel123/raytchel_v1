import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  BarChart2, 
  Bot,
  Diamond,
  Clock,
  Calendar,
  Image,
  ShoppingBag,
  Tag,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MousePointer,
  Brain,
  Facebook,
  Phone
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { WhatsAppChat } from './WhatsAppChat';
import { WhatsAppSettings } from './WhatsAppSettings';
import { WhatsAppAnalytics } from './WhatsAppAnalytics';
import { ProductCatalog } from './ProductCatalog';
import { InteractiveMessageBuilder } from './InteractiveMessageBuilder';
import { WhatsAppTestConsole } from './WhatsAppTestConsole';
import { IntegrationTestConsole } from './IntegrationTestConsole';
import { WhatsAppConnection } from './WhatsAppConnection';
import { WhatsAppBusinessSetup } from './WhatsAppBusinessSetup';
import { WhatsAppFallbackService } from '../../lib/whatsappFallback';
import { PageHeader } from '../common/PageHeader';
import { supabase } from '../../lib/supabase';

export function WhatsAppDashboard() {
  const [activeTab, setActiveTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuthStore();

  useEffect(() => {
    loadChats();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('whatsapp-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages'
      }, () => {
        loadChats();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          chats:chat_id (
            id,
            status,
            metadata
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by chat
      const chatMap = {};
      data.forEach(message => {
        if (!chatMap[message.chat_id]) {
          chatMap[message.chat_id] = {
            id: message.chat_id,
            status: message.chats?.status || 'active',
            lastMessage: message,
            messages: [],
            metadata: message.chats?.metadata || {},
            contact: message.metadata?.sender || 'Cliente'
          };
        }
        chatMap[message.chat_id].messages.push(message);
      });

      setChats(Object.values(chatMap));
      setLoading(false);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Falha ao carregar conversas');
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = 
      chat.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.lastMessage?.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || chat.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleSendMessage = async (chatId, message) => {
    try {
      // Send message via WhatsApp API
      // This is a placeholder - actual implementation would use the WhatsApp API
      await supabase.from('whatsapp_messages').insert([{
        chat_id: chatId,
        content: message,
        direction: 'outbound',
        status: 'sent',
        type: 'text',
        metadata: {
          sent_at: new Date().toISOString()
        }
      }]);
      
      // Reload chats to show new message
      loadChats();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Falha ao enviar mensagem');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="WhatsApp Business"
        subtitle="Assistente de atendimento via WhatsApp"
        icon={<Diamond className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-4">
            <button 
              onClick={loadChats}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Conectado
            </span>
          </div>
        }
      />

      {/* Navigation */}
      <div className="bg-white border-b px-6">
        <nav className="flex space-x-8 py-4">
          <TabButton 
            active={activeTab === 'chats'} 
            onClick={() => setActiveTab('chats')}
            icon={<MessageSquare className="w-4 h-4" />}
            label="Conversas"
            count={chats.length}
          />
          <TabButton 
            active={activeTab === 'catalog'} 
            onClick={() => setActiveTab('catalog')}
            icon={<Diamond className="w-4 h-4" />}
            label="Catálogo"
          />
          <TabButton 
            active={activeTab === 'interactive'} 
            onClick={() => setActiveTab('interactive')}
            icon={<Brain className="w-4 h-4" />}
            label="Fluxo de Atendimento"
          />
          <TabButton 
            active={activeTab === 'test'} 
            onClick={() => setActiveTab('test')}
            icon={<Bot className="w-4 h-4" />}
            label="Testes WhatsApp"
          />
          <TabButton 
            active={activeTab === 'integration'} 
            onClick={() => setActiveTab('integration')}
            icon={<Brain className="w-4 h-4" />}
            label="Testes Integração"
          />
          <TabButton 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            icon={<BarChart2 className="w-4 h-4" />}
            label="Analytics"
          />
          <TabButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-4 h-4" />}
            label="Configurações"
          />
          <TabButton 
            active={activeTab === 'connection'} 
            onClick={() => setActiveTab('connection')}
            icon={<Phone className="w-4 h-4" />}
            label="Conexão"
          />
          <TabButton 
            active={activeTab === 'setup'} 
            onClick={() => setActiveTab('setup')}
            icon={<Facebook className="w-4 h-4" />}
            label="Setup Business"
          />
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'chats' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar conversas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="closed">Encerrados</option>
                  </select>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Filter className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto h-[calc(100vh-16rem)]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhuma conversa encontrada
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full p-4 border-b hover:bg-gray-50 text-left ${
                        selectedChat?.id === chat.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{chat.contact}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {chat.lastMessage?.content}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(chat.lastMessage?.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          chat.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {chat.status === 'active' ? 'Ativo' : 'Encerrado'}
                        </span>
                        {chat.metadata?.intent && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                            {chat.metadata.intent}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2">
              {selectedChat ? (
                <WhatsAppChat 
                  chat={selectedChat} 
                  onSendMessage={(message) => handleSendMessage(selectedChat.id, message)} 
                />
              ) : (
                <div className="bg-white rounded-lg shadow-sm h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">Selecione uma conversa</h3>
                    <p className="text-gray-500 mt-2">
                      Escolha uma conversa para visualizar e responder
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'catalog' && <ProductCatalog />}
        {activeTab === 'interactive' && <ConversationFlowManager />}
        {activeTab === 'test' && <WhatsAppTestConsole />}
        {activeTab === 'integration' && <IntegrationTestConsole />}
        {activeTab === 'analytics' && <WhatsAppAnalytics />}
        {activeTab === 'settings' && <WhatsAppSettings />}
        {activeTab === 'connection' && <WhatsAppConnection />}
        {activeTab === 'setup' && <WhatsAppBusinessSetup />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        active 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-indigo-100' : 'bg-gray-100'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function ConversationFlowManager() {
  const [flowStages, setFlowStages] = useState([
    {
      id: 'welcome',
      name: 'Acolhimento',
      description: 'Receber o cliente com carinho e descobrir sua necessidade',
      active: true,
      conversions: 95,
      avgDuration: '2min',
      examples: [
        'Olá! Seja bem-vindo(a) à Zaffira! ✨',
        'Que momento especial você está planejando? 💎',
        'Estou aqui para te ajudar a encontrar a joia perfeita!'
      ]
    },
    {
      id: 'discovery',
      name: 'Descoberta',
      description: 'Entender profundamente a necessidade e ocasião',
      active: true,
      conversions: 78,
      avgDuration: '4min',
      examples: [
        'Que lindo! Casamento é um momento muito especial! 💕',
        'Me conta: qual estilo combina mais com vocês?',
        'Já pensaram em ouro amarelo, branco ou rosé?'
      ]
    },
    {
      id: 'product_presentation',
      name: 'Apresentação',
      description: 'Mostrar opções personalizadas baseadas no perfil',
      active: true,
      conversions: 65,
      avgDuration: '6min',
      examples: [
        'Baseado no que você me contou, separei algumas opções lindas!',
        'Qual dessas opções mais chamou sua atenção? 😊',
        'Posso te mostrar outras variações também!'
      ]
    },
    {
      id: 'price_discussion',
      name: 'Investimento',
      description: 'Abordar valores de forma consultiva e educativa',
      active: true,
      conversions: 52,
      avgDuration: '5min',
      examples: [
        'O investimento para essa joia é de R$ X, com condições especiais',
        'Temos facilidades que podem ajudar você!',
        'Que tal conversarmos sobre as opções? 💳'
      ]
    },
    {
      id: 'objection_handling',
      name: 'Tratamento de Objeções',
      description: 'Abordar preocupações de forma empática',
      active: true,
      conversions: 40,
      avgDuration: '7min',
      examples: [
        'Entendo perfeitamente sua preocupação! 💭',
        'Cada real investido se transforma em qualidade que dura para sempre',
        'Temos condições especiais que podem facilitar!'
      ]
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fluxo de Atendimento Humanizado</h2>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Atendimento Humanizado</h4>
            <p className="text-sm text-blue-600 mt-1">
              A Raytchel conduz conversas naturais, sem botões, criando conexão genuína com cada cliente. 
              Cada resposta é personalizada baseada na jornada individual.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {flowStages.map((stage) => (
          <div key={stage.id} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium">{stage.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                stage.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {stage.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-indigo-600">{stage.conversions}%</p>
                <p className="text-xs text-gray-600">Taxa de Conversão</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">{stage.avgDuration}</p>
                <p className="text-xs text-gray-600">Duração Média</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Exemplos de Respostas:</h4>
              <div className="space-y-2">
                {stage.examples.map((example, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs text-gray-700">
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InteractiveMessagesManager() {
  const [templates, setTemplates] = useState([
    {
      id: '1',
      name: 'Saudação Inicial',
      type: 'buttons',
      text: 'Olá! Como posso ajudar você hoje? 💎',
      data: {
        buttons: [
          { id: 'ver_valores', title: '💎 Ver Valores' },
          { id: 'agendar', title: '📅 Agendar Visita' },
          { id: 'localizacao', title: '📍 Localização' }
        ]
      },
      usage: 156,
      conversion: 32
    },
    {
      id: '2',
      name: 'Modelos de Aliança',
      type: 'list',
      text: 'Escolha o modelo de aliança:',
      data: {
        title: 'Modelos Disponíveis',
        rows: [
          { id: 'florida_tradicional', title: 'Florida Tradicional', description: 'R$ 3.465 o par' },
          { id: 'florida_anatomica', title: 'Florida Anatômica', description: 'R$ 3.700 o par' },
          { id: 'florida_super', title: 'Florida Super Anatômica', description: 'R$ 3.900 o par' },
          { id: 'premium_diamond', title: 'Premium com Diamantes', description: 'R$ 4.500 o par' }
        ]
      },
      usage: 89,
      conversion: 45
    },
    {
      id: '3',
      name: 'Opções de Pagamento',
      type: 'buttons',
      text: 'Como você gostaria de realizar o pagamento?',
      data: {
        buttons: [
          { id: 'pix_desconto', title: '💚 PIX (5% desconto)' },
          { id: 'cartao_12x', title: '💳 12x sem juros' },
          { id: 'entrada_saldo', title: '💰 Entrada + Saldo' }
        ]
      },
      usage: 67,
      conversion: 58
    }
  ]);
  const [showBuilder, setShowBuilder] = useState(false);

  const handleSendInteractive = async (interactiveData: any) => {
    try {
      // Aqui você implementaria o envio real da mensagem interativa
      console.log('Sending interactive message:', interactiveData);
      
      // Para demonstração, vamos simular o envio
      alert('Mensagem interativa enviada com sucesso!');
    } catch (error) {
      console.error('Error sending interactive message:', error);
      alert('Erro ao enviar mensagem interativa');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mensagens Interativas</h2>
        <button 
          onClick={() => setShowBuilder(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Template
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start">
          <MousePointer className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Mensagens Interativas Meta</h4>
            <p className="text-sm text-blue-600 mt-1">
              Botões e listas interativas aumentam a conversão em até 25%. Para provedores não-Meta, 
              o sistema automaticamente gera versões com numeração.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  template.type === 'buttons' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {template.type === 'buttons' ? 'Botões' : 'Lista'}
                </span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleSendInteractive(template.data)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Testar template"
                >
                  <Send className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">{template.text}</p>
              
              {template.type === 'buttons' ? (
                <div className="space-y-2">
                  {template.data.buttons.map((button, index) => (
                    <div key={index} className="p-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm text-center">
                      {button.title}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <div className="p-2 bg-gray-100 border-b text-sm font-medium">
                    {template.data.title}
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {template.data.rows.map((row, index) => (
                      <div key={index} className="p-2 border-b last:border-b-0 text-sm">
                        <div className="font-medium">{row.title}</div>
                        {row.description && (
                          <div className="text-xs text-gray-500">{row.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                <span>{template.usage} usos</span>
                <span>{template.conversion}% conversão</span>
              </div>
              
              {/* Preview Fallback */}
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">Ver versão fallback</summary>
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <pre className="whitespace-pre-wrap">
                    {template.type === 'buttons' 
                      ? WhatsAppFallbackService.generateButtonFallback(template.text, template.data.buttons)
                      : WhatsAppFallbackService.generateListFallback(template.text, template.data)
                    }
                  </pre>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
      
      {/* Interactive Message Builder Modal */}
      {showBuilder && (
        <InteractiveMessageBuilder 
          onSend={handleSendInteractive} 
          onClose={() => setShowBuilder(false)} 
        />
      )}
    </div>
  );
}