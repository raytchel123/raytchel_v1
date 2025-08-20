import { supabase } from './supabase';
import { OpenAIService } from './openai';
import type { ChatMessage } from '../types/chat';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  confidence: number;
}

export class ChatValidation {
  private static instance: ChatValidation;
  private openai: OpenAIService;

  private constructor() {
    this.openai = OpenAIService.getInstance();
  }

  static getInstance(): ChatValidation {
    if (!ChatValidation.instance) {
      ChatValidation.instance = new ChatValidation();
    }
    return ChatValidation.instance;
  }

  async validateResponse(message: ChatMessage, context: Record<string, any>): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      let confidence = 1.0;

      // Get message settings
      const { data: settings } = await supabase
        .rpc('get_message_settings', { p_tenant_id: context.tenant_id });

      // Basic validation
      if (!message.content?.trim()) {
        errors.push('Message content cannot be empty');
        confidence *= 0.5;
      }

      // Length validation
      if (message.content) {
        const length = message.content.length;
        const maxLength = settings?.max_length || 500;
        const minLength = settings?.min_length || 100;

        if (length > maxLength) {
          errors.push(`Message too long (${length} > ${maxLength} characters)`);
          confidence *= 0.8;
        }
        if (length < minLength) {
          errors.push(`Message too short (${length} < ${minLength} characters)`);
          confidence *= 0.9;
        }
      }

      // Content validation
      const contentValidation = await this.validateContent(message.content || '', context);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
        confidence *= contentValidation.confidence;
      }

      // Context validation
      const contextValidation = await this.validateContext(message, context);
      if (!contextValidation.isValid) {
        errors.push(...contextValidation.errors);
        confidence *= contextValidation.confidence;
      }

      // Business rules validation
      const rulesValidation = await this.validateBusinessRules(message, context);
      if (!rulesValidation.isValid) {
        errors.push(...rulesValidation.errors);
        confidence *= rulesValidation.confidence;
      }

      // Emoji usage validation
      if (settings?.emoji_usage && message.content) {
        const emojiCount = (message.content.match(/[\p{Emoji}]/gu) || []).length;
        if (emojiCount === 0) {
          confidence *= 0.95; // Small penalty for no emojis when they're enabled
        } else if (emojiCount > 3) {
          errors.push('Too many emojis used');
          confidence *= 0.9;
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        confidence
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Internal validation error'],
        confidence: 0
      };
    }
  }

  private async validateContent(content: string, context: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    let confidence = 1.0;

    try {
      // Get language rules from business_rules table
      const { data: rules } = await supabase
        .from('business_rules')
        .select('metadata')
        .eq('category', 'general')
        .maybeSingle();

      if (rules?.metadata?.language_rules) {
        const { forbidden_terms = [], preferred_terms = {} } = rules.metadata.language_rules;

        // Check for forbidden terms
        forbidden_terms.forEach((term: string) => {
          if (content.toLowerCase().includes(term.toLowerCase())) {
            errors.push(`Message contains inappropriate term: ${term}`);
            confidence *= 0.8;
          }
        });

        // Check for preferred terms usage
        Object.entries(preferred_terms).forEach(([category, terms]: [string, any]) => {
          const hasPreferredTerm = terms.some((term: string) => 
            content.toLowerCase().includes(term.toLowerCase())
          );
          if (!hasPreferredTerm) {
            confidence *= 0.95;
          }
        });
      }

      // Check for sensitive information
      const sensitivePatterns = [
        /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, // CPF
        /\b\d{16}\b/, // Card number
        /\b\d{3}\b/, // CVV
        /senha|password/i
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          errors.push('Message contains sensitive information');
          confidence *= 0.5;
          break;
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        confidence
      };
    } catch (error) {
      console.error('Error in content validation:', error);
      return {
        isValid: true,
        errors: [],
        confidence: 0.7
      };
    }
  }

  private async validateContext(message: ChatMessage, context: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    let confidence = 1.0;

    try {
      // Validate flow stage transition
      if (context.currentStage && message.metadata?.nextStage) {
        const { data: flowStages } = await supabase
          .from('chat_flow_stages')
          .select('next_stages')
          .eq('name', context.currentStage)
          .maybeSingle();

        if (flowStages?.next_stages) {
          const validNextStages = flowStages.next_stages as string[];
          if (!validNextStages.includes(message.metadata.nextStage)) {
            errors.push('Invalid conversation flow transition');
            confidence *= 0.7;
          }
        }
      }

      // Validate intent consistency
      if (message.intent && context.expectedIntent) {
        if (message.intent !== context.expectedIntent) {
          confidence *= 0.9;
        }
      }

      // Validate response relevance
      if (context.lastUserMessage) {
        const relevanceCheck = await this.checkRelevance(
          context.lastUserMessage,
          message.content || ''
        );
        confidence *= relevanceCheck;
      }

      return {
        isValid: errors.length === 0,
        errors,
        confidence
      };
    } catch (error) {
      console.error('Error in context validation:', error);
      return {
        isValid: true,
        errors: [],
        confidence: 0.7
      };
    }
  }

  private async validateBusinessRules(message: ChatMessage, context: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    let confidence = 1.0;

    try {
      // Get business rules
      const { data: rules } = await supabase
        .from('business_rules')
        .select('*')
        .eq('category', context.category || 'general')
        .maybeSingle();

      if (rules) {
        // Validate pricing information
        if (rules.type === 'pricing' && message.content?.includes('R$')) {
          const prices = message.content.match(/R\$\s*[\d,.]+/g) || [];
          for (const price of prices) {
            const value = parseFloat(price.replace(/[R$\s.]/g, '').replace(',', '.'));
            if (value < rules.minPrice || value > rules.maxPrice) {
              errors.push('Price outside allowed range');
              confidence *= 0.7;
            }
          }
        }

        // Validate delivery times
        if (rules.type === 'delivery' && message.content?.includes('dia')) {
          const days = message.content.match(/\d+\s*dias?/g) || [];
          for (const day of days) {
            const value = parseInt(day);
            if (value < rules.minDays || value > rules.maxDays) {
              errors.push('Delivery time outside allowed range');
              confidence *= 0.8;
            }
          }
        }

        // Validate customization options
        if (rules.customizable && message.content?.includes('personaliz')) {
          const options = rules.metadata?.customizationOptions || [];
          const mentionedOptions = options.filter((option: string) => 
            message.content?.toLowerCase().includes(option.toLowerCase())
          );
          if (mentionedOptions.length === 0) {
            confidence *= 0.9;
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        confidence
      };
    } catch (error) {
      console.error('Error in business rules validation:', error);
      return {
        isValid: true,
        errors: [],
        confidence: 0.7
      };
    }
  }

  private async checkRelevance(userMessage: string, botResponse: string): Promise<number> {
    try {
      const { content: relevanceScore } = await this.openai.generateResponse(
        `Analyze the relevance of this response to the user's message:
        User: ${userMessage}
        Bot: ${botResponse}
        
        Rate the relevance from 0.0 to 1.0, where:
        1.0 = Perfectly relevant and addresses the user's message directly
        0.0 = Completely irrelevant or off-topic
        
        Respond with only the number.`,
        { temperature: 0.1 }
      );

      return parseFloat(relevanceScore) || 0.7;
    } catch (error) {
      console.error('Error checking relevance:', error);
      return 0.7;
    }
  }
}