import { supabase } from './supabase';
import { ApiKeyManager } from './apiKeys';

interface WhatsAppMessage {
  type: 'text' | 'image' | 'template' | 'document' | 'video' | 'audio' | 'location' | 'contacts';
  content: string;
  metadata?: Record<string, any>;
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  components: {
    type: string;
    parameters: Array<{
      type: string;
      text?: string;
      currency?: {
        fallback_value: string;
        code: string;
        amount_1000: number;
      };
      date_time?: {
        fallback_value: string;
      };
      image?: {
        link: string;
      };
      document?: {
        link: string;
        filename: string;
      };
    }>;
  }[];
}

interface WhatsAppConfig {
  phoneNumber: string;
  webhookUrl: string;
  businessProfile?: {
    name: string;
    description: string;
    vertical: string;
    websites?: string[];
  };
  messageTemplates?: Record<string, WhatsAppTemplate>;
}

export class WhatsAppIntegration {
  private static instance: WhatsAppIntegration;
  private config: WhatsAppConfig | null = null;
  private retryAttempts = 3;
  private retryDelay = 1000;
  private apiKeyManager: ApiKeyManager;

  private constructor() {
    this.apiKeyManager = ApiKeyManager.getInstance();
  }

  static getInstance(): WhatsAppIntegration {
    if (!WhatsAppIntegration.instance) {
      WhatsAppIntegration.instance = new WhatsAppIntegration();
    }
    return WhatsAppIntegration.instance;
  }

  async initialize(): Promise<void> {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .single();

    if (error) throw error;
    this.config = data;

    // Load message templates
    const { data: templates } = await supabase
      .from('whatsapp_templates')
      .select('*');

    if (templates) {
      this.config.messageTemplates = templates.reduce((acc, template) => ({
        ...acc,
        [template.name]: template
      }), {});
    }
  }

