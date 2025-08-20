import { supabase } from './supabase';

interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  timezone_id: string;
  message_template_namespace: string;
}

interface WhatsAppPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  code_verification_status: string;
  quality_rating: string;
  platform: string;
  throughput: {
    level: string;
  };
}

interface SendMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template' | 'interactive' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        currency?: any;
        date_time?: any;
        image?: any;
        document?: any;
      }>;
    }>;
  };
  interactive?: {
    type: 'button' | 'list';
    body: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export class WhatsAppMetaOfficial {
  private static instance: WhatsAppMetaOfficial;
  private accessToken: string = '';
  private phoneNumberId: string = '';
  private businessAccountId: string = '';
  private appId: string = '';
  private baseURL = 'https://graph.facebook.com/v18.0';
  private webhookVerifyToken = 'raytchel_webhook_2024';

  private constructor() {}

  static getInstance(): WhatsAppMetaOfficial {
    if (!WhatsAppMetaOfficial.instance) {
      WhatsAppMetaOfficial.instance = new WhatsAppMetaOfficial();
    }
    return WhatsAppMetaOfficial.instance;
  }

  async initialize(): Promise<void> {
    try {
      const { data: config, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (config) {
        this.accessToken = config.api_key;
        this.phoneNumberId = config.phone_number;
        this.businessAccountId = config.settings?.business_account_id;
        this.appId = config.settings?.app_id;
        this.webhookVerifyToken = config.settings?.webhook_verify_token || 'raytchel_webhook_2024';
      }
    } catch (error) {
      console.error('Error initializing WhatsApp Meta Official:', error);
      throw error;
    }
  }

  async getBusinessAccounts(): Promise<WhatsAppBusinessAccount[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/me/businesses?access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch business accounts');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting business accounts:', error);
      throw error;
    }
  }

  async getPhoneNumbers(businessAccountId: string): Promise<WhatsAppPhoneNumber[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/${businessAccountId}/phone_numbers?access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch phone numbers');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting phone numbers:', error);
      throw error;
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp not properly configured');
      }

      const response = await fetch(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Log message to database
      await this.logMessage({
        direction: 'outbound',
        content: this.extractMessageContent(request),
        type: request.type,
        status: 'sent',
        metadata: {
          whatsapp_message_id: data.messages?.[0]?.id,
          recipient: request.to,
          sent_at: new Date().toISOString(),
          request_type: request.type
        }
      });

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendTextMessage(to: string, text: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body: text,
        preview_url: true
      }
    });
  }

  async sendTemplate(
    to: string, 
    templateName: string, 
    languageCode: string = 'pt_BR',
    components?: any[]
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components || []
      }
    });
  }

  async sendInteractiveButtons(
    to: string, 
    text: string, 
    buttons: Array<{ id: string; title: string }>
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text
        },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20)
            }
          }))
        }
      }
    });
  }

  async sendInteractiveList(
    to: string, 
    text: string, 
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text
        },
        action: {
          button: buttonText,
          sections: sections.map(section => ({
            title: section.title,
            rows: section.rows.slice(0, 10).map(row => ({
              id: row.id,
              title: row.title.substring(0, 24),
              description: row.description?.substring(0, 72)
            }))
          }))
        }
      }
    });
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await fetch(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId
          })
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async setTypingIndicator(to: string, action: 'typing_on' | 'typing_off' = 'typing_on'): Promise<void> {
    try {
      await fetch(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'typing',
            typing: {
              action
            }
          })
        }
      );
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  async getBusinessProfile(): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/${this.phoneNumberId}/whatsapp_business_profile?access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to get business profile');
      }

      const data = await response.json();
      return data.data?.[0] || null;
    } catch (error) {
      console.error('Error getting business profile:', error);
      return null;
    }
  }

  async updateBusinessProfile(profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_url?: string;
    websites?: string[];
    vertical?: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...profile
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error updating business profile:', error);
      return false;
    }
  }

  async processWebhook(payload: any): Promise<void> {
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

  private async processIncomingMessage(message: any, contact?: any): Promise<void> {
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
          timestamp: message.timestamp,
          context: message.context
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

  private extractMessageContent(message: any): string {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'image':
        return message.image?.caption || 'Imagem enviada';
      case 'document':
        return message.document?.caption || 'Documento enviado';
      case 'audio':
        return 'Áudio enviado';
      case 'video':
        return 'Vídeo enviado';
      case 'interactive':
        if (message.interactive?.type === 'button_reply') {
          return message.interactive.button_reply.title;
        } else if (message.interactive?.type === 'list_reply') {
          return message.interactive.list_reply.title;
        }
        return 'Resposta interativa';
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
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('Credenciais não configuradas');
      }

      const response = await fetch(
        `${this.baseURL}/${this.phoneNumberId}?access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
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

  async configureWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/${this.phoneNumberId}/webhooks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            callback_url: webhookUrl,
            verify_token: this.webhookVerifyToken,
            fields: ['messages']
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error configuring webhook:', error);
      return false;
    }
  }

  getWebhookVerifyToken(): string {
    return this.webhookVerifyToken;
  }

  // Zaffira-specific helper methods
  async sendWelcomeMessage(to: string, customerName?: string): Promise<void> {
    const welcomeText = customerName 
      ? `Olá ${customerName}! 👋 Seja muito bem-vindo(a) à Zaffira! ✨ Sou a Raytchel e estou aqui para te ajudar a encontrar a joia perfeita. Como posso ajudar você hoje? 💎`
      : `Olá! 👋 Seja muito bem-vindo(a) à Zaffira! ✨ Sou a Raytchel e estou aqui para te ajudar a encontrar a joia perfeita. Como posso ajudar você hoje? 💎`;

    await this.sendTextMessage(to, welcomeText);
  }

  async sendJewelryOptions(to: string): Promise<void> {
    await this.sendInteractiveButtons(to, 
      "Que tipo de joia você está procurando? 💎", 
      [
        { id: "aliancas", title: "💍 Alianças" },
        { id: "aneis", title: "💎 Anéis" },
        { id: "outros", title: "✨ Outras Joias" }
      ]
    );
  }

  async sendMaterialOptions(to: string, jewelryType: string): Promise<void> {
    await this.sendInteractiveButtons(to,
      `Qual material você prefere para ${jewelryType}? ✨`,
      [
        { id: "ouro_amarelo", title: "🟡 Ouro Amarelo 18k" },
        { id: "ouro_branco", title: "⚪ Ouro Branco 18k" },
        { id: "ouro_rose", title: "🌹 Ouro Rosé 18k" }
      ]
    );
  }

  async sendAllianceModels(to: string): Promise<void> {
    await this.sendInteractiveList(to,
      "Escolha o modelo de aliança que mais combina com vocês:",
      "Ver Detalhes",
      [{
        title: "Modelos de Alianças",
        rows: [
          {
            id: "florida_tradicional",
            title: "Florida Tradicional",
            description: "4mm - R$ 3.465 o par"
          },
          {
            id: "florida_anatomica",
            title: "Florida Anatômica", 
            description: "4mm - R$ 3.700 o par"
          },
          {
            id: "florida_super",
            title: "Florida Super Anatômica",
            description: "4mm - R$ 3.900 o par"
          },
          {
            id: "classica_5mm",
            title: "Clássica 5mm",
            description: "5mm - R$ 4.100 o par"
          },
          {
            id: "premium_diamond",
            title: "Premium com Diamantes",
            description: "4mm - R$ 4.500 o par"
          }
        ]
      }]
    );
  }

  async sendPaymentOptions(to: string, totalValue: number): Promise<void> {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    await this.sendInteractiveButtons(to,
      `Como você gostaria de realizar o pagamento de ${formatCurrency(totalValue)}? 💳`,
      [
        { id: "pix_desconto", title: "💚 PIX (5% desconto)" },
        { id: "cartao_12x", title: "💳 12x sem juros" },
        { id: "entrada_saldo", title: "💰 Entrada + Saldo" }
      ]
    );
  }

  async sendAppointmentSlots(to: string, availableSlots: any[]): Promise<void> {
    const slots = availableSlots.slice(0, 10).map(slot => ({
      id: `slot_${slot.id}`,
      title: slot.date,
      description: `${slot.time} - ${slot.duration || '30min'}`
    }));

    await this.sendInteractiveList(to,
      "Escolha o melhor horário para sua visita à nossa loja:",
      "Agendar",
      [{
        title: "Horários Disponíveis",
        rows: slots
      }]
    );
  }

  async sendLocationInfo(to: string): Promise<void> {
    const locationText = `📍 **Zaffira Joalheria**

📧 Endereço: Rua das Joias, 123 - Centro, São Luís - MA
📞 Telefone: (98) 3333-4444
🕐 Horário: Segunda a Sábado, 9h às 18h

🗺️ Como chegar: https://maps.google.com/?q=Zaffira+Joalheria+São+Luís

Estamos ansiosos para recebê-lo! ✨`;

    await this.sendTextMessage(to, locationText);
  }
}