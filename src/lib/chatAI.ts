import { supabase } from './supabase';
import { OpenAIService } from './openai';
import { ChatValidation } from './chatValidation';
import { GuardrailsService } from './guardrailsService';
import type { ChatMessage } from '../types/chat';

interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
}

export class ChatAI {
  private static instance: ChatAI;
  private openai: OpenAIService;
  private validation: ChatValidation;
  private guardrails: GuardrailsService;
  private maxRetries = 3;
  private retryDelay = 1000;

  private constructor() {
    this.openai = OpenAIService.getInstance();
    this.validation = ChatValidation.getInstance();
    this.guardrails = GuardrailsService.getInstance();
  }

  static getInstance(): ChatAI {
    if (!ChatAI.instance) {
      ChatAI.instance = new ChatAI();
    }
    return ChatAI.instance;
  }

  async processMessage(message: string, chatId: string): Promise<ChatMessage> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.maxRetries) {
      try {
        // Get chat context
        const context = await this.getChatContext(chatId);
        if (!context) {
          throw new Error('Chat context not found');
        }

        // Analyze intent with retries
        const intentAnalysis = await this.analyzeIntentWithRetry(message, context);

        // Get message settings
        const messageSettings = await this.getMessageSettings(context.tenant_id);

        // Generate response
        const { content: response, confidence } = await this.openai.generateResponse(
          message,
          {
            ...context,
            intent: intentAnalysis.intent,
            entities: intentAnalysis.entities,
            messageSettings
          }
        );

        // Check guardrails before sending response
        const guardrailValidation = await this.guardrails.validateResponse(
          context.tenant_id,
          intentAnalysis.intent,
          confidence,
          response,
          {
            ...context,
            productId: intentAnalysis.entities?.product_id,
            category: this.getIntentCategory(intentAnalysis.intent)
          }
        );

        let finalResponse = response;
        let finalConfidence = confidence;

        // Apply guardrails if triggered
        if (!guardrailValidation.isValid) {
          finalResponse = guardrailValidation.safeResponse || response;
          finalConfidence = Math.min(confidence, 0.6); // Lower confidence for guardrailed responses

          // Log guardrail decision
          await this.guardrails.logDecision(
            context.tenant_id,
            chatId,
            intentAnalysis.intent,
            confidence,
            guardrailValidation.guardrails[0]?.reason,
            guardrailValidation.guardrails[0]?.evidence,
            true, // fallback used
            guardrailValidation.requiresHandoff || false
          );

          // Add handoff option if required
          if (guardrailValidation.requiresHandoff) {
            finalResponse += '\n\n🤝 Posso conectar você com um especialista para informações mais detalhadas?';
          }
        } else {
          // Log successful decision
          await this.guardrails.logDecision(
            context.tenant_id,
            chatId,
            intentAnalysis.intent,
            confidence,
            undefined, // no guardrail triggered
            { intent_processed: true },
            false,
            false
          );
        }
        // Create bot message
        const botMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: finalResponse,
          sender: 'bot',
          timestamp: new Date(),
          intent: intentAnalysis.intent,
          confidence: finalConfidence,
          status: 'sent',
          metadata: {
            entities: intentAnalysis.entities,
            context,
            guardrails: guardrailValidation.guardrails,
            guardrail_triggered: !guardrailValidation.isValid,
            analysis: {
              flow_stage: this.determineFlowStage(context),
              sentiment: await this.analyzeSentiment(response)
            }
          }
        };

        // Validate response
        const validation = await this.validation.validateResponse(botMessage, {
          lastUserMessage: message,
          ...context,
          messageSettings
        });

        if (!validation.isValid) {
          throw new Error('Response validation failed: ' + validation.errors.join(', '));
        }

        // Update message with validation confidence
        botMessage.confidence = validation.confidence;

        // Save message
        await this.saveMessage(botMessage, chatId, context, intentAnalysis);

        return botMessage;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        if (retryCount < this.maxRetries) {
          console.warn(`Error processing message (attempt ${retryCount}/${this.maxRetries}):`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount - 1)));
          continue;
        }

        // Log error with guardrail
        await this.guardrails.logDecision(
          context?.tenant_id || 'unknown',
          chatId,
          'error_fallback',
          0.5,
          'system_error',
          { error: lastError.message, retry_count: retryCount },
          true,
          true
        );
        // Return a friendly fallback response on final retry
        return {
          id: crypto.randomUUID(),
          content: 'Desculpe, estou tendo dificuldades técnicas no momento. Posso transferir para um de nossos especialistas? 🤝',
          sender: 'bot',
          timestamp: new Date(),
          intent: 'fallback',
          confidence: 0.5,
          status: 'sent',
          metadata: {
            error: lastError.message,
            retryCount
          }
        };
      }
    }

    throw lastError;
  }

  private getIntentCategory(intent: string): string {
    if (intent.includes('price') || intent.includes('preco')) return 'price_inquiry';
    if (intent.includes('appointment') || intent.includes('agendar')) return 'appointment_booking';
    if (intent.includes('product') || intent.includes('produto')) return 'product_recommendation';
    if (intent.includes('customization') || intent.includes('personalizar')) return 'customization';
    return 'general';
  }
  private async analyzeIntentWithRetry(message: string, context: any): Promise<IntentAnalysis> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.maxRetries) {
      try {
        const { content: analysis } = await this.openai.generateResponse(
          message,
          {
            task: 'intent_analysis',
            format: 'json',
            context,
            system_prompt: `Analise a intenção do usuário na mensagem. Retorne um JSON com:
            {
              "intent": string (uma das seguintes opções:
                "greeting" - saudação inicial
                "product_inquiry" - pergunta sobre produtos
                "price_inquiry" - pergunta sobre preços
                "customization" - personalização de produto
                "payment_info" - informações de pagamento
                "delivery_info" - informações de entrega
                "warranty_info" - informações de garantia
                "general_inquiry" - pergunta geral
              ),
              "confidence": number (entre 0 e 1),
              "entities": {
                "product_type": string (opcional),
                "material": string (opcional),
                "price_range": { min: number, max: number } (opcional),
                "urgency": "low" | "medium" | "high" (opcional)
              }
            }`
          }
        );

        // Parse and validate response
        let parsed;
        try {
          parsed = JSON.parse(analysis);
        } catch (e) {
          throw new Error('Invalid JSON response from intent analysis');
        }

        if (!this.validateIntentAnalysis(parsed)) {
          throw new Error('Invalid intent analysis format');
        }

        return parsed;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        console.warn(`Error analyzing intent (attempt ${retryCount}/${this.maxRetries}):`, lastError.message);

        if (retryCount < this.maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount - 1))
          );
          continue;
        }
      }
    }

    // Return fallback intent if all retries fail
    console.error('All intent analysis attempts failed:', lastError?.message);
    return {
      intent: 'general_inquiry',
      confidence: 0.7,
      entities: {}
    };
  }

  private validateIntentAnalysis(analysis: any): boolean {
    const validIntents = [
      'greeting',
      'product_inquiry',
      'price_inquiry',
      'customization',
      'payment_info',
      'delivery_info',
      'warranty_info',
      'general_inquiry'
    ];

    return (
      typeof analysis === 'object' &&
      validIntents.includes(analysis.intent) &&
      typeof analysis.confidence === 'number' &&
      analysis.confidence >= 0 &&
      analysis.confidence <= 1 &&
      (!analysis.entities || typeof analysis.entities === 'object')
    );
  }

  private async getChatContext(chatId: string): Promise<any> {
    try {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select(`
          *,
          tenant:tenant_id (
            id,
            name,
            settings
          )
        `)
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;
      return chat;
    } catch (error) {
      console.error('Error getting chat context:', error);
      throw error;
    }
  }

  private async getMessageSettings(tenantId: string): Promise<any> {
    try {
      const { data } = await supabase.rpc('get_message_settings', { p_tenant_id: tenantId });
      return data;
    } catch (error) {
      console.error('Error getting message settings:', error);
      return null;
    }
  }

  private determineFlowStage(context: any): string {
    // Implement flow stage determination logic
    return 'initial';
  }

  private async analyzeSentiment(text: string): Promise<number> {
    try {
      const { content: sentiment } = await this.openai.generateResponse(
        text,
        {
          task: 'sentiment_analysis',
          format: 'number',
          system_prompt: 'Analyze the sentiment of the text and return a number between -1 (very negative) and 1 (very positive).'
        }
      );

      return parseFloat(sentiment);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 0;
    }
  }

  private async saveMessage(
    message: ChatMessage,
    chatId: string,
    context: any,
    intentAnalysis: IntentAnalysis
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content: message.content,
          sender: message.sender,
          intent: message.intent,
          confidence: message.confidence,
          metadata: message.metadata,
          status: message.status
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }
}