  async sendMessage(to: string, message: WhatsAppMessage): Promise<void> {
    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        // Get API key
        const apiKey = await this.apiKeyManager.getKey('whatsapp');
        
        // Check rate limit
        const isAllowed = await this.apiKeyManager.checkRateLimit(apiKey);
        if (!isAllowed) {
          throw new Error('Rate limit exceeded for WhatsApp API');
        }

        const formattedPhone = this.formatPhoneNumber(to);
        const payload = this.buildMessagePayload(formattedPhone, message);

        // This is a placeholder for the actual API call
        // In a real implementation, you would make an HTTP request to the WhatsApp API
        console.log('Sending WhatsApp message:', payload);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        // Track successful API usage
        await this.apiKeyManager.trackUsage(apiKey, {
          path: '/v1/messages',
          method: 'POST',
          status: 200,
          metadata: {
            message_type: message.type,
            recipient: formattedPhone
          }
        });

        await this.logMessage({
          direction: 'outbound',
          content: message.content,
          type: message.type,
          status: 'sent',
          metadata: {
            ...message.metadata,
            sent_at: new Date().toISOString()
          }
        });

        return;
      } catch (error) {
        attempt++;
        if (attempt === this.retryAttempts) {
          console.error('Erro ao enviar mensagem WhatsApp:', error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  async sendTemplate(
    to: string, 
    templateName: string, 
    params: Record<string, any>
  ): Promise<void> {
    const template = this.config?.messageTemplates?.[templateName];
    if (!template) {
      throw new Error(`Template não encontrado: ${templateName}`);
    }

    const message: WhatsAppMessage = {
      type: 'template',
      content: templateName,
      metadata: {
        template_name: templateName,
        language: template.language,
        components: this.formatTemplateParams(params, template)
      }
    };

    return this.sendMessage(to, message);
  }

  async sendRichMedia(
    to: string,
    type: 'image' | 'document' | 'video' | 'audio',
    url: string,
    caption?: string,
    filename?: string
  ): Promise<void> {
    const message: WhatsAppMessage = {
      type,
      content: url,
      metadata: {
        caption,
        filename,
        mime_type: this.getMimeType(url)
      }
    };

    return this.sendMessage(to, message);
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<void> {
    const message: WhatsAppMessage = {
      type: 'location',
      content: `${latitude},${longitude}`,
      metadata: {
        latitude,
        longitude,
        name,
        address
      }
    };

    return this.sendMessage(to, message);
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      const { messages, statuses } = payload;
      
      // Handle incoming messages
      if (messages) {
        for (const message of messages) {
          await this.processIncomingMessage(message);
        }
      }

      // Handle message status updates
      if (statuses) {
        for (const status of statuses) {
          await this.updateMessageStatus(status);
        }
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  async updateConfig(config: Partial<WhatsAppConfig>): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({
          phone_number: config.phoneNumber,
          webhook_url: config.webhookUrl,
          business_profile: config.businessProfile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      if (this.config) {
        this.config = { ...this.config, ...config };
      } else {
        this.config = config as WhatsAppConfig;
      }
    } catch (error) {
      console.error('Error updating WhatsApp config:', error);
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    const numbers = phone.replace(/\D/g, '');
    return numbers.startsWith('55') ? numbers : `55${numbers}`;
  }

  private buildMessagePayload(to: string, message: WhatsAppMessage): any {
    const base = {
      to,
      recipient_type: 'individual'
    };

    switch (message.type) {
      case 'text':
        return {
          ...base,
          type: 'text',
          text: { body: message.content }
        };

      case 'template':
        return {
          ...base,
          type: 'template',
          template: {
            name: message.content,
            language: {
              code: message.metadata?.language || 'pt_BR'
            },
            components: message.metadata?.components || []
          }
        };

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        return {
          ...base,
          type: message.type,
          [message.type]: {
            link: message.content,
            caption: message.metadata?.caption,
            filename: message.metadata?.filename
          }
        };

      case 'location':
        const [latitude, longitude] = message.content.split(',').map(Number);
        return {
          ...base,
          type: 'location',
          location: {
            latitude,
            longitude,
            name: message.metadata?.name,
            address: message.metadata?.address
          }
        };

      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }
  }

  private formatTemplateParams(params: Record<string, any>, template: WhatsAppTemplate): any[] {
    const components = [];

    template.components.forEach(component => {
      const formattedComponent: any = {
        type: component.type
      };

      if (component.parameters) {
        formattedComponent.parameters = component.parameters.map(param => {
          const value = params[param.type];
          if (value === undefined) return param;

          switch (param.type) {
            case 'text':
              return { type: 'text', text: String(value) };
            case 'currency':
              return {
                type: 'currency',
                currency: {
                  fallback_value: `${value}`,
                  code: 'BRL',
                  amount_1000: Math.round(value * 1000)
                }
              };
            case 'date_time':
              return {
                type: 'date_time',
                date_time: {
                  fallback_value: value instanceof Date ? value.toISOString() : value
                }
              };
            default:
              return param;
          }
        });
      }

      components.push(formattedComponent);
    });

    return components;
  }

  private async processIncomingMessage(message: any): Promise<void> {
    // Log incoming message
    await this.logMessage({
      direction: 'inbound',
      content: this.extractMessageContent(message),
      type: message.type,
      status: 'received',
      metadata: {
        whatsapp_message_id: message.id,
        timestamp: new Date().toISOString(),
        sender: message.from,
        context: message.context
      }
    });

    // Check auto-reply settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('auto_reply, business_hours')
      .single();

    if (settings?.auto_reply) {
      const isBusinessHours = this.isWithinBusinessHours(settings.business_hours);
      if (!isBusinessHours) {
        await this.sendOutOfHoursMessage(message.from);
      }
    }
  }

  private async updateMessageStatus(status: any): Promise<void> {
    try {
      await supabase
        .from('whatsapp_messages')
        .update({ 
          status: status.status,
          metadata: {
            status_timestamp: status.timestamp,
            status_conversation: status.conversation
          }
        })
        .eq('metadata->whatsapp_message_id', status.id);
    } catch (error) {
      console.error('Error updating message status:', error);
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
      await supabase
        .from('whatsapp_messages')
        .insert([{
          ...data,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  }

  private isWithinBusinessHours(hours: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    const [startHour, startMinute] = hours.start.split(':').map(Number);
    const [endHour, endMinute] = hours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
  }

  private async sendOutOfHoursMessage(to: string): Promise<void> {
    const { data: template } = await supabase
      .from('auto_responses')
      .select('response')
      .eq('category', 'out_of_hours')
      .single();

    if (template?.response) {
      await this.sendMessage(to, {
        type: 'text',
        content: template.response
      });
    }
  }

  private extractMessageContent(message: any): string {
    switch (message.type) {
      case 'text':
        return message.text.body;
      case 'image':
        return message.image.caption || message.image.link;
      case 'document':
        return message.document.caption || message.document.filename;
      case 'location':
        return `${message.location.latitude},${message.location.longitude}`;
      default:
        return message.type;
    }
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}