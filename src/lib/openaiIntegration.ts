import { supabase } from './supabase';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIIntegration {
  private static instance: OpenAIIntegration;
  private apiKey: string;
  private model: string;
  private baseURL: string;
  private additionalInstructions: string;
  private maxRetries = 3;
  private retryDelay = 1000;

  private constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
    this.baseURL = 'https://api.openai.com/v1';
    this.additionalInstructions = `
- Você receberá as mensagens com a data no inicio e nome no inicio, porem você não deve enviar com data e nome, apenas a mensagem
- Não passe serviços para o cliente que não foram obtidos pela função do sitema get_avaliable_services
- Não passe valores de serviços que não foram obtidos pela função do sistema get_avaliable_services
- Nunca informe o cliente que uma função foi realizada no sistema sem ter recebido alguma confirmação via uma function disponivel
`;
  }

  static getInstance(): OpenAIIntegration {
    if (!OpenAIIntegration.instance) {
      OpenAIIntegration.instance = new OpenAIIntegration();
    }
    return OpenAIIntegration.instance;
  }

  async generateResponse(messages: OpenAIMessage[], userId: string): Promise<string> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.maxRetries) {
      try {
        const systemMessage: OpenAIMessage = {
          role: 'system',
          content: `Você é a Raytchel, assistente virtual da Zaffira Joalheria. ${this.additionalInstructions}`
        };

        const payload = {
          model: this.model,
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 1000,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        };

        const response = await fetch(`${this.baseURL}/chat/completions`, {
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

        const data: OpenAIResponse = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenAI API');
        }

        // Log usage for analytics
        await this.logUsage(userId, data.usage);

        return data.choices[0].message.content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
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

  async testConnection(): Promise<{ success: boolean; error?: string; models?: number }> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { 
        success: true, 
        models: data.data?.length || 0 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async logUsage(userId: string, usage: any): Promise<void> {
    try {
      await supabase.from('ai_usage').insert([{
        tenant_id: '00000000-0000-0000-0000-000000000001',
        type: 'chat',
        tokens_used: usage.total_tokens,
        cost: this.calculateCost(usage),
        metadata: {
          user_id: userId,
          model: this.model,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens
        }
      }]);
    } catch (error) {
      console.error('Error logging AI usage:', error);
    }
  }

  private calculateCost(usage: any): number {
    // Pricing for gpt-3.5-turbo (adjust based on actual model)
    const inputCostPer1K = 0.0015;
    const outputCostPer1K = 0.002;
    
    const inputCost = (usage.prompt_tokens / 1000) * inputCostPer1K;
    const outputCost = (usage.completion_tokens / 1000) * outputCostPer1K;
    
    return inputCost + outputCost;
  }
}