import { supabase } from './supabase';
import type { 
  Flow, 
  Intent, 
  QAItem, 
  Service, 
  Template, 
  Conversation,
  DailyMetrics,
  AuditLog,
  ApiResponse,
  FlowValidationResult,
  RuntimeSyncResponse,
  FunnelMetrics
} from '../types/admin';

export class AdminApiService {
  private static instance: AdminApiService;

  private constructor() {}

  static getInstance(): AdminApiService {
    if (!AdminApiService.instance) {
      AdminApiService.instance = new AdminApiService();
    }
    return AdminApiService.instance;
  }

  // Flow Management
  async createFlow(orgId: string, name: string, description?: string): Promise<ApiResponse<Flow>> {
    try {
      const { data, error } = await supabase
        .from('flows')
        .insert([{
          org_id: orgId,
          name,
          description,
          status: 'draft',
          version: 1,
          graph_json: {
            nodes: [
              {
                id: 'start',
                type: 'start',
                position: { x: 100, y: 100 }
              }
            ],
            start: 'start'
          },
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(orgId, 'create', 'flow', data.id, null, data);

      return { success: true, data };
    } catch (error) {
      console.error('Error creating flow:', error);
      return { success: false, error: 'Failed to create flow' };
    }
  }

  async getFlows(orgId: string, status?: string): Promise<ApiResponse<Flow[]>> {
    try {
      let query = supabase
        .from('flows')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting flows:', error);
      return { success: false, error: 'Failed to get flows' };
    }
  }

  async getFlow(flowId: string): Promise<ApiResponse<Flow>> {
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting flow:', error);
      return { success: false, error: 'Failed to get flow' };
    }
  }

  async updateFlow(flowId: string, updates: Partial<Flow>): Promise<ApiResponse<Flow>> {
    try {
      // Get current flow for audit
      const { data: currentFlow } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .single();

      // Validate graph if provided
      if (updates.graph_json) {
        const { data: validation } = await supabase.rpc('validate_flow_graph', {
          graph_json: updates.graph_json
        });

        if (!validation.valid) {
          return {
            success: false,
            error: 'Flow validation failed',
            validation_errors: validation.errors
          };
        }
      }

      const { data, error } = await supabase
        .from('flows')
        .update(updates)
        .eq('id', flowId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(
        data.org_id, 
        'update', 
        'flow', 
        flowId, 
        currentFlow, 
        data
      );

      return { success: true, data };
    } catch (error) {
      console.error('Error updating flow:', error);
      return { success: false, error: 'Failed to update flow' };
    }
  }

  async publishFlow(flowId: string): Promise<ApiResponse<{ version: number; published_at: Date }>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('publish_flow', {
        flow_id: flowId,
        actor_id: user.user.id
      });

      if (error) throw error;

      if (!data.success) {
        return {
          success: false,
          error: data.error,
          validation_errors: data.validation_errors
        };
      }

      return {
        success: true,
        data: {
          version: data.version,
          published_at: new Date(data.published_at)
        }
      };
    } catch (error) {
      console.error('Error publishing flow:', error);
      return { success: false, error: 'Failed to publish flow' };
    }
  }

  async rollbackFlow(flowId: string): Promise<ApiResponse<{ rolled_back_to_version: number }>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('rollback_flow', {
        flow_id: flowId,
        actor_id: user.user.id
      });

      if (error) throw error;

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        data: { rolled_back_to_version: data.rolled_back_to_version }
      };
    } catch (error) {
      console.error('Error rolling back flow:', error);
      return { success: false, error: 'Failed to rollback flow' };
    }
  }

  // Intent Management
  async getIntents(orgId: string): Promise<ApiResponse<Intent[]>> {
    try {
      const { data, error } = await supabase
        .from('intents')
        .select('*')
        .eq('org_id', orgId)
        .order('name');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting intents:', error);
      return { success: false, error: 'Failed to get intents' };
    }
  }

  async createIntent(intent: Omit<Intent, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Intent>> {
    try {
      const { data, error } = await supabase
        .from('intents')
        .insert([intent])
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(intent.org_id, 'create', 'intent', data.id, null, data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating intent:', error);
      return { success: false, error: 'Failed to create intent' };
    }
  }

  async updateIntent(intentId: string, updates: Partial<Intent>): Promise<ApiResponse<Intent>> {
    try {
      const { data: currentIntent } = await supabase
        .from('intents')
        .select('*')
        .eq('id', intentId)
        .single();

      const { data, error } = await supabase
        .from('intents')
        .update(updates)
        .eq('id', intentId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(
        data.org_id, 
        'update', 
        'intent', 
        intentId, 
        currentIntent, 
        data
      );

      return { success: true, data };
    } catch (error) {
      console.error('Error updating intent:', error);
      return { success: false, error: 'Failed to update intent' };
    }
  }

  // Q&A Management
  async getQAItems(orgId: string): Promise<ApiResponse<QAItem[]>> {
    try {
      const { data, error } = await supabase
        .from('qa_faq')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting Q&A items:', error);
      return { success: false, error: 'Failed to get Q&A items' };
    }
  }

  async createQAItem(qaItem: Omit<QAItem, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<QAItem>> {
    try {
      const { data, error } = await supabase
        .from('qa_faq')
        .insert([qaItem])
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(qaItem.org_id, 'create', 'qa_faq', data.id, null, data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating Q&A item:', error);
      return { success: false, error: 'Failed to create Q&A item' };
    }
  }

  // Services Management
  async getServices(orgId: string): Promise<ApiResponse<Service[]>> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('org_id', orgId)
        .order('name');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting services:', error);
      return { success: false, error: 'Failed to get services' };
    }
  }

  async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Service>> {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([service])
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(service.org_id, 'create', 'service', data.id, null, data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating service:', error);
      return { success: false, error: 'Failed to create service' };
    }
  }

  // Templates Management
  async getTemplates(orgId: string): Promise<ApiResponse<Template[]>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('org_id', orgId)
        .order('name');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting templates:', error);
      return { success: false, error: 'Failed to get templates' };
    }
  }

  async createTemplate(template: Omit<Template, 'id' | 'usage_count' | 'click_count' | 'conversion_count' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Template>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .insert([{
          ...template,
          usage_count: 0,
          click_count: 0,
          conversion_count: 0
        }])
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEvent(template.org_id, 'create', 'template', data.id, null, data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating template:', error);
      return { success: false, error: 'Failed to create template' };
    }
  }

  // Metrics
  async getDailyMetrics(orgId: string, fromDate?: Date, toDate?: Date): Promise<ApiResponse<DailyMetrics[]>> {
    try {
      let query = supabase
        .from('metrics_daily')
        .select('*')
        .eq('org_id', orgId)
        .order('date', { ascending: false });

      if (fromDate) {
        query = query.gte('date', fromDate.toISOString().split('T')[0]);
      }
      if (toDate) {
        query = query.lte('date', toDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting daily metrics:', error);
      return { success: false, error: 'Failed to get daily metrics' };
    }
  }

  async getFunnelMetrics(orgId: string, fromDate?: Date, toDate?: Date): Promise<ApiResponse<FunnelMetrics>> {
    try {
      const { data, error } = await supabase.rpc('get_funnel_metrics', {
        org_id_param: orgId,
        from_date: fromDate?.toISOString().split('T')[0],
        to_date: toDate?.toISOString().split('T')[0]
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting funnel metrics:', error);
      return { success: false, error: 'Failed to get funnel metrics' };
    }
  }

  // Conversations & Handoff
  async getConversations(orgId: string, status?: string): Promise<ApiResponse<Conversation[]>> {
    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting conversations:', error);
      return { success: false, error: 'Failed to get conversations' };
    }
  }

  async resolveHandoff(conversationId: string, note: string): Promise<ApiResponse<void>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: conversation, error: getError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (getError) throw getError;

      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'resolved',
          assigned_agent_id: user.user.id,
          metadata: {
            ...conversation.metadata,
            resolution_note: note,
            resolved_at: new Date().toISOString()
          }
        })
        .eq('id', conversationId);

      if (error) throw error;

      await this.logAuditEvent(
        conversation.org_id,
        'resolve_handoff',
        'conversation',
        conversationId,
        conversation,
        { status: 'resolved', note }
      );

      return { success: true };
    } catch (error) {
      console.error('Error resolving handoff:', error);
      return { success: false, error: 'Failed to resolve handoff' };
    }
  }

  // Runtime Sync
  async getRuntimeConfig(orgId: string, sinceTs?: number): Promise<ApiResponse<RuntimeSyncResponse>> {
    try {
      const { data, error } = await supabase.rpc('get_runtime_config', {
        org_id_param: orgId,
        since_ts: sinceTs
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting runtime config:', error);
      return { success: false, error: 'Failed to get runtime config' };
    }
  }

  async processWebhookEvent(orgId: string, eventType: string, payload: Record<string, any>): Promise<ApiResponse<void>> {
    try {
      const { data, error } = await supabase.rpc('process_webhook_event', {
        org_id_param: orgId,
        event_type: eventType,
        payload
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error processing webhook event:', error);
      return { success: false, error: 'Failed to process webhook event' };
    }
  }

  // Audit Logs
  async getAuditLogs(orgId: string, entity?: string, limit: number = 100): Promise<ApiResponse<AuditLog[]>> {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          actor:actor_id (name, email)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entity) {
        query = query.eq('entity', entity);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return { success: false, error: 'Failed to get audit logs' };
    }
  }

  // Helper method for audit logging
  private async logAuditEvent(
    orgId: string,
    action: string,
    entity: string,
    entityId: string,
    beforeData?: any,
    afterData?: any
  ): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      await supabase.rpc('log_audit_event', {
        org_id_param: orgId,
        actor_id_param: user.user?.id,
        action_param: action,
        entity_param: entity,
        entity_id_param: entityId,
        before_json_param: beforeData,
        after_json_param: afterData
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  // Bulk operations
  async bulkImportIntents(orgId: string, intents: Array<Omit<Intent, 'id' | 'org_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Intent[]>> {
    try {
      const intentsWithOrgId = intents.map(intent => ({
        ...intent,
        org_id: orgId
      }));

      const { data, error } = await supabase
        .from('intents')
        .insert(intentsWithOrgId)
        .select();

      if (error) throw error;

      await this.logAuditEvent(orgId, 'bulk_import', 'intents', 'bulk', null, {
        count: data.length,
        intents: data.map(i => i.name)
      });

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error bulk importing intents:', error);
      return { success: false, error: 'Failed to bulk import intents' };
    }
  }

  async bulkImportQA(orgId: string, qaItems: Array<Omit<QAItem, 'id' | 'org_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<QAItem[]>> {
    try {
      const qaItemsWithOrgId = qaItems.map(qa => ({
        ...qa,
        org_id: orgId
      }));

      const { data, error } = await supabase
        .from('qa_faq')
        .insert(qaItemsWithOrgId)
        .select();

      if (error) throw error;

      await this.logAuditEvent(orgId, 'bulk_import', 'qa_faq', 'bulk', null, {
        count: data.length,
        questions: data.map(q => q.question)
      });

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error bulk importing Q&A:', error);
      return { success: false, error: 'Failed to bulk import Q&A' };
    }
  }
}