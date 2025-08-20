      );

      // Create bot message with humanized response
      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: flowResult.response,
        sender: 'bot',
        timestamp: new Date(),
        intent: 'conversational',
        confidence: 0.95,
        status: 'sent',
        metadata: {
          stage_advanced: flowResult.stageAdvanced,
          urgency_detected: flowResult.urgencyDetected,
          follow_up_questions: flowResult.nextQuestions,
          conversation_flow: true
        }
      };

      // Save message
      await this.saveMessage(botMessage, chatId, context, { intent: 'conversational', confidence: 0.95 });

      return botMessage;
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Return friendly fallback
      return {
        id: crypto.randomUUID(),
        content: 'Desculpe, tive um pequeno problema técnico. Pode repetir sua mensagem? Estou aqui para te ajudar! 😊',
        sender: 'bot',
        timestamp: new Date(),
        intent: 'fallback',
        confidence: 0.5,
        status: 'sent',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
import { supabase } from './supabase';
import { OpenAIService } from './openai';
import { ConversationFlowService } from './conversationFlow';
import { ConversationStateService } from './conversationState';
import { WhatsAppFallbackService } from './whatsappFallback';
import type { ConversationState } from './conversationState';

export class WhatsAppAI {
  private static instance: WhatsAppAI;
  private openai: OpenAIService;
  private interactive: WhatsAppInteractiveService;
  private conversationFlow: ConversationFlowService;
  private maxRetries = 3;
  private retryDelay = 1000;

  private constructor() {
    this.openai = OpenAIService.getInstance();
    this.conversationFlow = ConversationFlowService.getInstance();
    this.conversationState = ConversationStateService.getInstance();
  }

  async processMessage(
    message: string, 
    contactId: string, 
    tenantId: string,
    isMetaProvider: boolean = true
  ): Promise<{
    response: string;
    shouldSendInteractive?: boolean;
    interactiveType?: 'buttons' | 'list';
    interactiveData?: any;
  }> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.maxRetries) {
      try {
        // Get conversation state
        const state = await this.conversationState.getOrCreateState(contactId, tenantId);
        
        // Analyze intent with context
        const intentAnalysis = await this.analyzeIntentWithContext(message, state);
        
        // Generate contextual response
        const response = await this.generateContextualResponse(
          message, 
          intentAnalysis, 
          state, 
          contactId,
          isMetaProvider
        );
        
        // Update conversation state
        await this.conversationState.updateState({
          contact_id: contactId,
          tenant_id: tenantId,
          stage: this.determineNewStage(intentAnalysis.intent, state.stage),
          last_intent: intentAnalysis.intent,
          entities: { ...state.entities, ...intentAnalysis.entities },
          interaction_count: state.interaction_count + 1
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        if (retryCount < this.maxRetries) {
          console.warn(`Error processing message (attempt ${retryCount}/${this.maxRetries}):`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount - 1)));
          continue;
        }

        // Return fallback response on final retry
        return {
          response: 'Desculpe, estou tendo dificuldades técnicas no momento. Posso transferir para um de nossos especialistas? 🤝'
        };
      }
    }
  }

  async processInteractiveResponse(
    contactId: string,
    tenantId: string,
    interactiveResponse: any
  ): Promise<{ shouldRespond: boolean; message?: string }> {
    try {
      const buttonId = interactiveResponse.id;
      const state = await this.conversationState.getOrCreateState(contactId, tenantId);
      
      // Mapear resposta interativa para ação
      switch (buttonId) {
        case 'ver_valores':
          await this.interactive.sendJewelryTypeSelector(contactId);
          return { shouldRespond: false };
          
        case 'agendar':
          const slots = await this.getAvailableSlots(tenantId);
          await this.interactive.sendAppointmentSlots(contactId, slots);
          return { shouldRespond: false };
          
        case 'localizacao':
          await this.interactive.sendLocationButton(
            contactId,
            "📍 **Zaffira Joias Personalizadas**",
            -2.5307, -44.2958,
            "Zaffira Joias",
            "Rua das Joias, 123 - Centro, São Luís - MA"
          );
          return { shouldRespond: false };
          
        case 'aliancas':
          await this.interactive.sendMaterialSelector(contactId, 'suas alianças');
          return { shouldRespond: false };
          
        default:
          return { 
            shouldRespond: true, 
            message: 'Entendi sua escolha! Como posso ajudar você agora? 😊' 
          };
      }
    } catch (error) {
      console.error('Error processing interactive response:', error);
      return { 
        shouldRespond: true, 
        message: 'Desculpe, houve um erro. Como posso ajudar você? 😊' 
      };
    }
  }

  async getConversationInsights(contactId: string, tenantId: string): Promise<any> {
    try {
      const state = await this.conversationState.getState(contactId, tenantId);
      const history = await this.conversationState.getConversationHistory(contactId, tenantId);
      
      return {
        customer_profile: {
          name: state?.profile?.name || 'Cliente',
          current_stage: state?.stage || 'initial',
          interaction_count: state?.interaction_count || 0,
          last_interaction: state?.last_interaction || new Date(),
          preferred_material: state?.entities?.material,
          budget_range: state?.entities?.budget_range
        },
        conversation_flow: history,
        interests: state?.entities || {},
        preferences: state?.preferences || {}
      };
    } catch (error) {
      console.error('Error getting conversation insights:', error);
      return null;
    }
  }

  private async generateContextualResponse(
    message: string,
    intentAnalysis: any,
    state: ConversationState,
    contactId: string,
    isMetaProvider: boolean
  ): Promise<{
    response: string;
    shouldSendInteractive?: boolean;
    interactiveType?: 'buttons' | 'list';
    interactiveData?: any;
  }> {
    const { intent, entities, confidence } = intentAnalysis;
    
    // Handle interactive responses for Meta providers
    if (isMetaProvider) {
      const interactiveResponse = await this.generateInteractiveResponse(
        intent, 
        state, 
        entities, 
        contactId
      );
      
      if (interactiveResponse) {
        return interactiveResponse;
      }
    }

    // Generate text response based on intent and state
    switch (intent) {
      case 'greeting':
        if (state.stage === 'initial') {
          return {
            response: isMetaProvider ? 
              'Olá! 👋 Seja muito bem-vindo(a) à Zaffira! Sou a Raytchel, sua assistente virtual especializada em joias.' :
              'Olá! 👋 Seja muito bem-vindo(a) à Zaffira! Sou a Raytchel, sua assistente virtual especializada em joias. Como posso ajudar você hoje? 💎\n\n1️⃣ Ver catálogo\n2️⃣ Agendar visita\n3️⃣ Fazer orçamento',
            shouldSendInteractive: isMetaProvider,
            interactiveType: 'buttons',
            interactiveData: {
              buttons: [
                { id: "ver_catalogo", title: "Ver Catálogo" },
                { id: "agendar_visita", title: "Agendar Visita" },
                { id: "fazer_orcamento", title: "Fazer Orçamento" }
              ]
            }
          };
        }
        break;

      case 'product_inquiry':
        if (entities.jewelry_type === 'aliança') {
          return {
            response: isMetaProvider ?
              'Que momento especial! 💍 Parabéns pelo casamento! Temos lindas opções de alianças em ouro 18k.' :
              'Que momento especial! 💍 Parabéns pelo casamento! Temos lindas opções de alianças em ouro 18k.\n\n1️⃣ Ouro Amarelo\n2️⃣ Ouro Branco\n3️⃣ Ouro Rosé',
            shouldSendInteractive: isMetaProvider,
            interactiveType: 'buttons',
            interactiveData: {
              buttons: [
                { id: "ouro_amarelo", title: "Ouro Amarelo 18k" },
                { id: "ouro_branco", title: "Ouro Branco 18k" },
                { id: "ouro_rose", title: "Ouro Rosé 18k" }
              ]
            }
          };
        }
        break;

      case 'price_inquiry':
        return {
          response: isMetaProvider ?
            'Temos opções especiais para diferentes investimentos. Qual tipo de joia você tem interesse?' :
            'Temos opções especiais para diferentes investimentos.\n\n1️⃣ Alianças (R$ 3.465 - R$ 4.500)\n2️⃣ Anéis (R$ 2.900 - R$ 8.900)\n3️⃣ Outras joias',
          shouldSendInteractive: isMetaProvider,
          interactiveType: 'buttons',
          interactiveData: {
            buttons: [
              { id: "preco_aliancas", title: "Alianças" },
              { id: "preco_aneis", title: "Anéis" },
              { id: "preco_outros", title: "Outras Joias" }
            ]
          }
        };

      case 'appointment_request':
        const availableSlots = await this.getAvailableSlots(state.tenant_id);
        
        if (isMetaProvider && availableSlots.length > 0) {
          return {
            response: 'Escolha o melhor horário para sua visita à nossa loja:',
            shouldSendInteractive: true,
            interactiveType: 'list',
            interactiveData: {
              title: "Horários Disponíveis",
              rows: availableSlots.slice(0, 10).map(slot => ({
                id: `slot_${slot.id}`,
                title: slot.date,
                description: `${slot.time} - Disponível`
              }))
            }
          };
        }
        
        return {
          response: 'Ótimo! Podemos agendar uma visita para você conhecer nossas peças pessoalmente. Qual seria o melhor dia e horário para você?'
        };

      default:
        return {
          response: 'Entendi! Como posso ajudar você melhor? 😊'
        };
    }
    
    return {
      response: 'Como posso ajudar você hoje? 😊'
    };
  }

  private async generateInteractiveResponse(
    intent: string,
    state: ConversationState,
    entities: any,
    contactId: string
  ): Promise<{
    response: string;
    shouldSendInteractive: boolean;
    interactiveType: 'buttons' | 'list';
    interactiveData: any;
  } | null> {
    
    switch (intent) {
      case 'greeting':
        if (state.stage === 'initial') {
          // Send service options immediately
          await this.interactive.sendServiceOptions(contactId);
          return {
            response: '',
            shouldSendInteractive: true,
            interactiveType: 'buttons',
            interactiveData: { sent: true }
          };
        }
        break;

      case 'product_inquiry':
        if (!entities.jewelry_type) {
    try {
          // Send jewelry type selector
      // Get chat context
    const prices = {
      const context = await this.getChatContext(chatId);
      'alianca_tradicional': 3465,
      if (!context) {
      'alianca_anatomica': 3700,
        throw new Error('Chat context not found');
      'alianca_super': 3900,
      }
      'anel_solitario': 2900,

      'anel_premium': 4100
      // Process with humanized conversation flow
    };
      const flowResult = await this.conversationFlow.processMessage(
    
        message,
    return prices[productType] || 3500;
        context.user_id || 'anonymous',
  }
        context.tenant_id
}