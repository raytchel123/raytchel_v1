import { supabase } from './supabase';
import { OpenAIService } from './openai';

export interface ConversationStage {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  nextStages: string[];
  responseTemplate: string;
  questions: string[];
  objectives: string[];
}

export interface CustomerJourney {
  contactId: string;
  tenantId: string;
  currentStage: string;
  completedStages: string[];
  preferences: Record<string, any>;
  interests: string[];
  objections: string[];
  urgency: 'low' | 'medium' | 'high';
  budget: {
    mentioned?: number;
    estimated?: number;
    range?: { min: number; max: number };
  };
  timeline: Array<{
    stage: string;
    timestamp: Date;
    duration: number;
    outcome: 'completed' | 'abandoned' | 'transferred';
  }>;
}

export class ConversationFlowService {
  private static instance: ConversationFlowService;
  private openai: OpenAIService;

  private constructor() {
    this.openai = OpenAIService.getInstance();
  }

  static getInstance(): ConversationFlowService {
    if (!ConversationFlowService.instance) {
      ConversationFlowService.instance = new ConversationFlowService();
    }
    return ConversationFlowService.instance;
  }

  // Estágios do funil humanizado da Zaffira
  private readonly stages: ConversationStage[] = [
    {
      id: 'welcome',
      name: 'Acolhimento',
      description: 'Receber o cliente com carinho e descobrir sua necessidade',
      triggers: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite'],
      nextStages: ['discovery', 'product_interest'],
      responseTemplate: 'Olá! {name} Seja muito bem-vindo(a) à Zaffira! ✨ Sou a Raytchel e estou aqui para te ajudar a encontrar a joia perfeita. Que momento especial você está planejando? 💎',
      questions: [
        'Que tipo de joia você está procurando?',
        'É para uma ocasião especial?',
        'Já tem alguma ideia em mente?'
      ],
      objectives: ['Criar conexão', 'Identificar necessidade', 'Estabelecer confiança']
    },
    {
      id: 'discovery',
      name: 'Descoberta',
      description: 'Entender profundamente a necessidade e ocasião',
      triggers: ['casamento', 'noivado', 'presente', 'aniversário'],
      nextStages: ['product_presentation', 'customization_discussion'],
      responseTemplate: 'Que lindo! {occasion} é um momento muito especial! 💕 Para tornar ainda mais único, me conta: qual estilo combina mais com {recipient}? Algo mais clássico e elegante ou moderno e diferente?',
      questions: [
        'Para quem é a joia?',
        'Qual o estilo preferido?',
        'Tem alguma referência?',
        'Qual a ocasião exata?'
      ],
      objectives: ['Qualificar necessidade', 'Entender estilo', 'Identificar orçamento']
    },
    {
      id: 'product_presentation',
      name: 'Apresentação de Produtos',
      description: 'Mostrar opções personalizadas baseadas no perfil',
      triggers: ['mostrar', 'ver', 'opções', 'modelos'],
      nextStages: ['price_discussion', 'customization_discussion'],
      responseTemplate: 'Perfeito! Baseado no que você me contou, separei algumas opções que vão ficar lindas! {product_suggestions} Qual dessas opções mais chamou sua atenção? 😊',
      questions: [
        'Qual modelo mais te agrada?',
        'Prefere algo mais simples ou elaborado?',
        'Gostaria de ver outras opções?'
      ],
      objectives: ['Apresentar soluções', 'Gerar interesse', 'Qualificar preferências']
    },
    {
      id: 'price_discussion',
      name: 'Conversa sobre Investimento',
      description: 'Abordar valores de forma consultiva e educativa',
      triggers: ['preço', 'valor', 'custo', 'quanto'],
      nextStages: ['payment_options', 'appointment_scheduling'],
      responseTemplate: 'Ótima escolha! {product_name} é uma das nossas peças mais especiais. O investimento para essa joia é de {price}, e temos condições especiais que podem facilitar para você. Que tal conversarmos sobre as opções? 💳',
      questions: [
        'Qual forma de pagamento prefere?',
        'Gostaria de parcelar?',
        'Tem algum orçamento em mente?'
      ],
      objectives: ['Apresentar valor', 'Facilitar pagamento', 'Remover objeções']
    },
    {
      id: 'customization_discussion',
      name: 'Personalização',
      description: 'Explorar opções de personalização para tornar única',
      triggers: ['personalizar', 'gravar', 'diferente', 'único'],
      nextStages: ['price_discussion', 'appointment_scheduling'],
      responseTemplate: 'Que ideia maravilhosa! Personalizar torna a joia ainda mais especial e única! 🎨 Podemos fazer gravações, escolher acabamentos especiais, ou até mesmo criar algo totalmente exclusivo. O que você tem em mente?',
      questions: [
        'Que tipo de personalização imagina?',
        'Tem alguma gravação em mente?',
        'Prefere que acabamento?'
      ],
      objectives: ['Agregar valor', 'Criar exclusividade', 'Aumentar ticket']
    },
    {
      id: 'appointment_scheduling',
      name: 'Agendamento de Visita',
      description: 'Facilitar visita presencial para fechar venda',
      triggers: ['agendar', 'visita', 'loja', 'conhecer'],
      nextStages: ['appointment_confirmed', 'follow_up'],
      responseTemplate: 'Perfeito! Nada melhor que ver e sentir a qualidade das nossas joias pessoalmente! 🏪 Nossa loja fica no centro de São Luís e temos horários flexíveis. Que dia e período funcionam melhor para você?',
      questions: [
        'Qual o melhor dia da semana?',
        'Prefere manhã ou tarde?',
        'Tem alguma urgência?'
      ],
      objectives: ['Agendar visita', 'Qualificar urgência', 'Confirmar interesse']
    },
    {
      id: 'objection_handling',
      name: 'Tratamento de Objeções',
      description: 'Abordar preocupações de forma empática e solucionadora',
      triggers: ['caro', 'alto', 'pensando', 'decidir'],
      nextStages: ['price_discussion', 'appointment_scheduling', 'follow_up'],
      responseTemplate: 'Entendo perfeitamente sua preocupação! {objection_acknowledgment} Que tal conhecer nossas condições especiais? Temos opções que podem facilitar muito para você, e o mais importante: garantia vitalícia! 🛡️',
      questions: [
        'Qual seria um investimento confortável?',
        'Gostaria de conhecer nossas facilidades?',
        'Tem algum prazo em mente?'
      ],
      objectives: ['Remover objeções', 'Apresentar soluções', 'Manter engajamento']
    },
    {
      id: 'follow_up',
      name: 'Acompanhamento',
      description: 'Manter relacionamento e reativar interesse',
      triggers: ['depois', 'pensar', 'decidir'],
      nextStages: ['discovery', 'appointment_scheduling'],
      responseTemplate: 'Sem problemas! Decisões importantes merecem reflexão mesmo! 😊 Vou deixar você à vontade, mas saiba que estou aqui sempre que precisar. Posso te enviar algumas inspirações por aqui?',
      questions: [
        'Gostaria de receber novidades?',
        'Tem alguma dúvida específica?',
        'Posso ajudar com mais alguma coisa?'
      ],
      objectives: ['Manter relacionamento', 'Nutrir lead', 'Reativar interesse']
    }
  ];

