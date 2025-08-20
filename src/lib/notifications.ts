import { supabase } from './supabase';
import { WhatsAppIntegration } from './whatsapp';
import type { Order } from '../types/orders';

export class NotificationService {
  private static instance: NotificationService;
  private whatsapp: WhatsAppIntegration;

  private constructor() {
    this.whatsapp = WhatsAppIntegration.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async createNotification(params: {
    tenantId: string;
    userId: string;
    type: 'lead' | 'chat' | 'sale' | 'system' | 'alert';
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_tenant_id: params.tenantId,
        p_user_id: params.userId,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_priority: params.priority || 'medium',
        p_metadata: params.metadata || {}
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async updatePreferences(userId: string, preferences: {
    channels?: {
      email?: boolean;
      push?: boolean;
      in_app?: boolean;
    };
    notifications?: {
      lead_alerts?: boolean;
      chat_alerts?: boolean;
      sale_alerts?: boolean;
      system_alerts?: boolean;
    };
    quiet_hours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
  }): Promise<void> {
    try {
      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          channels: preferences.channels,
          preferences: preferences.notifications,
          quiet_hours: preferences.quiet_hours
        });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  async sendOrderConfirmation(order: Order): Promise<void> {
    const message = `
Olá ${order.clientName}! 👋

Seu pedido #${order.id.slice(0, 8)} foi recebido com sucesso! ✨

*Detalhes do Pedido:*
${order.items.map(item => `• ${item.quantity}x ${item.productName}`).join('\n')}

Total: R$ ${order.totalAmount.toFixed(2)}

Você receberá atualizações sobre o status do seu pedido por aqui. 
Qualquer dúvida estamos à disposição! 😊
`;

    await this.whatsapp.sendMessage(order.clientPhone, message);
  }

  async sendPaymentConfirmation(order: Order): Promise<void> {
    const message = `
Olá ${order.clientName}! 💫

O pagamento do seu pedido #${order.id.slice(0, 8)} foi confirmado!

Vamos iniciar a produção da sua joia com todo cuidado e carinho. 
Você receberá atualizações sobre cada etapa do processo. 💎

Obrigado pela confiança!
`;

    await this.whatsapp.sendMessage(order.clientPhone, message);
  }

  async sendStatusUpdate(order: Order, newStatus: string): Promise<void> {
    let message = `Olá ${order.clientName}! 

Atualização do seu pedido #${order.id.slice(0, 8)}:\n\n`;

    switch (newStatus) {
      case 'processing':
        message += `
Sua joia está em produção! 🛠️

Nossa equipe iniciou o processo artesanal de fabricação com todo cuidado que sua peça merece.

Prazo estimado: ${order.deliveryTime || '15 dias úteis'}
`;
        break;

      case 'shipped':
        message += `
Sua joia está a caminho! 📦

Dados de rastreamento:
${order.trackingCode ? `Código: ${order.trackingCode}` : 'Em breve enviaremos o código de rastreamento'}

Fique atento(a) ao recebimento!
`;
        break;

      case 'delivered':
        message += `
Que alegria! Sua joia foi entregue! ✨

Esperamos que você esteja encantado(a) com sua peça.
Não deixe de nos marcar nas fotos! 📸

Lembre-se que você tem garantia vitalícia e pode contar com nossa assistência sempre que precisar.
`;
        break;
    }

    await this.whatsapp.sendMessage(order.clientPhone, message);
  }

  async sendDeliveryReminder(order: Order): Promise<void> {
    const message = `
Olá ${order.clientName}! 📦

Sua joia está pronta para ser entregue no endereço:

${order.deliveryAddress?.street}, ${order.deliveryAddress?.number}
${order.deliveryAddress?.complement ? order.deliveryAddress.complement + '\n' : ''}
${order.deliveryAddress?.neighborhood}
${order.deliveryAddress?.city}/${order.deliveryAddress?.state}
CEP: ${order.deliveryAddress?.zipCode}

Por favor, confirme se o endereço está correto! 🏠
`;

    await this.whatsapp.sendMessage(order.clientPhone, message);
  }

  async sendFeedbackRequest(order: Order): Promise<void> {
    const message = `
Olá ${order.clientName}! ⭐

Como está sua experiência com sua nova joia?
Adoraríamos receber seu feedback!

Você pode avaliar nosso atendimento e produto respondendo esta mensagem.

Sua opinião é muito importante para continuarmos oferecendo o melhor serviço! 🙏
`;

    await this.whatsapp.sendMessage(order.clientPhone, message);
  }
}