import { create } from 'zustand';
import { AdminApiService } from '../lib/adminApi';
import type { 
  Flow, 
  Intent, 
  QAItem, 
  Service, 
  Template, 
  Conversation,
  DailyMetrics,
  FunnelMetrics,
  Organization
} from '../types/admin';

interface AdminState {
  // Current organization
  currentOrg: Organization | null;
  
  // Data
  flows: Flow[];
  intents: Intent[];
  qaItems: QAItem[];
  services: Service[];
  templates: Template[];
  conversations: Conversation[];
  dailyMetrics: DailyMetrics[];
  funnelMetrics: FunnelMetrics | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentOrg: (org: Organization) => void;
  
  // Flow actions
  loadFlows: () => Promise<void>;
  createFlow: (name: string, description?: string) => Promise<Flow | null>;
  updateFlow: (flowId: string, updates: Partial<Flow>) => Promise<boolean>;
  publishFlow: (flowId: string) => Promise<boolean>;
  rollbackFlow: (flowId: string) => Promise<boolean>;
  
  // Intent actions
  loadIntents: () => Promise<void>;
  createIntent: (intent: Omit<Intent, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => Promise<Intent | null>;
  updateIntent: (intentId: string, updates: Partial<Intent>) => Promise<boolean>;
  bulkImportIntents: (intents: Array<Omit<Intent, 'id' | 'org_id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
  
  // Q&A actions
  loadQAItems: () => Promise<void>;
  createQAItem: (qaItem: Omit<QAItem, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => Promise<QAItem | null>;
  updateQAItem: (qaItemId: string, updates: Partial<QAItem>) => Promise<boolean>;
  
  // Service actions
  loadServices: () => Promise<void>;
  createService: (service: Omit<Service, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => Promise<Service | null>;
  
  // Template actions
  loadTemplates: () => Promise<void>;
  createTemplate: (template: Omit<Template, 'id' | 'org_id' | 'usage_count' | 'click_count' | 'conversion_count' | 'created_at' | 'updated_at'>) => Promise<Template | null>;
  
  // Conversation actions
  loadConversations: (status?: string) => Promise<void>;
  resolveHandoff: (conversationId: string, note: string) => Promise<boolean>;
  
  // Metrics actions
  loadDailyMetrics: (fromDate?: Date, toDate?: Date) => Promise<void>;
  loadFunnelMetrics: (fromDate?: Date, toDate?: Date) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => {
  const api = AdminApiService.getInstance();

  return {
    // Initial state
    currentOrg: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Zaffira Joalheria',
      slug: 'zaffira',
      settings: {},
      created_at: new Date(),
      updated_at: new Date()
    },
    flows: [],
    intents: [],
    qaItems: [],
    services: [],
    templates: [],
    conversations: [],
    dailyMetrics: [],
    funnelMetrics: null,
    loading: false,
    error: null,

    setCurrentOrg: (org) => set({ currentOrg: org }),
    clearError: () => set({ error: null }),

    // Flow actions
    loadFlows: async () => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getFlows(currentOrg.id);
        if (response.success) {
          set({ flows: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load flows', loading: false });
      }
    },

    createFlow: async (name, description) => {
      const { currentOrg } = get();
      if (!currentOrg) return null;

      set({ loading: true, error: null });
      try {
        const response = await api.createFlow(currentOrg.id, name, description);
        if (response.success && response.data) {
          set(state => ({ 
            flows: [response.data!, ...state.flows], 
            loading: false 
          }));
          return response.data;
        } else {
          set({ error: response.error, loading: false });
          return null;
        }
      } catch (error) {
        set({ error: 'Failed to create flow', loading: false });
        return null;
      }
    },

    updateFlow: async (flowId, updates) => {
      set({ loading: true, error: null });
      try {
        const response = await api.updateFlow(flowId, updates);
        if (response.success && response.data) {
          set(state => ({
            flows: state.flows.map(f => f.id === flowId ? response.data! : f),
            loading: false
          }));
          return true;
        } else {
          set({ error: response.error, loading: false });
          return false;
        }
      } catch (error) {
        set({ error: 'Failed to update flow', loading: false });
        return false;
      }
    },

    publishFlow: async (flowId) => {
      set({ loading: true, error: null });
      try {
        const response = await api.publishFlow(flowId);
        if (response.success) {
          set(state => ({
            flows: state.flows.map(f => 
              f.id === flowId 
                ? { ...f, status: 'published' as const, published_at: response.data!.published_at }
                : f
            ),
            loading: false
          }));
          return true;
        } else {
          set({ error: response.error, loading: false });
          return false;
        }
      } catch (error) {
        set({ error: 'Failed to publish flow', loading: false });
        return false;
      }
    },

    rollbackFlow: async (flowId) => {
      set({ loading: true, error: null });
      try {
        const response = await api.rollbackFlow(flowId);
        if (response.success) {
          // Reload flows to get updated state
          await get().loadFlows();
          return true;
        } else {
          set({ error: response.error, loading: false });
          return false;
        }
      } catch (error) {
        set({ error: 'Failed to rollback flow', loading: false });
        return false;
      }
    },

    // Intent actions
    loadIntents: async () => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getIntents(currentOrg.id);
        if (response.success) {
          set({ intents: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load intents', loading: false });
      }
    },

    createIntent: async (intent) => {
      const { currentOrg } = get();
      if (!currentOrg) return null;

      set({ loading: true, error: null });
      try {
        const response = await api.createIntent({ ...intent, org_id: currentOrg.id });
        if (response.success && response.data) {
          set(state => ({ 
            intents: [...state.intents, response.data!], 
            loading: false 
          }));
          return response.data;
        } else {
          set({ error: response.error, loading: false });
          return null;
        }
      } catch (error) {
        set({ error: 'Failed to create intent', loading: false });
        return null;
      }
    },

    updateIntent: async (intentId, updates) => {
      set({ loading: true, error: null });
      try {
        const response = await api.updateIntent(intentId, updates);
        if (response.success && response.data) {
          set(state => ({
            intents: state.intents.map(i => i.id === intentId ? response.data! : i),
            loading: false
          }));
          return true;
        } else {
          set({ error: response.error, loading: false });
          return false;
        }
      } catch (error) {
        set({ error: 'Failed to update intent', loading: false });
        return false;
      }
    },

    bulkImportIntents: async (intents) => {
      const { currentOrg } = get();
      if (!currentOrg) return false;

      set({ loading: true, error: null });
      try {
        const response = await api.bulkImportIntents(currentOrg.id, intents);
        if (response.success) {
          await get().loadIntents(); // Reload to get fresh data
          return true;
        } else {
          set({ error: response.error, loading: false });
          return false;
        }
      } catch (error) {
        set({ error: 'Failed to bulk import intents', loading: false });
        return false;
      }
    },

    // Q&A actions
    loadQAItems: async () => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getQAItems(currentOrg.id);
        if (response.success) {
          set({ qaItems: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load Q&A items', loading: false });
      }
    },

    createQAItem: async (qaItem) => {
      const { currentOrg } = get();
      if (!currentOrg) return null;

      set({ loading: true, error: null });
      try {
        const response = await api.createQAItem({ ...qaItem, org_id: currentOrg.id });
        if (response.success && response.data) {
          set(state => ({ 
            qaItems: [...state.qaItems, response.data!], 
            loading: false 
          }));
          return response.data;
        } else {
          set({ error: response.error, loading: false });
          return null;
        }
      } catch (error) {
        set({ error: 'Failed to create Q&A item', loading: false });
        return null;
      }
    },

    updateQAItem: async (qaItemId, updates) => {
      // Implementation similar to updateIntent
      return true; // Placeholder
    },

    // Service actions
    loadServices: async () => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getServices(currentOrg.id);
        if (response.success) {
          set({ services: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load services', loading: false });
      }
    },

    createService: async (service) => {
      const { currentOrg } = get();
      if (!currentOrg) return null;

      set({ loading: true, error: null });
      try {
        const response = await api.createService({ ...service, org_id: currentOrg.id });
        if (response.success && response.data) {
          set(state => ({ 
            services: [...state.services, response.data!], 
            loading: false 
          }));
          return response.data;
        } else {
          set({ error: response.error, loading: false });
          return null;
        }
      } catch (error) {
        set({ error: 'Failed to create service', loading: false });
        return null;
      }
    },

    // Template actions
    loadTemplates: async () => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getTemplates(currentOrg.id);
        if (response.success) {
          set({ templates: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load templates', loading: false });
      }
    },

    createTemplate: async (template) => {
      const { currentOrg } = get();
      if (!currentOrg) return null;

      set({ loading: true, error: null });
      try {
        const response = await api.createTemplate({ ...template, org_id: currentOrg.id });
        if (response.success && response.data) {
          set(state => ({ 
            templates: [...state.templates, response.data!], 
            loading: false 
          }));
          return response.data;
        } else {
          set({ error: response.error, loading: false });
          return null;
        }
      } catch (error) {
        set({ error: 'Failed to create template', loading: false });
        return null;
      }
    },

    // Conversation actions
    loadConversations: async (status) => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getConversations(currentOrg.id, status);
        if (response.success) {
          set({ conversations: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load conversations', loading: false });
      }
    },

    resolveHandoff: async (conversationId, note) => {
      set({ loading: true, error: null });
      try {
        const response = await api.resolveHandoff(conversationId, note);
        if (response.success) {
          set(state => ({
            conversations: state.conversations.map(c => 
              c.id === conversationId 
                ? { ...c, status: 'resolved' as const }
                : c
            ),
            loading: false
          }));
          return true;
        } else {
          set({ error: response.error, loading: false });
          return false;
        }
      } catch (error) {
        set({ error: 'Failed to resolve handoff', loading: false });
        return false;
      }
    },

    // Metrics actions
    loadDailyMetrics: async (fromDate, toDate) => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getDailyMetrics(currentOrg.id, fromDate, toDate);
        if (response.success) {
          set({ dailyMetrics: response.data || [], loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load daily metrics', loading: false });
      }
    },

    loadFunnelMetrics: async (fromDate, toDate) => {
      const { currentOrg } = get();
      if (!currentOrg) return;

      set({ loading: true, error: null });
      try {
        const response = await api.getFunnelMetrics(currentOrg.id, fromDate, toDate);
        if (response.success) {
          set({ funnelMetrics: response.data, loading: false });
        } else {
          set({ error: response.error, loading: false });
        }
      } catch (error) {
        set({ error: 'Failed to load funnel metrics', loading: false });
      }
    }
  };
});