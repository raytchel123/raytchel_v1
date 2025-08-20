import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  UserPlus, 
  Clock, 
  Tag, 
  AlertCircle, 
  MoreVertical, 
  FileText, 
  BarChart2,
  Bot,
  User,
  MessageSquare,
  ThumbsUp,
  TrendingUp
} from 'lucide-react';
import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { supabase } from '../../lib/supabase';
import { useAnalyticsStore } from '../../stores/analyticsStore';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onTakeOver: () => Promise<void>;
  handledByAgent: boolean;
  disabled?: boolean;
}

export function ChatWindow({ 
  messages, 
  onSendMessage, 
  onTakeOver, 
  handledByAgent, 
  disabled 
}: ChatWindowProps) {
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takingOver, setTakingOver] = useState(false);
  const [notes, setNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { metrics: analyticsMetrics } = useAnalyticsStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTakeOver = async () => {
    try {
      setTakingOver(true);
      setError(null);
      await onTakeOver();
    } catch (err) {
      console.error('Error taking over chat:', err);
      setError('Não foi possível assumir o atendimento');
    } finally {
      setTakingOver(false);
    }
  };

  const handleSend = async (content: string) => {
    try {
      setError(null);
      await onSendMessage(content);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Não foi possível enviar a mensagem');
    }
  };

  const handleSaveNotes = async () => {
    try {
      // Save notes to database
      const { error: saveError } = await supabase
        .from('chat_notes')
        .insert([{
          chat_id: messages[0]?.chatId,
          content: notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (saveError) throw saveError;
      setNotes('');
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Não foi possível salvar as notas');
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="font-medium">Atendimento</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              handledByAgent 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {handledByAgent ? 'Atendimento Humano' : 'Atendimento IA'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {!handledByAgent && (
              <button
                onClick={handleTakeOver}
                disabled={takingOver}
                className="flex items-center px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-full disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                {takingOver ? 'Assumindo...' : 'Assumir atendimento'}
              </button>
            )}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Analytics"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCustomerInfo(!showCustomerInfo)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="px-4 py-2 bg-red-50 rounded-lg">
              <div className="flex items-center text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput 
          onSend={handleSend} 
          onAudioMessage={async () => {}} 
          disabled={disabled || takingOver}
        />
      </div>

      {/* Customer Info Sidebar */}
      {showCustomerInfo && (
        <div className="w-80 border-l bg-white p-4 overflow-y-auto">
          <h4 className="font-medium mb-4">Informações do Cliente</h4>
          
          {/* Customer Details */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <User className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Cliente #123</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Email: cliente@email.com</p>
                <p>Telefone: (11) 99999-9999</p>
                <p>Origem: Instagram</p>
              </div>
            </div>

            {/* Interaction History */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Histórico de Interações
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total de conversas</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Última interação</span>
                  <span className="font-medium">2 dias atrás</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <h5 className="font-medium flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Notas
              </h5>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione notas sobre o atendimento..."
                className="w-full p-2 border rounded-lg text-sm"
                rows={4}
              />
              <button
                onClick={handleSaveNotes}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Salvar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Sidebar */}
      {showAnalytics && (
        <div className="w-80 border-l bg-white p-4 overflow-y-auto">
          <h4 className="font-medium mb-4">Analytics da Conversa</h4>
          
          <div className="space-y-4">
            {/* Real-time Metrics */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Métricas em Tempo Real
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Tempo médio resposta</span>
                  <span className="font-medium">1.2s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Mensagens trocadas</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Confiança da IA</span>
                  <span className="font-medium">94%</span>
                </div>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium mb-3 flex items-center">
                <ThumbsUp className="w-4 h-4 mr-2" />
                Análise de Sentimento
              </h5>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: '75%' }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Sentimento positivo (75%)
                </p>
              </div>
            </div>

            {/* Intent Recognition */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium mb-3 flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                Intenções Detectadas
              </h5>
              <div className="space-y-2 text-sm">
                {messages
                  .filter(m => m.intent)
                  .slice(-3)
                  .map((m, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span>{m.intent}</span>
                      <span className="font-medium">
                        {(m.confidence || 0) * 100}%
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Conversion Potential */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Potencial de Conversão
              </h5>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: '85%' }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Alta probabilidade (85%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}