  async processMessage(
    message: string,
    contactId: string,
    tenantId: string
  ): Promise<{
    response: string;
    nextQuestions?: string[];
    stageAdvanced?: boolean;
    urgencyDetected?: boolean;
  }> {
    try {
      // 1. Carregar jornada do cliente
      const journey = await this.getCustomerJourney(contactId, tenantId);
      
      // 2. Analisar mensagem com contexto
      const analysis = await this.analyzeMessageWithContext(message, journey);
      
      // 3. Determinar próximo estágio
      const nextStage = this.determineNextStage(analysis.intent, journey.currentStage, analysis.entities);
      
      // 4. Gerar resposta humanizada
      const response = await this.generateHumanizedResponse(
        message,
        analysis,
        journey,
        nextStage
      );
      
      // 5. Atualizar jornada do cliente
      await this.updateCustomerJourney(contactId, tenantId, {
        currentStage: nextStage,
        preferences: { ...journey.preferences, ...analysis.preferences },
        interests: [...new Set([...journey.interests, ...analysis.interests])],
        urgency: analysis.urgency || journey.urgency
      });
      
      return {
        response: response.message,
        nextQuestions: response.followUpQuestions,
        stageAdvanced: nextStage !== journey.currentStage,
        urgencyDetected: analysis.urgency === 'high'
      };
      
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: 'Desculpe, tive um pequeno problema técnico. Pode repetir sua mensagem? Estou aqui para te ajudar! 😊'
      };
    }
  }

  private async analyzeMessageWithContext(
    message: string,
    journey: CustomerJourney
  ): Promise<{
    intent: string;
    entities: Record<string, any>;
    preferences: Record<string, any>;
    interests: string[];
    urgency: 'low' | 'medium' | 'high';
    sentiment: 'positive' | 'neutral' | 'negative';
    objections: string[];
  }> {
    const messageLower = message.toLowerCase();
    
    // Detectar intenção principal
    let intent = 'general_inquiry';
    
    if (messageLower.includes('oi') || messageLower.includes('olá')) {
      intent = 'greeting';
    } else if (messageLower.includes('preço') || messageLower.includes('valor') || messageLower.includes('quanto')) {
      intent = 'price_inquiry';
    } else if (messageLower.includes('agendar') || messageLower.includes('visita') || messageLower.includes('loja')) {
      intent = 'appointment_request';
    } else if (messageLower.includes('aliança') || messageLower.includes('anel') || messageLower.includes('joia')) {
      intent = 'product_inquiry';
    } else if (messageLower.includes('personalizar') || messageLower.includes('gravar') || messageLower.includes('único')) {
      intent = 'customization_request';
    } else if (messageLower.includes('caro') || messageLower.includes('alto') || messageLower.includes('pensando')) {
      intent = 'price_objection';
    }
    
    // Extrair entidades
    const entities: Record<string, any> = {};
    
    // Tipo de joia
    if (messageLower.includes('aliança')) entities.jewelry_type = 'aliança';
    if (messageLower.includes('anel')) entities.jewelry_type = 'anel';
    if (messageLower.includes('brinco')) entities.jewelry_type = 'brinco';
    if (messageLower.includes('colar')) entities.jewelry_type = 'colar';
    
    // Material
    if (messageLower.includes('ouro amarelo')) entities.material = 'ouro_amarelo';
    if (messageLower.includes('ouro branco')) entities.material = 'ouro_branco';
    if (messageLower.includes('ouro rosé') || messageLower.includes('ouro rose')) entities.material = 'ouro_rose';
    
    // Ocasião
    if (messageLower.includes('casamento')) entities.occasion = 'casamento';
    if (messageLower.includes('noivado')) entities.occasion = 'noivado';
    if (messageLower.includes('formatura')) entities.occasion = 'formatura';
    if (messageLower.includes('aniversário')) entities.occasion = 'aniversario';
    
    // Detectar urgência
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (messageLower.includes('urgente') || messageLower.includes('rápido') || messageLower.includes('hoje')) {
      urgency = 'high';
    } else if (messageLower.includes('sem pressa') || messageLower.includes('pensando')) {
      urgency = 'low';
    }
    
    // Detectar sentimento
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const positiveWords = ['adorei', 'lindo', 'perfeito', 'maravilhoso', 'ótimo'];
    const negativeWords = ['caro', 'difícil', 'complicado', 'problema'];
    
    if (positiveWords.some(word => messageLower.includes(word))) {
      sentiment = 'positive';
    } else if (negativeWords.some(word => messageLower.includes(word))) {
      sentiment = 'negative';
    }
    
    // Detectar objeções
    const objections: string[] = [];
    if (messageLower.includes('caro') || messageLower.includes('alto')) objections.push('price');
    if (messageLower.includes('pensando') || messageLower.includes('decidir')) objections.push('decision');
    if (messageLower.includes('tempo') || messageLower.includes('pressa')) objections.push('timing');
    
    return {
      intent,
      entities,
      preferences: {},
      interests: Object.values(entities).filter(Boolean),
      urgency,
      sentiment,
      objections
    };
  }

  private async generateHumanizedResponse(
    message: string,
    analysis: any,
    journey: CustomerJourney,
    nextStage: string
  ): Promise<{
    message: string;
    followUpQuestions: string[];
  }> {
    const stage = this.stages.find(s => s.id === nextStage);
    if (!stage) {
      return {
        message: 'Como posso te ajudar hoje? 😊',
        followUpQuestions: []
      };
    }

    // Personalizar resposta baseada no contexto
    let response = stage.responseTemplate;
    
    // Substituir variáveis dinâmicas
    response = response.replace('{name}', journey.preferences.name ? `${journey.preferences.name}! ` : '');
    response = response.replace('{occasion}', analysis.entities.occasion || 'essa ocasião especial');
    response = response.replace('{recipient}', journey.preferences.recipient || 'você');
    
    // Adicionar contexto baseado na jornada
    if (journey.completedStages.length > 0) {
      response = `Continuando nossa conversa... ${response}`;
    }
    
    // Ajustar tom baseado no sentimento
    if (analysis.sentiment === 'negative') {
      response = `Entendo sua preocupação! ${response}`;
    } else if (analysis.sentiment === 'positive') {
      response = `Que alegria! ${response}`;
    }
    
    // Adicionar urgência se detectada
    if (analysis.urgency === 'high') {
      response += '\n\nVejo que você tem urgência! Posso priorizar seu atendimento. 🚀';
    }
    
    // Gerar perguntas de follow-up inteligentes
    const followUpQuestions = await this.generateFollowUpQuestions(analysis, journey, stage);
    
    return {
      message: response,
      followUpQuestions
    };
  }

  private async generateFollowUpQuestions(
    analysis: any,
    journey: CustomerJourney,
    stage: ConversationStage
  ): Promise<string[]> {
    const questions: string[] = [];
    
    // Perguntas baseadas no que ainda não sabemos
    if (!journey.preferences.occasion && !analysis.entities.occasion) {
      questions.push('É para alguma ocasião especial?');
    }
    
    if (!journey.preferences.jewelry_type && !analysis.entities.jewelry_type) {
      questions.push('Que tipo de joia você tem em mente?');
    }
    
    if (!journey.preferences.material && !analysis.entities.material) {
      questions.push('Tem preferência por algum tipo de ouro?');
    }
    
    if (!journey.budget.mentioned && stage.id === 'price_discussion') {
      questions.push('Tem algum orçamento em mente para investir?');
    }
    
    // Perguntas específicas do estágio
    const stageQuestions = stage.questions.filter(q => 
      !questions.some(existing => existing.toLowerCase().includes(q.toLowerCase().split(' ')[0]))
    );
    
    return [...questions, ...stageQuestions].slice(0, 2); // Máximo 2 perguntas
  }

  private determineNextStage(
    intent: string,
    currentStage: string,
    entities: Record<string, any>
  ): string {
    const stageTransitions: Record<string, Record<string, string>> = {
      'welcome': {
        'product_inquiry': 'discovery',
        'price_inquiry': 'price_discussion',
        'appointment_request': 'appointment_scheduling',
        'general_inquiry': 'discovery'
      },
      'discovery': {
        'product_inquiry': 'product_presentation',
        'price_inquiry': 'price_discussion',
        'customization_request': 'customization_discussion',
        'appointment_request': 'appointment_scheduling'
      },
      'product_presentation': {
        'price_inquiry': 'price_discussion',
        'customization_request': 'customization_discussion',
        'appointment_request': 'appointment_scheduling'
      },
      'price_discussion': {
        'price_objection': 'objection_handling',
        'appointment_request': 'appointment_scheduling',
        'customization_request': 'customization_discussion'
      },
      'customization_discussion': {
        'price_inquiry': 'price_discussion',
        'appointment_request': 'appointment_scheduling'
      },
      'objection_handling': {
        'price_inquiry': 'price_discussion',
        'appointment_request': 'appointment_scheduling',
        'general_inquiry': 'follow_up'
      }
    };
    
    return stageTransitions[currentStage]?.[intent] || currentStage;
  }

  async getCustomerJourney(contactId: string, tenantId: string): Promise<CustomerJourney> {
    try {
      const { data, error } = await supabase
        .from('conversation_state')
        .select('*')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Criar jornada inicial
        return await this.createInitialJourney(contactId, tenantId);
      }

      return {
        contactId,
        tenantId,
        currentStage: data.stage || 'welcome',
        completedStages: data.completed_stages || [],
        preferences: data.profile || {},
        interests: data.entities?.interests || [],
        objections: data.entities?.objections || [],
        urgency: data.entities?.urgency || 'medium',
        budget: data.entities?.budget || {},
        timeline: data.timeline || []
      };
    } catch (error) {
      console.error('Error getting customer journey:', error);
      return await this.createInitialJourney(contactId, tenantId);
    }
  }

  private async createInitialJourney(contactId: string, tenantId: string): Promise<CustomerJourney> {
    const journey: CustomerJourney = {
      contactId,
      tenantId,
      currentStage: 'welcome',
      completedStages: [],
      preferences: {},
      interests: [],
      objections: [],
      urgency: 'medium',
      budget: {},
      timeline: [{
        stage: 'welcome',
        timestamp: new Date(),
        duration: 0,
        outcome: 'completed'
      }]
    };

    try {
      await supabase
        .from('conversation_state')
        .insert([{
          contact_id: contactId,
          tenant_id: tenantId,
          stage: 'welcome',
          profile: {},
          entities: {},
          completed_stages: [],
          timeline: journey.timeline
        }]);
    } catch (error) {
      console.error('Error creating initial journey:', error);
    }

    return journey;
  }

  async updateCustomerJourney(
    contactId: string,
    tenantId: string,
    updates: Partial<CustomerJourney>
  ): Promise<void> {
    try {
      await supabase
        .from('conversation_state')
        .update({
          stage: updates.currentStage,
          profile: updates.preferences,
          entities: {
            interests: updates.interests,
            objections: updates.objections,
            urgency: updates.urgency,
            budget: updates.budget
          },
          completed_stages: updates.completedStages,
          timeline: updates.timeline,
          updated_at: new Date().toISOString()
        })
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId);
    } catch (error) {
      console.error('Error updating customer journey:', error);
    }
  }

  async getConversationInsights(contactId: string, tenantId: string): Promise<any> {
    const journey = await this.getCustomerJourney(contactId, tenantId);
    const currentStage = this.stages.find(s => s.id === journey.currentStage);
    
    return {
      customer_profile: {
        name: journey.preferences.name || 'Cliente',
        current_stage: journey.currentStage,
        stage_description: currentStage?.description,
        interaction_count: journey.timeline.length,
        last_interaction: journey.timeline[journey.timeline.length - 1]?.timestamp,
        urgency: journey.urgency,
        sentiment: journey.preferences.sentiment || 'neutral'
      },
      journey_progress: {
        completed_stages: journey.completedStages,
        current_objectives: currentStage?.objectives || [],
        next_questions: currentStage?.questions || []
      },
      interests: journey.interests,
      preferences: journey.preferences,
      objections: journey.objections,
      budget_info: journey.budget
    };
  }

  // Método para detectar quando transferir para humano
  shouldTransferToHuman(journey: CustomerJourney, analysis: any): boolean {
    // Transferir se:
    // 1. Cliente expressou frustração múltiplas vezes
    if (journey.objections.length >= 3) return true;
    
    // 2. Está no estágio de fechamento há muito tempo
    if (journey.currentStage === 'price_discussion' && journey.timeline.length > 10) return true;
    
    // 3. Solicitou explicitamente falar com humano
    if (analysis.intent === 'human_request') return true;
    
    // 4. Orçamento muito alto (acima de R$ 10.000)
    if (journey.budget.mentioned && journey.budget.mentioned > 10000) return true;
    
    return false;
  }
}