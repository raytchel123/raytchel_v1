import { create } from 'zustand';
import { UsageService, UsageStatus, UsageAlert, ActionCheck } from '../lib/usageService';

interface UsageState {
  // Data
  usageStatus: UsageStatus | null;
  alerts: UsageAlert[];
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Actions
  loadUsageStatus: () => Promise<void>;
  loadAlerts: () => Promise<void>;
  checkAction: (actionType: string) => Promise<ActionCheck>;
  trackUsage: (usageType: string, idempotencyKey?: string) => Promise<boolean>;
  updateLimits: (limits: Record<string, number>) => Promise<boolean>;
  
  // Utility
  clearError: () => void;
  canProceed: (actionType: string) => boolean;
  getUsagePercentage: (usageType: string) => number;
  isBlocked: (usageType: string) => boolean;
  hasWarning: (usageType: string) => boolean;
}

export const useUsageStore = create<UsageState>((set, get) => {
  const usageService = UsageService.getInstance();
  
  // Get Zaffira tenant ID dynamically
  const getTenantId = async () => {
    try {
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'zaffira')
        .single();
      return data?.id || '00000000-0000-0000-0000-000000000001';
    } catch {
      return '00000000-0000-0000-0000-000000000001';
    }
  };

  return {
    // Initial state
    usageStatus: null,
    alerts: [],
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    loadUsageStatus: async () => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const status = await usageService.getUsageStatus(tenantId);
        set({ usageStatus: status, loading: false });
      } catch (error) {
        set({ 
          error: 'Failed to load usage status', 
          loading: false 
        });
      }
    },

    loadAlerts: async () => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const alerts = await usageService.getUsageAlerts(tenantId);
        set({ alerts, loading: false });
      } catch (error) {
        set({ 
          error: 'Failed to load usage alerts', 
          loading: false 
        });
      }
    },

    checkAction: async (actionType: string) => {
      try {
        const tenantId = await getTenantId();
        const check = await usageService.canPerformAction(tenantId, actionType);
        return check;
      } catch (error) {
        console.error('Error checking action:', error);
        return {
          can_proceed: false,
          usage_info: {},
          block_message: 'Erro ao verificar limite',
          cta_message: 'Tente novamente'
        };
      }
    },

    trackUsage: async (usageType: string, idempotencyKey?: string) => {
      try {
        const tenantId = await getTenantId();
        const result = await usageService.incrementUsage(tenantId, usageType, idempotencyKey);
        
        // Reload status if usage was tracked
        if (result.success) {
          await get().loadUsageStatus();
        }
        
        return result.success;
      } catch (error) {
        console.error('Error tracking usage:', error);
        return false;
      }
    },

    updateLimits: async (limits: Record<string, number>) => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const success = await usageService.updateUsageLimits(tenantId, limits);
        
        if (success) {
          await get().loadUsageStatus();
          return true;
        } else {
          set({ error: 'Failed to update limits', loading: false });
          return false;
        }
      } catch (error) {
        set({ 
          error: 'Failed to update limits', 
          loading: false 
        });
        return false;
      }
    },

    // Utility methods
    canProceed: (actionType: string) => {
      const { usageStatus } = get();
      if (!usageStatus?.usage) return true;

      const usageTypeMap: Record<string, string> = {
        'send_whatsapp': 'whatsapp_messages',
        'send_template': 'templates',
        'generate_quote': 'quotes',
        'create_appointment': 'appointments',
        'request_handoff': 'handoffs'
      };

      const usageType = usageTypeMap[actionType] || actionType;
      const usage = usageStatus.usage[usageType];
      
      return usage ? !usage.blocked : true;
    },

    getUsagePercentage: (usageType: string) => {
      const { usageStatus } = get();
      return usageStatus?.usage?.[usageType]?.percentage || 0;
    },

    isBlocked: (usageType: string) => {
      const { usageStatus } = get();
      return usageStatus?.usage?.[usageType]?.blocked || false;
    },

    hasWarning: (usageType: string) => {
      const { usageStatus } = get();
      return usageStatus?.usage?.[usageType]?.warning || false;
    }
  };
});