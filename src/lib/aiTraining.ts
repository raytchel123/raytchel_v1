import { supabase } from './supabase';
import type { ChatMessage } from '../types/chat';

interface TrainingMetrics {
  confidence: number;
  accuracy: number;
  sentiment: number;
  context: Record<string, any>;
}

export class AITraining {
  private static instance: AITraining;

  private constructor() {}

  static getInstance(): AITraining {
    if (!AITraining.instance) {
      AITraining.instance = new AITraining();
    }
    return AITraining.instance;
  }

  async processMessageFeedback(message: ChatMessage, feedback: {
    wasHelpful: boolean;
    category?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const metrics = this.calculateMetrics(message, feedback);
      
      await supabase.from('message_feedback').insert([{
        message_id: message.id,
        was_helpful: feedback.wasHelpful,
        category: feedback.category,
        notes: feedback.notes,
        metrics: metrics,
        created_at: new Date()
      }]);

      // Update AI model confidence scores
      await this.updateModelConfidence(message.intent || 'general', metrics);
    } catch (error) {
      console.error('Error processing message feedback:', error);
      throw error;
    }
  }

  private calculateMetrics(message: ChatMessage, feedback: any): TrainingMetrics {
    return {
      confidence: message.confidence || 0,
      accuracy: feedback.wasHelpful ? 1 : 0,
      sentiment: this.analyzeSentiment(message.content),
      context: {
        intent: message.intent,
        category: feedback.category,
        originalContext: message.context
      }
    };
  }

  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis (to be enhanced)
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'thanks'];
    const negativeWords = ['bad', 'poor', 'unhappy', 'issue', 'problem'];
    
    const words = text.toLowerCase().split(' ');
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return score;
  }

  private async updateModelConfidence(intent: string, metrics: TrainingMetrics): Promise<void> {
    const { data: existingMetrics } = await supabase
      .from('ai_model_metrics')
      .select('*')
      .eq('intent', intent)
      .single();

    if (existingMetrics) {
      const newConfidence = (existingMetrics.confidence * existingMetrics.samples + metrics.confidence) / (existingMetrics.samples + 1);
      
      await supabase
        .from('ai_model_metrics')
        .update({
          confidence: newConfidence,
          samples: existingMetrics.samples + 1,
          updated_at: new Date()
        })
        .eq('intent', intent);
    } else {
      await supabase
        .from('ai_model_metrics')
        .insert([{
          intent,
          confidence: metrics.confidence,
          samples: 1,
          created_at: new Date()
        }]);
    }
  }

  async getModelMetrics(): Promise<Record<string, any>> {
    const { data } = await supabase
      .from('ai_model_metrics')
      .select('*')
      .order('samples', { ascending: false });

    return data || [];
  }
}