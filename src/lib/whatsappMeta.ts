import { supabase } from './supabase';

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppMetaIntegration {
  private static instance: WhatsAppMetaIntegration;
  private fbToken: string;
  private fbWppId: string;
  private baseURL: string;
  private verifyToken: string;

  private constructor() {
    this.fbToken = import.meta.env.VITE_FACEBOOK_TOKEN || '';
    this.fbWppId = import.meta.env.VITE_FACEBOOK_WPP_ID || '';
    this.baseURL = 'https://graph.facebook.com/v22.0';
    this.verifyToken = import.meta.env.VITE_FACEBOOK_CALLBACK_TOKEN || '';
  }

  static getInstance(): WhatsAppMetaIntegration {
    if (!WhatsAppMetaIntegration.instance) {
      WhatsAppMetaIntegration.instance = new WhatsAppMetaIntegration();
    }
    return WhatsAppMetaIntegration.instance;
  }

  async sendMessage(to: string, message: string, messageType: string = 'text'): Promise<any> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: messageType,
        text: {
          body: message
        }
      };

      const response = await fetch(`${this.baseURL}/${this.fbWppId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.fbToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Log message to database
      await this.logMessage({
        direction: 'outbound',
        content: message,
        type: messageType,
        status: 'sent',
        metadata: {
          whatsapp_message_id: data.messages?.[0]?.id,
          recipient: to,
          sent_at: new Date().toISOString()
        }
      });

      return data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error('Erro ao enviar mensagem WhatsApp');
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/${this.fbWppId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.fbToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error marking message as read:', errorData);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async setTypingIndicator(to: string, action: 'typing_on' | 'typing_off' = 'typing_on'): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/${this.fbWppId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.fbToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'typing',
          typing: {
            action: action
          }
        })
      });

      if (!response.ok) {
        console.error('Error setting typing indicator');
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    try {
      const entry = payload.entry?.[0];
      if (!entry?.changes) return;

      const change = entry.changes[0];
      const value = change.value;

      // Process incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage(message, value.contacts?.[0]);
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.processStatusUpdate(status);
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  private async processIncomingMessage(message: WhatsAppMessage, contact?: any): Promise<void> {
    try {
      const messageContent = this.extractMessageContent(message);
      
      // Log incoming message
      await this.logMessage({
        direction: 'inbound',
        content: messageContent,
        type: message.type,
        status: 'received',
        metadata: {
          whatsapp_message_id: message.id,
          sender: message.from,
          contact_name: contact?.profile?.name,
          timestamp: message.timestamp
        }
      });

      // Mark as read
      await this.markAsRead(message.id);

      // Set typing indicator
      await this.setTypingIndicator(message.from, 'typing_on');

      // Process with conversation service
      const conversationService = await import('./conversationService');
      await conversationService.ConversationService.getInstance().processMessage(
        messageContent,
        message.from,
        message.id
      );

    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  }

  private async processStatusUpdate(status: any): Promise<void> {
    try {
      await supabase
        .from('whatsapp_messages')
        .update({
          status: status.status,
          metadata: {
            status_timestamp: status.timestamp,
            recipient_id: status.recipient_id
          }
        })
        .eq('metadata->whatsapp_message_id', status.id);
    } catch (error) {
      console.error('Error processing status update:', error);
    }
  }

  private extractMessageContent(message: WhatsAppMessage): string {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'image':
        return message.image?.caption || 'Imagem enviada';
      case 'document':
        return 'Documento enviado';
      case 'audio':
        return 'Áudio enviado';
      case 'video':
        return 'Vídeo enviado';
      default:
        return `Mensagem do tipo: ${message.type}`;
    }
  }

  private async logMessage(data: {
    direction: 'inbound' | 'outbound';
    content: string;
    type: string;
    status: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('whatsapp_messages').insert([{
        ...data,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${this.baseURL}/${this.fbWppId}`, {
        headers: {
          'Authorization': `Bearer ${this.fbToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  getVerifyToken(): string {
    return this.verifyToken;
  }
}