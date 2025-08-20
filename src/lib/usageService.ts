import { supabase } from './supabase';

export interface UsageStatus {
  tenant_id: string;
  month_year: string;
  usage: {
    [key: string]: {
      current: number;
      limit: number;
      percentage: number;
      remaining: number;
      blocked: boolean;
      warning: boolean;
    };
  };
}

export interface UsageAlert {
  id: string;
  tenant_id: string;
  usage_type: string;
  threshold_percentage: number;
  current_usage: number;
  limit_value: number;
  month_year: string;
  alert_sent_at: Date;
}

export interface ActionCheck {
  can_proceed: boolean;
  usage_info: any;
  block_message?: string;
  cta_message?: string;
}

export class UsageService {
  private static instance: UsageService;

  private constructor() {}

  static getInstance(): UsageService {
    if (!UsageService.instance) {
      UsageService.instance = new UsageService();
    }
    return UsageService.instance;
  }

  async getUsageStatus(tenantId: string): Promise<UsageStatus | null> {
    try {
      const { data, error } = await supabase.rpc('get_usage_status', {
        p_tenant_id: tenantId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting usage status:', error);
      return null;
    }
  }

  async canPerformAction(tenantId: string, actionType: string): Promise<ActionCheck> {
    try {
      const { data, error } = await supabase.rpc('can_perform_action', {
        p_tenant_id: tenantId,
        p_action_type: actionType
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking action permission:', error);
      return {
        can_proceed: false,
        usage_info: {},
        block_message: 'Erro ao verificar limite de uso',
        cta_message: 'Tente novamente'
      };
    }
  }

  async incrementUsage(
    tenantId: string, 
    usageType: string, 
    idempotencyKey?: string
  ): Promise<{
    success: boolean;
    current_count: number;
    percentage: number;
    can_continue: boolean;
    alert_threshold?: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('increment_usage_counter', {
        p_tenant_id: tenantId,
        p_usage_type: usageType,
        p_idempotency_key: idempotencyKey
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return {
        success: false,
        current_count: 0,
        percentage: 0,
        can_continue: false
      };
    }
  }

  async getUsageAlerts(tenantId: string, monthYear?: string): Promise<UsageAlert[]> {
    try {
      let query = supabase
        .from('tenant_usage_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('alert_sent_at', { ascending: false });

      if (monthYear) {
        query = query.eq('month_year', monthYear);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(alert => ({
        id: alert.id,
        tenant_id: alert.tenant_id,
        usage_type: alert.usage_type,
        threshold_percentage: alert.threshold_percentage,
        current_usage: alert.current_usage,
        limit_value: alert.limit_value,
        month_year: alert.month_year,
        alert_sent_at: new Date(alert.alert_sent_at)
      }));
    } catch (error) {
      console.error('Error getting usage alerts:', error);
      return [];
    }
  }

  async updateUsageLimits(
    tenantId: string, 
    limits: Record<string, number>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tenant_usage_limits')
        .upsert({
          tenant_id: tenantId,
          limits: limits,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating usage limits:', error);
      return false;
    }
  }

  // Helper methods for specific actions
  async canSendWhatsApp(tenantId: string): Promise<ActionCheck> {
    return this.canPerformAction(tenantId, 'send_whatsapp');
  }

  async canSendTemplate(tenantId: string): Promise<ActionCheck> {
    return this.canPerformAction(tenantId, 'send_template');
  }

  async canGenerateQuote(tenantId: string): Promise<ActionCheck> {
    return this.canPerformAction(tenantId, 'generate_quote');
  }

  async canCreateAppointment(tenantId: string): Promise<ActionCheck> {
    return this.canPerformAction(tenantId, 'create_appointment');
  }

  async canRequestHandoff(tenantId: string): Promise<ActionCheck> {
    return this.canPerformAction(tenantId, 'request_handoff');
  }

  // Track usage for specific actions
  async trackWhatsAppMessage(tenantId: string, messageId: string): Promise<void> {
    await this.incrementUsage(tenantId, 'whatsapp_messages', messageId);
  }

  async trackTemplateUsage(tenantId: string, templateId: string): Promise<void> {
    await this.incrementUsage(tenantId, 'templates', templateId);
  }

  async trackQuoteGeneration(tenantId: string, quoteId: string): Promise<void> {
    await this.incrementUsage(tenantId, 'quotes', quoteId);
  }

  async trackAppointmentCreation(tenantId: string, appointmentId: string): Promise<void> {
    await this.incrementUsage(tenantId, 'appointments', appointmentId);
  }

  async trackHandoffRequest(tenantId: string, chatId: string): Promise<void> {
    await this.incrementUsage(tenantId, 'handoffs', `${chatId}_handoff`);
  }

  // Get usage type labels
  getUsageTypeLabel(usageType: string): string {
    const labels: Record<string, string> = {
      'whatsapp_messages': 'Mensagens WhatsApp',
      'templates': 'Templates Enviados',
      'quotes': 'Orçamentos Gerados',
      'appointments': 'Agendamentos',
      'handoffs': 'Transferências Humanas'
    };
    return labels[usageType] || usageType;
  }

  // Get usage type icons
  getUsageTypeIcon(usageType: string): string {
    const icons: Record<string, string> = {
      'whatsapp_messages': '💬',
      'templates': '📋',
      'quotes': '💰',
      'appointments': '📅',
      'handoffs': '🤝'
    };
    return icons[usageType] || '📊';
  }
}