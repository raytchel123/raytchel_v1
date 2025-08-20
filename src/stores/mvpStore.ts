import { create } from 'zustand';
import { MVPApiService, SnapshotData, QuoteRequest, QuoteResult } from '../lib/mvpApi';

interface MVPState {
  // Snapshot management
  currentSnapshot: SnapshotData | null;
  snapshotHistory: any[];
  publishedVersion: string | null;
  
  // Flow execution
  activeFlows: any[];
  customerSessions: any[];
  quoteRequests: any[];
  
  // Appointments
  availableSlots: any[];
  bookedAppointments: any[];
  
  // UI state
  loading: boolean;
  error: string | null;
  publishing: boolean;
  
  // Actions
  loadCurrentSnapshot: () => Promise<void>;
  loadSnapshotHistory: () => Promise<void>;
  publishSnapshot: (snapshotData: SnapshotData) => Promise<boolean>;
  rollbackSnapshot: (targetVersion: string) => Promise<boolean>;
  
  calculateQuote: (quoteRequest: QuoteRequest) => Promise<QuoteResult>;
  loadAvailableSlots: (date?: string) => Promise<void>;
  bookAppointment: (appointmentData: any) => Promise<boolean>;
  
  clearError: () => void;
}

export const useMVPStore = create<MVPState>((set, get) => {
  const api = MVPApiService.getInstance();
  
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
    currentSnapshot: null,
    snapshotHistory: [],
    publishedVersion: null,
    activeFlows: [],
    customerSessions: [],
    quoteRequests: [],
    availableSlots: [],
    bookedAppointments: [],
    loading: false,
    error: null,
    publishing: false,

    clearError: () => set({ error: null }),

    loadCurrentSnapshot: async () => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const snapshot = await api.getCurrentSnapshot(tenantId);
        set({ 
          currentSnapshot: snapshot,
          publishedVersion: snapshot ? 'current' : null,
          loading: false 
        });
      } catch (error) {
        set({ 
          error: 'Failed to load current snapshot', 
          loading: false 
        });
      }
    },

    loadSnapshotHistory: async () => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const history = await api.getSnapshotHistory(tenantId);
        set({ snapshotHistory: history, loading: false });
      } catch (error) {
        set({ 
          error: 'Failed to load snapshot history', 
          loading: false 
        });
      }
    },

    publishSnapshot: async (snapshotData: SnapshotData) => {
      set({ publishing: true, error: null });
      try {
        const tenantId = await getTenantId();
        const result = await api.publishSnapshot(tenantId, snapshotData);
        
        if (result.success) {
          set({ 
            currentSnapshot: snapshotData,
            publishedVersion: result.version,
            publishing: false 
          });
          
          // Reload history to show new version
          await get().loadSnapshotHistory();
          return true;
        } else {
          set({ 
            error: result.error || 'Failed to publish snapshot',
            publishing: false 
          });
          return false;
        }
      } catch (error) {
        set({ 
          error: 'Failed to publish snapshot',
          publishing: false 
        });
        return false;
      }
    },

    rollbackSnapshot: async (targetVersion: string) => {
      set({ publishing: true, error: null });
      try {
        const tenantId = await getTenantId();
        const result = await api.rollbackSnapshot(tenantId, targetVersion);
        
        if (result.success) {
          set({ 
            publishedVersion: result.new_version,
            publishing: false 
          });
          
          // Reload current snapshot and history
          await get().loadCurrentSnapshot();
          await get().loadSnapshotHistory();
          return true;
        } else {
          set({ 
            error: result.error || 'Failed to rollback snapshot',
            publishing: false 
          });
          return false;
        }
      } catch (error) {
        set({ 
          error: 'Failed to rollback snapshot',
          publishing: false 
        });
        return false;
      }
    },

    calculateQuote: async (quoteRequest: QuoteRequest) => {
      try {
        const tenantId = await getTenantId();
        const result = await api.calculateQuote(tenantId, quoteRequest);
        
        // Store quote request for tracking
        if (result.success) {
          set(state => ({
            quoteRequests: [...state.quoteRequests, {
              id: crypto.randomUUID(),
              ...quoteRequest,
              result,
              created_at: new Date()
            }]
          }));
        }
        
        return result;
      } catch (error) {
        console.error('Error calculating quote:', error);
        return {
          success: false,
          requires_handoff: true,
          handoff_reason: 'quote_calculation_error'
        };
      }
    },

    loadAvailableSlots: async (date?: string) => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const slots = await api.getAvailableSlots(tenantId, date);
        set({ availableSlots: slots, loading: false });
      } catch (error) {
        set({ 
          error: 'Failed to load available slots', 
          loading: false 
        });
      }
    },

    bookAppointment: async (appointmentData: any) => {
      set({ loading: true, error: null });
      try {
        const tenantId = await getTenantId();
        const result = await api.bookAppointment(tenantId, appointmentData);
        
        if (result.success) {
          set(state => ({
            bookedAppointments: [...state.bookedAppointments, result.appointment],
            loading: false
          }));
          
          // Reload available slots
          await get().loadAvailableSlots();
          return true;
        } else {
          set({ 
            error: result.error || 'Failed to book appointment',
            loading: false 
          });
          return false;
        }
      } catch (error) {
        set({ 
          error: 'Failed to book appointment',
          loading: false 
        });
        return false;
      }
    }
  };
});