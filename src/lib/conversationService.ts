import { supabase } from './supabase';
import { OpenAIIntegration } from './openaiIntegration';
import { WhatsAppMetaIntegration } from './whatsappMeta';

interface ConversationMessage {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  messageId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  userId: string;
  tenantId: string;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  messages: ConversationMessage[];
}

export class ConversationService {
  private static instance: ConversationService;
  private openai: OpenAIIntegration;
  private whatsapp: WhatsAppMetaIntegration;
  private botAwaitTime: number;

  private constructor() {
    this.openai = OpenAIIntegration.getInstance();
    this.whatsapp = WhatsAppMetaIntegration.getInstance();
    this.botAwaitTime = parseInt(import.meta.env.VITE_BOT_AWAIT || '15000');
  }

  static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  async getOrCreateConversation(userId: string, tenantId: string = '00000000-0000-0000-0000-000000000001'): Promise<Conversation> {
    try {
      // Try to find existing active conversation
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select(`
          *,
          messages (
            id,
            content,
            sender,
            created_at,
            metadata
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;

      if (existingChat) {
        return {
          id: existingChat.id,
          userId: existingChat.user_id,
          tenantId: existingChat.tenant_id,
          status: existingChat.status,
          createdAt: new Date(existingChat.created_at),
          updatedAt: new Date(existingChat.updated_at),
          messages: existingChat.messages?.map(m => ({
            id: m.id,
            conversationId: existingChat.id,
            content: m.content,
            role: m.sender === 'user' ? 'user' : 'assistant',
            timestamp: new Date(m.created_at),
            metadata: m.metadata
          })) || []
        };
      }

      // Create new conversation
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          user_id: userId,
          tenant_id: tenantId,
          status: 'active',
          metadata: {
            source: 'whatsapp',
            created_at: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (createError) throw createError;

      return {
        id: newChat.id,
        userId: newChat.user_id,
        tenantId: newChat.tenant_id,
        status: newChat.status,
        createdAt: new Date(newChat.created_at),
        updatedAt: new Date(newChat.updated_at),
        messages: []
      };
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  async saveMessage(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant',
    messageId?: string,
    metadata?: Record<string, any>
  ): Promise<ConversationMessage> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          chat_id: conversationId,
          content,
          sender: role === 'user' ? 'user' : 'bot',
          status: 'sent',
          metadata: {
            whatsapp_message_id: messageId,
            ...metadata
          }
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        conversationId: data.chat_id,
        content: data.content,
        role,
        messageId,
        timestamp: new Date(data.created_at),
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async getConversationHistory(conversationId: string, limit: number = 20): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).reverse().map(msg => ({
        id: msg.id,
        conversationId: msg.chat_id,
        content: msg.content,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        messageId: msg.metadata?.whatsapp_message_id,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async processMessage(message: string, userId: string, messageId?: string): Promise<void> {
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(userId);

      // Save user message
      await this.saveMessage(
        conversation.id,
        message,
        'user',
        messageId,
        {
          timestamp: new Date().toISOString(),
          source: 'whatsapp'
        }
      );

      // Get conversation history for context
      const history = await this.getConversationHistory(conversation.id);
      
      // Format messages for OpenAI
      const openaiMessages = this.formatMessagesForOpenAI(history);

      // Add current message to context
      openaiMessages.push({
        role: 'user',
        content: message
      });

      // Wait before responding (simulate human-like delay)
      await new Promise(resolve => setTimeout(resolve, Math.min(this.botAwaitTime, 5000)));

      // Generate AI response
      const aiResponse = await this.openai.generateResponse(openaiMessages, userId);

      // Send response via WhatsApp
      const whatsappResponse = await this.whatsapp.sendMessage(userId, aiResponse);

      // Save AI response
      await this.saveMessage(
        conversation.id,
        aiResponse,
        'assistant',
        whatsappResponse.messages?.[0]?.id,
        {
          timestamp: new Date().toISOString(),
          openai_model: 'gpt-3.5-turbo',
          whatsapp_response: whatsappResponse
        }
      );

      // Update conversation timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Send fallback message
      try {
        await this.whatsapp.sendMessage(
          userId, 
          'Desculpe, estou tendo dificuldades técnicas no momento. Um de nossos especialistas entrará em contato em breve. 🤝'
        );
      } catch (fallbackError) {
        console.error('Error sending fallback message:', fallbackError);
      }
    }
  }

  private formatMessagesForOpenAI(messages: ConversationMessage[]): Array<{ role: string; content: string }> {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  async getConversationStats(tenantId: string): Promise<any> {
    try {
      const { data: stats, error } = await supabase.rpc('get_conversation_stats', {
        p_tenant_id: tenantId
      });

      if (error) throw error;
      return stats;
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        total_conversations: 0,
        active_conversations: 0,
        avg_response_time: '0s',
        satisfaction_rate: 0
      };
    }
  }
}