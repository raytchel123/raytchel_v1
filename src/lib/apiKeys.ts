import { supabase } from './supabase';

interface ApiKey {
  id: string;
  service: string;
  key: string;
  isActive: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

interface ApiKeyStats {
  totalRequests: number;
  successRate: number;
  paths: Record<string, number>;
  methods: Record<string, number>;
  statusCodes: Record<string, number>;
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private cache: Map<string, { key: string; expiresAt: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private retryAttempts = 3;
  private retryDelay = 1000;

  private constructor() {}

  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  async getKey(service: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(service);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.key;
    }

    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        const { data: tenant } = await supabase.auth.getSession();
        if (!tenant?.session?.user) {
          throw new Error('No authenticated user');
        }

        const { data: key, error } = await supabase.rpc(
          'get_api_key',
          { 
            p_tenant_id: tenant.session.user.id,
            p_service: service 
          }
        );

        if (error) throw error;
        if (!key) throw new Error(`No active API key found for ${service}`);

        // Cache the key
        this.cache.set(service, {
          key,
          expiresAt: Date.now() + this.cacheTTL
        });

        return key;
      } catch (error) {
        attempt++;
        if (attempt === this.retryAttempts) {
          console.error(`Error getting API key for ${service}:`, error);
          throw new Error(`Failed to get API key for ${service}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }

    throw new Error(`Failed to get API key for ${service} after ${this.retryAttempts} attempts`);
  }

  async rotateKey(service: string, newKey: string): Promise<void> {
    try {
      const { data: tenant } = await supabase.auth.getSession();
      if (!tenant?.session?.user) {
        throw new Error('No authenticated user');
      }

      const { error } = await supabase.rpc(
        'rotate_api_key',
        {
          p_tenant_id: tenant.session.user.id,
          p_service: service,
          p_new_key: newKey
        }
      );

      if (error) throw error;

      // Clear cache
      this.cache.delete(service);
    } catch (error) {
      console.error(`Error rotating API key for ${service}:`, error);
      throw new Error(`Failed to rotate API key for ${service}`);
    }
  }

  async validateKey(service: string, key: string, request: {
    ip: string;
    path: string;
    method: string;
  }): Promise<boolean> {
    try {
      const { data: tenant } = await supabase.auth.getSession();
      if (!tenant?.session?.user) {
        throw new Error('No authenticated user');
      }

      const { data: validation, error } = await supabase.rpc(
        'validate_api_key_request',
        {
          p_key_id: key,
          p_request_ip: request.ip,
          p_request_path: request.path,
          p_request_method: request.method
        }
      );

      if (error) throw error;
      return validation.is_valid;
    } catch {
      return false;
    }
  }

  async getKeyStats(keyId: string, startDate?: Date, endDate?: Date): Promise<ApiKeyStats> {
    try {
      const { data: stats, error } = await supabase.rpc(
        'get_api_key_stats',
        {
          p_key_id: keyId,
          p_start_date: startDate?.toISOString(),
          p_end_date: endDate?.toISOString()
        }
      );

      if (error) throw error;
      return stats;
    } catch (error) {
      console.error('Error getting API key stats:', error);
      throw new Error('Failed to get API key stats');
    }
  }

  async trackUsage(keyId: string, request: {
    path: string;
    method: string;
    status: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase.rpc(
        'track_api_key_usage',
        {
          p_key_id: keyId,
          p_request_path: request.path,
          p_request_method: request.method,
          p_response_status: request.status,
          p_metadata: request.metadata
        }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking API key usage:', error);
    }
  }

  async checkRateLimit(keyId: string): Promise<boolean> {
    try {
      const { data: isAllowed, error } = await supabase.rpc(
        'check_api_key_rate_limit',
        { p_key_id: keyId }
      );

      if (error) throw error;
      return isAllowed;
    } catch {
      return false;
    }
  }

  async revokeKey(keyId: string, reason: string): Promise<void> {
    try {
      const { data: tenant } = await supabase.auth.getSession();
      if (!tenant?.session?.user) {
        throw new Error('No authenticated user');
      }

      const { error } = await supabase.rpc(
        'revoke_api_key',
        {
          p_key_id: keyId,
          p_reason: reason,
          p_revoked_by: tenant.session.user.id
        }
      );

      if (error) throw error;

      // Clear cache for affected service
      const { data: key } = await supabase
        .from('api_keys')
        .select('service')
        .eq('id', keyId)
        .single();

      if (key?.service) {
        this.cache.delete(key.service);
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw new Error('Failed to revoke API key');
    }
  }

  async getAuditHistory(keyId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const { data: history, error } = await supabase.rpc(
        'get_api_key_audit_history',
        {
          p_key_id: keyId,
          p_start_date: startDate?.toISOString(),
          p_end_date: endDate?.toISOString()
        }
      );

      if (error) throw error;
      return history;
    } catch (error) {
      console.error('Error getting API key audit history:', error);
      throw new Error('Failed to get API key audit history');
    }
  }
}