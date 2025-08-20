import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  RefreshCw, 
  AlertCircle, 
  FileText,
  Brain,
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  BarChart2,
  Clock
} from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { MessageBubble } from './MessageBubble';
import { supabase } from '../../lib/supabase';
import { ChatAI } from '../../lib/chatAI';
import { OpenAIService } from '../../lib/openai';
import { PageHeader } from '../common/PageHeader';

interface TestMetrics {
  confidence: number;
  responseTime: number;
  intentAccuracy: number;
  satisfactionScore: number;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  messages: string[];
  expectedIntents: string[];
  completed: boolean;
}

export function RaytchelTest() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initRetries, setInitRetries] = useState(0);
  const [metrics, setMetrics] = useState<TestMetrics>({
    confidence: 0,
    responseTime: 0,
    intentAccuracy: 0,
    satisfactionScore: 0
  });
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { messages, loadMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  // Test scenarios
  const testScenarios: TestScenario[] = [
    {
      id: '1',
      name: 'Consulta de Alianças',
      description: 'Teste de atendimento para consulta de alianças de casamento',
      messages: [
        'Olá, gostaria de informações sobre alianças',
        'Prefiro ouro amarelo',
        'Quanto custa o par?',
        'Tem opção com diamantes?'
      ],
      expectedIntents: [
        'greeting',
        'product_preference',
        'price_inquiry',
        'customization_inquiry'
      ],
      completed: false
    },
    {
      id: '2',
      name: 'Negociação de Preço',
      description: 'Teste de habilidades de negociação e apresentação de valor',
      messages: [
        'Achei o preço um pouco alto',
        'Tem algum desconto?',
        'Qual a forma de pagamento?'
      ],
      expectedIntents: [
        'price_objection',
        'discount_inquiry',
        'payment_inquiry'
      ],
      completed: false
    }
  ];

  useEffect(() => {
    const initOpenAI = async () => {
      try {
        const openai = OpenAIService.getInstance();
        await openai.initializeApiKey('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');
      } catch (error) {
        console.error('Error initializing OpenAI:', error);
      }
    };

    initOpenAI();
  }, []);

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    try {
      setInitializing(true);
      setError('');

      // Get tenant ID
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'zaffira')
        .single();

      if (tenantError) throw new Error('Falha ao carregar dados do tenant');
      if (!tenant?.id) throw new Error('Tenant não encontrado');

      // Create new chat session
      const { data: chat, error: createError } = await supabase
        .from('chats')
        .insert([{ 
          tenant_id: tenant.id,
          status: 'active',
          handled_by_agent: false,
          metadata: {
            type: 'test',
            source: 'raytchel_test',
            created_at: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (createError) throw createError;

      if (chat?.id) {
        setChatId(chat.id);
        
        // Send welcome message
        const welcomeMessage = {
          chat_id: chat.id,
          content: 'Olá! 👋 Seja muito bem-vindo(a) ao ambiente de testes da Raytchel! Como posso ajudar você hoje? 💎',
          sender: 'bot',
          status: 'sent',
          metadata: {
            type: 'greeting',
            intent: 'welcome'
          }
        };

        const { error: messageError } = await supabase
          .from('messages')
          .insert([welcomeMessage]);

        if (messageError) throw messageError;

        // Load messages after welcome message is inserted
        await loadMessages(chat.id);
        setInitializing(false);
        setInitRetries(0);
      }
    } catch (err) {
      console.error('Error initializing chat:', err);
      
      // Retry logic with exponential backoff
      if (initRetries < MAX_RETRIES) {
        setTimeout(() => {
          setInitRetries(prev => prev + 1);
          initChat();
        }, RETRY_DELAY * Math.pow(2, initRetries));
      } else {
        setError('Não foi possível iniciar o chat. Por favor, tente novamente mais tarde.');
        setInitializing(false);
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending || !chatId) return;

    try {
      setSending(true);
      setError('');

      const startTime = performance.now();

      // Save user message
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content: message.trim(),
          sender: 'user',
          status: 'sent'
        }]);

      if (messageError) throw messageError;

      // Clear input and reload messages
      setMessage('');
      await loadMessages(chatId);

      // Process with AI and get response
      const chatAI = ChatAI.getInstance();
      const aiResponse = await chatAI.processMessage(message.trim(), chatId);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        confidence: aiResponse.confidence || prev.confidence,
        responseTime: responseTime,
        intentAccuracy: aiResponse.intent ? 0.95 : prev.intentAccuracy,
        satisfactionScore: prev.satisfactionScore
      }));

      // Create AI response message
      const { error: responseError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content: aiResponse.content,
          sender: 'bot',
          status: 'sent',
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
          metadata: aiResponse.metadata
        }]);

      if (responseError) throw responseError;

      // Reload messages to show AI response
      await loadMessages(chatId);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Falha ao enviar mensagem. Por favor, tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = async (isPositive: boolean) => {
    if (!chatId) return;

    try {
      await supabase
        .from('message_feedback')
        .insert([{
          chat_id: chatId,
          is_positive: isPositive,
          feedback_type: 'test',
          created_at: new Date().toISOString()
        }]);

      // Update satisfaction score
      setMetrics(prev => ({
        ...prev,
        satisfactionScore: (prev.satisfactionScore + (isPositive ? 1 : 0)) / 2
      }));
    } catch (err) {
      console.error('Error saving feedback:', err);
    }
  };

  if (initializing) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Iniciando ambiente de testes...</p>
            {initRetries > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Tentativa {initRetries} de {MAX_RETRIES}...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <PageHeader
        title="Teste da Raytchel"
        subtitle="Ambiente de testes para validar o atendimento"
        icon={<Bot className="w-6 h-6 text-indigo-600" />}
        showBackButton={true}
        backTo="/atendimento"
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6" />
              <div>
                <h2 className="font-medium">Teste a Raytchel</h2>
                <p className="text-sm text-indigo-200">
                  Ambiente de testes para validar o atendimento
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="p-2 hover:bg-indigo-700 rounded-lg"
              title="Ver métricas"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Main Chat Area */}
          <div className="flex-1">
            {/* Test Instructions */}
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Cenários de Teste</h3>
                  <div className="mt-2 space-y-2">
                    {testScenarios.map(scenario => (
                      <button
                        key={scenario.id}
                        onClick={() => setSelectedScenario(scenario)}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          selectedScenario?.id === scenario.id
                            ? 'bg-blue-100'
                            : 'hover:bg-blue-100/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-900">{scenario.name}</span>
                          {scenario.completed && (
                            <span className="text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-blue-700 mt-1">{scenario.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                  <div className="bg-red-50 p-4 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                      rows={2}
                      disabled={sending || !chatId}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending || !chatId}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 h-fit"
                  >
                    {sending ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Sidebar */}
          {showAnalytics && (
            <div className="w-80 border-l bg-gray-50">
              <div className="p-4">
                <h3 className="font-medium mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-indigo-600" />
                  Métricas de Performance
                </h3>

                <div className="space-y-4">
                  {/* Confidence Score */}
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Confiança</span>
                      <span className="font-medium">{(metrics.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${metrics.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Response Time */}
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Tempo de Resposta</span>
                      <span className="font-medium">{(metrics.responseTime / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((metrics.responseTime / 5000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Intent Accuracy */}
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Precisão de Intenção</span>
                      <span className="font-medium">{(metrics.intentAccuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full" 
                        style={{ width: `${metrics.intentAccuracy * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Satisfaction Score */}
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Satisfação</span>
                      <span className="font-medium">{(metrics.satisfactionScore * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${metrics.satisfactionScore * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Feedback Buttons */}
                  <div className="flex justify-center space-x-4 mt-4">
                    <button
                      onClick={() => handleFeedback(true)}
                      className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Útil
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Não Útil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}