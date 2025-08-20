import { supabase } from './supabase';
import { ApiKeyManager } from './apiKeys';

interface OpenAIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private config: OpenAIConfig;
  private maxRetries = 3;
  private retryDelay = 1000;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private apiKey: string | null = null;

  private constructor() {
    this.config = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 250
    };
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  // Initialize API key without tenant dependency
  async initializeApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, payload: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not initialized');
    }

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.maxRetries) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        retryCount++;

        if (retryCount < this.maxRetries) {
          console.warn(`OpenAI API error (attempt ${retryCount}/${this.maxRetries}):`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount - 1)));
          continue;
        }

        console.error('All OpenAI API attempts failed:', lastError.message);
        throw lastError;
      }
    }

    throw lastError;
  }

  async generateResponse(
    message: string,
    context: Record<string, any>
  ): Promise<{ content: string; confidence: number }> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not initialized');
      }

      const systemPrompt = this.buildSystemPrompt(context);

      const payload = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      };

      const data = await this.makeRequest(this.baseUrl, payload);
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return {
        content: data.choices[0].message.content,
        confidence: this.calculateConfidence(data.choices[0], context)
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        content: 'Desculpe, estou tendo dificuldades técnicas no momento. Posso transferir para um de nossos especialistas? 🤝',
        confidence: 0.5
      };
    }
  }

  private buildSystemPrompt(context: Record<string, any>): string {
    const useEmojis = context.useEmojis !== false;

    return `Você é a Raytchel, uma assistente virtual especializada em joalheria da Zaffira.

${context ? `Contexto do cliente:\n${JSON.stringify(context, null, 2)}\n` : ''}

Diretrizes:
- Seja sempre profissional e cordial
- Use linguagem clara e acessível
- Forneça informações precisas sobre produtos
- Sugira opções baseadas nas preferências do cliente
- Esclareça dúvidas sobre materiais e processos
- Mantenha o foco em converter leads em vendas
${useEmojis ? '- Use emojis com moderação' : '- Não use emojis'}
- Enfatize a qualidade e exclusividade das joias Zaffira`;
  }

  private calculateConfidence(choice: any, context: Record<string, any>): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on finish reason
    if (choice.finish_reason === 'stop') {
      confidence += 0.1;
    }

    // Adjust based on context match
    if (context.intent && choice.message.content.toLowerCase().includes(context.intent)) {
      confidence += 0.1;
    }

    // Adjust based on message length
    const contentLength = choice.message.content.length;
    if (contentLength > 200) confidence += 0.05;
    if (contentLength > 400) confidence += 0.05;

    // Cap confidence at 0.98
    return Math.min(0.98, confidence);
  }

  updateConfig(newConfig: Partial<OpenAIConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}