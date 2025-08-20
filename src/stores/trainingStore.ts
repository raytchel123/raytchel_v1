import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface TrainingState {
  responses: AutoResponse[];
  intents: Intent[];
  metrics: TrainingMetrics;
  loading: boolean;
  error: string | null;
  loadResponses: () => Promise<void>;
  addResponse: (response: Omit<AutoResponse, 'id'>) => Promise<void>;
  updateResponse: (id: string, response: Partial<AutoResponse>) => Promise<void>;
  loadIntents: () => Promise<void>;
  addIntent: (intent: Omit<Intent, 'id'>) => Promise<void>;
  loadMetrics: () => Promise<void>;
}

interface AutoResponse {
  id: string;
  pattern: string;
  response: string;
  category: string;
  priority: string;
  confidence: number;
  context?: Record<string, any>;
}

interface Intent {
  id: string;
  name: string;
  examples: number;
  accuracy: number;
  patterns: string[];
}

interface TrainingMetrics {
  accuracy: number;
  responses: number;
  avgResponseTime: number;
  trend: number;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  responses: [],
  intents: [],
  metrics: {
    accuracy: 0,
    responses: 0,
    avgResponseTime: 0,
    trend: 0
  },
  loading: false,
  error: null,

  loadResponses: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('auto_responses')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      set({ responses: data || [], loading: false });
    } catch (error) {
      set({ error: 'Failed to load responses', loading: false });
    }
  },

  addResponse: async (response) => {
    try {
      const { error } = await supabase
        .from('auto_responses')
        .insert([response]);

      if (error) throw error;
      get().loadResponses();
    } catch (error) {
      set({ error: 'Failed to add response' });
    }
  },

  updateResponse: async (id, response) => {
    try {
      const { error } = await supabase
        .from('auto_responses')
        .update(response)
        .eq('id', id);

      if (error) throw error;
      get().loadResponses();
    } catch (error) {
      set({ error: 'Failed to update response' });
    }
  },

  loadIntents: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chat_intents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Group and process intents
      const processedIntents = data.reduce((acc: Intent[], curr) => {
        const existing = acc.find(i => i.name === curr.intent);
        if (existing) {
          existing.examples++;
          existing.accuracy = (existing.accuracy + curr.confidence) / 2;
        } else {
          acc.push({
            id: curr.id,
            name: curr.intent,
            examples: 1,
            accuracy: curr.confidence,
            patterns: curr.context?.patterns || []
          });
        }
        return acc;
      }, []);

      set({ intents: processedIntents, loading: false });
    } catch (error) {
      set({ error: 'Failed to load intents', loading: false });
    }
  },

  addIntent: async (intent) => {
    try {
      const { error } = await supabase
        .from('chat_intents')
        .insert([{
          intent: intent.name,
          confidence: intent.accuracy,
          context: { patterns: intent.patterns }
        }]);

      if (error) throw error;
      get().loadIntents();
    } catch (error) {
      set({ error: 'Failed to add intent' });
    }
  },

  loadMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const [
        { data: responses },
        { data: intents }
      ] = await Promise.all([
        supabase
          .from('auto_responses')
          .select('*'),
        supabase
          .from('chat_intents')
          .select('*')
      ]);

      const metrics = {
        accuracy: intents?.reduce((acc, curr) => acc + curr.confidence, 0) / (intents?.length || 1),
        responses: responses?.length || 0,
        avgResponseTime: 1.2, // This would come from actual response time tracking
        trend: 0.023 // This would be calculated from historical data
      };

      set({ metrics, loading: false });
    } catch (error) {
      set({ error: 'Failed to load metrics', loading: false });
    }
  }
}));