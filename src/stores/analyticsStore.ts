import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AnalyticsMetrics {
  totalChats: number;
  activeChats: number;
  avgResponseTime: string;
  conversionRate: number;
  totalSales: number;
  aiConfidence: number;
  satisfactionScore: number;
  byAgent: Record<string, {
    name: string;
    metrics: {
      chatsHandled: number;
      avgResponseTime: string;
      satisfactionScore: number;
      conversionRate: number;
    };
  }>;
}

interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
  error: string | null;
  loadMetrics: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_METRICS: AnalyticsMetrics = {
  totalChats: 0,
  activeChats: 0,
  avgResponseTime: '0s',
  conversionRate: 0,
  totalSales: 0,
  aiConfidence: 0,
  satisfactionScore: 0,
  byAgent: {}
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  metrics: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadMetrics: async () => {
    set({ loading: true, error: null });
    try {
      // Usar dados mock temporários para validar interface
      // TODO: Substituir por dados reais quando backend estiver conectado
      await new Promise(resolve => setTimeout(resolve, 800)); // Simular loading
      
      const mockMetrics: AnalyticsMetrics = {
        totalChats: 127,
        activeChats: 8,
        avgResponseTime: '1.2min',
        conversionRate: 0.32,
        totalSales: 45670,
        aiConfidence: 0.94,
        satisfactionScore: 0.88,
        byAgent: {
          'agent-1': {
            name: 'Raytchel (IA)',
            metrics: {
              chatsHandled: 89,
              avgResponseTime: '45s',
              satisfactionScore: 0.91,
              conversionRate: 0.35
            }
          },
          'agent-2': {
            name: 'Ana Silva',
            metrics: {
              chatsHandled: 23,
              avgResponseTime: '2.1min',
              satisfactionScore: 0.95,
              conversionRate: 0.28
            }
          },
          'agent-3': {
            name: 'João Santos',
            metrics: {
              chatsHandled: 15,
              avgResponseTime: '1.8min',
              satisfactionScore: 0.87,
              conversionRate: 0.22
            }
          }
        }
      };

      set({
        metrics: mockMetrics,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      set({ 
        metrics: {
          totalChats: 0,
          activeChats: 0,
          avgResponseTime: '0s',
          conversionRate: 0,
          totalSales: 0,
          aiConfidence: 0,
          satisfactionScore: 0,
          byAgent: {}
        },
        error: 'Usando dados mock temporários. Backend será conectado em breve.',
        loading: false 
      });
    }
  }
}));

// Helper functions
function parseInterval(interval: string): number {
  if (!interval) return 0;
  const matches = interval.match(/(\d+)\s*(s|m|h)/);
  if (!matches) return 0;

  const [, value, unit] = matches;
  switch (unit) {
    case 'h': return parseInt(value) * 3600;
    case 'm': return parseInt(value) * 60;
    case 's': return parseInt(value);
    default: return 0;
  }
}

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}