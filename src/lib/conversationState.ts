import { supabase } from './supabase';

export interface ConversationState {
  id?: string;
  contact_id: string;
  tenant_id: string;
  stage: 'initial' | 'greeting' | 'discovery' | 'product_interest' | 'price_inquiry' | 'customization' | 'appointment_request' | 'purchase_intent' | 'completed';
  last_intent?: string;
  last_product_interest?: string;
  preferred_material?: string;
  budget_range?: {
    min?: number;
    max?: number;
  };
  profile: {
    name?: string;
    city?: string;
    language?: string;
  };
  entities: Record<string, any>;
  preferences: Record<string, any>;
  interaction_count: number;
  last_interaction: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class ConversationStateService {
  private static instance: ConversationStateService;

  private constructor() {}

  static getInstance(): ConversationStateService {
    if (!ConversationStateService.instance) {
      ConversationStateService.instance = new ConversationStateService();
    }
    return ConversationStateService.instance;
  }

  async getState(contactId: string, tenantId: string): Promise<ConversationState | null> {
    try {
      const { data, error } = await supabase
        .from('conversation_state')
        .select('*')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        last_interaction: new Date(data.last_interaction),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error getting conversation state:', error);
      return null;
    }
  }

  async getOrCreateState(contactId: string, tenantId: string, initialProfile: any = {}): Promise<ConversationState> {
    let state = await this.getState(contactId, tenantId);
    
    if (!state) {
      state = await this.createInitialState(contactId, tenantId, initialProfile);
    }
    
    return state;
  }

  async createInitialState(contactId: string, tenantId: string, profile: any = {}): Promise<ConversationState> {
    const initialState: Omit<ConversationState, 'id'> = {
      contact_id: contactId,
      tenant_id: tenantId,
      stage: 'initial',
      profile: {
        language: 'pt-BR',
        ...profile
      },
      entities: {},
      preferences: {},
      interaction_count: 0,
      last_interaction: new Date()
    };

    try {
      const { data, error } = await supabase
        .from('conversation_state')
        .insert([initialState])
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        last_interaction: new Date(data.last_interaction),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating conversation state:', error);
      throw error;
    }
  }

  async updateState(updates: Partial<ConversationState> & { contact_id: string; tenant_id: string }): Promise<ConversationState> {
    try {
      const { data, error } = await supabase
        .from('conversation_state')
        .update({
          ...updates,
          last_interaction: new Date(),
          updated_at: new Date()
        })
        .eq('contact_id', updates.contact_id)
        .eq('tenant_id', updates.tenant_id)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        last_interaction: new Date(data.last_interaction),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error updating conversation state:', error);
      throw error;
    }
  }

  async advanceStage(contactId: string, tenantId: string, newStage: ConversationState['stage']): Promise<void> {
    await this.updateState({
      contact_id: contactId,
      tenant_id: tenantId,
      stage: newStage
    });
  }

  determineNextStage(currentStage: string, intent: string): ConversationState['stage'] {
    const stageTransitions: Record<string, Record<string, ConversationState['stage']>> = {
      'initial': {
        'SMALL_TALK': 'greeting',
        'PRECO': 'price_inquiry',
        'AGENDAR': 'appointment_request',
        'INFO_PRODUTO': 'product_interest'
      },
      'greeting': {
        'PRECO': 'price_inquiry',
        'AGENDAR': 'appointment_request',
        'INFO_PRODUTO': 'product_interest',
        'PERSONALIZACAO': 'customization'
      },
      'product_interest': {
        'PRECO': 'price_inquiry',
        'PERSONALIZACAO': 'customization',
        'AGENDAR': 'appointment_request'
      },
      'price_inquiry': {
        'AGENDAR': 'appointment_request',
        'PERSONALIZACAO': 'customization',
        'COMPRAR': 'purchase_intent'
      },
      'customization': {
        'PRECO': 'price_inquiry',
        'AGENDAR': 'appointment_request',
        'COMPRAR': 'purchase_intent'
      },
      'appointment_request': {
        'PRECO': 'price_inquiry',
        'COMPRAR': 'purchase_intent',
        'CONFIRMADO': 'completed'
      }
    };

    return stageTransitions[currentStage]?.[intent] || currentStage as ConversationState['stage'];
  }

  async getConversationHistory(contactId: string, tenantId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('conversation_state_id', (await this.getState(contactId, tenantId))?.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async extractEntities(message: string): Promise<Record<string, any>> {
    const entities: Record<string, any> = {};
    const messageLower = message.toLowerCase();

    // Extrair tipo de joia
    if (messageLower.includes('aliança') || messageLower.includes('alianca')) {
      entities.jewelry_type = 'aliança';
    } else if (messageLower.includes('anel')) {
      entities.jewelry_type = 'anel';
    } else if (messageLower.includes('brinco')) {
      entities.jewelry_type = 'brinco';
    } else if (messageLower.includes('colar')) {
      entities.jewelry_type = 'colar';
    }

    // Extrair material
    if (messageLower.includes('ouro amarelo')) {
      entities.material = 'ouro_amarelo';
    } else if (messageLower.includes('ouro branco')) {
      entities.material = 'ouro_branco';
    } else if (messageLower.includes('ouro rose') || messageLower.includes('ouro rosé')) {
      entities.material = 'ouro_rose';
    }

    // Extrair ocasião
    if (messageLower.includes('casamento') || messageLower.includes('casar')) {
      entities.occasion = 'casamento';
    } else if (messageLower.includes('noivado')) {
      entities.occasion = 'noivado';
    } else if (messageLower.includes('formatura')) {
      entities.occasion = 'formatura';
    }

    // Extrair faixa de preço
    const priceMatches = message.match(/R\$\s*[\d,.]+/g);
    if (priceMatches) {
      const prices = priceMatches.map(p => 
        parseFloat(p.replace('R$', '').replace(/\./g, '').replace(',', '.'))
      );
      entities.budget_range = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }

    return entities;
  }
}