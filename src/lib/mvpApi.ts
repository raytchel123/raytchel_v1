import { supabase } from './supabase';

export interface SnapshotData {
  qna: any[];
  templates: any[];
  products: any[];
  triggers: any[];
  flows?: any[];
}

export interface RuntimeDiff {
  version: string;
  changed: {
    qna?: Array<{ op: 'upsert' | 'delete'; item: any }>;
    templates?: Array<{ op: 'upsert' | 'delete'; item: any }>;
    products?: Array<{ op: 'upsert' | 'delete'; item: any }>;
    triggers?: Array<{ op: 'upsert' | 'delete'; item: any }>;
    flows?: Array<{ op: 'upsert' | 'delete'; item: any }>;
  };
  has_more: boolean;
  next_since_ts: string;
}

export interface QuoteRequest {
  product_type: string;
  specifications: {
    material?: string;
    model?: string;
    ring_size?: string;
    budget_range?: { min: number; max: number };
    urgency?: 'high' | 'medium' | 'low';
    occasion?: string;
  };
}

export interface QuoteResult {
  success: boolean;
  product?: any;
  estimated_price?: {
    min: number;
    max: number;
    currency: string;
  };
  disclaimer?: string;
  requires_handoff?: boolean;
  handoff_reason?: string;
}

export class MVPApiService {
  private static instance: MVPApiService;

  private constructor() {}

  static getInstance(): MVPApiService {
    if (!MVPApiService.instance) {
      MVPApiService.instance = new MVPApiService();
    }
    return MVPApiService.instance;
  }

  async publishSnapshot(tenantId: string, snapshotData: SnapshotData): Promise<{
    success: boolean;
    version?: string;
    snapshot_id?: string;
    error?: string;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runtime-sync/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          snapshot_data: snapshotData,
          created_by: user.user.id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish snapshot');
      }

      return result;
    } catch (error) {
      console.error('Error publishing snapshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getRuntimeDiff(tenantId: string, sinceTs?: string): Promise<RuntimeDiff | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runtime-sync/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          since_ts: sinceTs
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get runtime diff');
      }

      return result;
    } catch (error) {
      console.error('Error getting runtime diff:', error);
      return null;
    }
  }

  async rollbackSnapshot(tenantId: string, targetVersion: string): Promise<{
    success: boolean;
    rolled_back_to?: string;
    new_version?: string;
    error?: string;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runtime-sync/rollback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          target_version: targetVersion,
          created_by: user.user.id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to rollback snapshot');
      }

      return result;
    } catch (error) {
      console.error('Error rolling back snapshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async calculateQuote(tenantId: string, quoteRequest: QuoteRequest): Promise<QuoteResult> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runtime-sync/quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          product_type: quoteRequest.product_type,
          specifications: quoteRequest.specifications
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to calculate quote');
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
  }

  async bookAppointment(tenantId: string, appointmentData: {
    contact_id: string;
    contact_name: string;
    contact_phone: string;
    slot_date: string;
    slot_time: string;
    service_type?: string;
  }): Promise<{
    success: boolean;
    appointment?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runtime-sync/appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          ...appointmentData
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to book appointment');
      }

      return result;
    } catch (error) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAvailableSlots(tenantId: string, date?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('appointment_slots')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'available')
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date')
        .order('slot_time');

      if (date) {
        query = query.eq('slot_date', date);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  async getCurrentSnapshot(tenantId: string): Promise<SnapshotData | null> {
    try {
      const { data, error } = await supabase
        .from('snapshots')
        .select('snapshot_data')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data?.snapshot_data || null;
    } catch (error) {
      console.error('Error getting current snapshot:', error);
      return null;
    }
  }

  async getSnapshotHistory(tenantId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('snapshots')
        .select('id, version, created_at, created_by, is_active')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting snapshot history:', error);
      return [];
    }
  }
}