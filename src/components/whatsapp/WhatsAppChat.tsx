import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Image, 
  Paperclip, 
  Smile, 
  ShoppingBag, 
  Calendar, 
  MapPin,
  User,
  Bot,
  Calculator,
  MousePointer
} from 'lucide-react';
import { ProductSelector } from './ProductSelector';
import { AppointmentScheduler } from './AppointmentScheduler';
import { LocationSelector } from './LocationSelector';
import { InteractiveMessageBuilder } from './InteractiveMessageBuilder';
import { WhatsAppFallbackService } from '../../lib/whatsappFallback';
import { UsageGuard } from './UsageGuard';
import { UsageService } from '../../lib/usageService';
interface WhatsAppChatProps {
  chat: any;
  onSendMessage: (message: string) => Promise<void>;
}

export function WhatsAppChat({ chat, onSendMessage }: WhatsAppChatProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [usageBlocked, setUsageBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const usageService = UsageService.getInstance();
  const tenantId = '00000000-0000-0000-0000-000000000001'; // Zaffira

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    // Verificar limite antes de enviar
    const canSend = await usageService.canSendWhatsApp(tenantId);
    if (!canSend.can_proceed) {
      setUsageBlocked(true);
      setBlockMessage(canSend.block_message || 'Limite de mensagens atingido');
      return;
    }
    
    try {
      setSending(true);
      await onSendMessage(message);
      
      // Rastrear uso após envio bem-sucedido
      await usageService.trackWhatsAppMessage(tenantId, `msg_${Date.now()}`);
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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

  const handleProductSelection = async (product: any) => {
    // Verificar limite para templates
    const canSend = await usageService.canSendTemplate(tenantId);
    if (!canSend.can_proceed) {
      setUsageBlocked(true);
      setBlockMessage(canSend.block_message || 'Limite de templates atingido');
      return;
    }
    
    const productMessage = `*${product.name}*\n\n${product.description}\n\nPreço: ${formatCurrency(product.price)}\n\nGostaria de mais informações sobre esta peça?`;
    await onSendMessage(productMessage);
    
    // Rastrear uso do template
    await usageService.trackTemplateUsage(tenantId, `template_product_${product.id}`);
    
    setShowProductSelector(false);
  };

  const handleAppointmentSelection = async (appointment: any) => {
    // Verificar limite para agendamentos
    const canCreate = await usageService.canCreateAppointment(tenantId);
    if (!canCreate.can_proceed) {
      setUsageBlocked(true);
      setBlockMessage(canCreate.block_message || 'Limite de agendamentos atingido');
      return;
    }
    
    const appointmentMessage = `Agendamento confirmado para ${appointment.date} às ${appointment.time}.\n\nObrigado pela preferência! Estamos ansiosos para recebê-lo em nossa loja.`;
    await onSendMessage(appointmentMessage);
    
    // Rastrear criação de agendamento
    await usageService.trackAppointmentCreation(tenantId, `apt_${Date.now()}`);
    
    setShowAppointmentScheduler(false);
  };

  const handleLocationSelection = async (location: any) => {
    const locationMessage = `Nossa loja está localizada em:\n\n${location.address}\n\nHorário de funcionamento:\n${location.hours}\n\nEsperamos sua visita!`;
    await onSendMessage(locationMessage);
    setShowLocationSelector(false);
  };

  const handleInteractiveMessage = async (interactiveData: any) => {
    // Usar fluxo humanizado ao invés de botões
    const humanizedMessage = `Entendi seu interesse! 😊 Me conta um pouquinho mais sobre o que você está procurando para eu te ajudar da melhor forma possível! ✨`;
    await onSendMessage(humanizedMessage);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="ml-3">
            <h3 className="font-medium">{chat.contact}</h3>
            <p className="text-xs text-gray-500">
              {chat.status === 'active' ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            chat.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {chat.status === 'active' ? 'Conversa ativa' : 'Conversa encerrada'}
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {chat.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((msg, index) => (
          <div 
            key={msg.id || index} 
            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
              msg.direction === 'outbound' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white border text-gray-800'
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                {msg.direction === 'outbound' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {msg.direction === 'outbound' ? 'Zaffira' : chat.contact}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="text-right mt-1">
                <span className="text-xs opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-t border-b bg-gray-50">
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowInteractiveBuilder(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center"
          >
            <MousePointer className="w-5 h-5 mr-1" />
            <span className="text-sm">Interativo</span>
          </button>
          <button 
            onClick={() => setShowProductSelector(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center"
          >
            <ShoppingBag className="w-5 h-5 mr-1" />
            <span className="text-sm">Catálogo</span>
          </button>
          <button 
            onClick={() => setShowAppointmentScheduler(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center"
          >
            <Calendar className="w-5 h-5 mr-1" />
            <span className="text-sm">Agendar</span>
          </button>
          <button 
            onClick={() => setShowLocationSelector(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center"
          >
            <MapPin className="w-5 h-5 mr-1" />
            <span className="text-sm">Localização</span>
          </button>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-white">
        {usageBlocked && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{blockMessage}</p>
            </div>
            <button
              onClick={() => setUsageBlocked(false)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Fechar
            </button>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Smile className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowInteractiveBuilder(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center whitespace-nowrap"
          >
            <MousePointer className="w-5 h-5 mr-1" />
            <span className="text-sm">Interativo</span>
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Image className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            className={`flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              usageBlocked ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            disabled={usageBlocked}
          />
          <UsageGuard
            tenantId={tenantId}
            actionType="send_whatsapp"
            onCanProceed={handleSend}
            onBlocked={(msg) => {
              setUsageBlocked(true);
              setBlockMessage(msg);
            }}
          >
            <button
              disabled={!message.trim() || sending || usageBlocked}
              className="p-2 text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </UsageGuard>
        </div>
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelector 
          onSelect={handleProductSelection} 
          onClose={() => setShowProductSelector(false)} 
        />
      )}

      {/* Appointment Scheduler Modal */}
      {showAppointmentScheduler && (
        <AppointmentScheduler 
          onSchedule={handleAppointmentSelection} 
          onClose={() => setShowAppointmentScheduler(false)} 
        />
      )}

      {/* Location Selector Modal */}
      {showLocationSelector && (
        <LocationSelector 
          onSelect={handleLocationSelection} 
          onClose={() => setShowLocationSelector(false)} 
        />
      )}

      {/* Interactive Message Builder Modal */}
      {showInteractiveBuilder && (
        <InteractiveMessageBuilder 
          onSend={handleInteractiveMessage} 
          onClose={() => setShowInteractiveBuilder(false)} 
        />
      )}

    </div>
  );
}