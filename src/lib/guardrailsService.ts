import { supabase } from './supabase';

export interface GuardrailCheck {
  triggered: boolean;
  reason?: 'price_missing' | 'low_confidence' | 'sensitive_info';
  fallbackMessage?: string;
  handoffTrigger?: boolean;
  evidence?: Record<string, any>;
  confirmationTemplate?: string;
  confidence?: number;
  threshold?: number;
}

export interface DecisionLog {
  id: string;
  tenantId: string;
  conversationId: string;
  intent: string;
  confidence: number;
  guardrailTriggered?: string;
  evidence: Record<string, any>;
  fallbackUsed: boolean;
  handoffOffered: boolean;
  userChoice?: string;
  createdAt: Date;
}

export class GuardrailsService {
  private static instance: GuardrailsService;

  private constructor() {}

  static getInstance(): GuardrailsService {
    if (!GuardrailsService.instance) {
      GuardrailsService.instance = new GuardrailsService();
    }
    return GuardrailsService.instance;
  }

  async checkPriceGuardrail(
    tenantId: string,
    productId: string,
    intent: string
  ): Promise<GuardrailCheck> {
    try {
      const { data, error } = await supabase.rpc('check_price_guardrail', {
        p_tenant_id: tenantId,
        p_product_id: productId,
        p_intent: intent
      });

      if (error) throw error;

      return {
        triggered: data.triggered,
        reason: data.triggered ? 'price_missing' : undefined,
        fallbackMessage: data.fallback_message,
        handoffTrigger: data.handoff_trigger,
        evidence: data.evidence
      };
    } catch (error) {
      console.error('Error checking price guardrail:', error);
      // Safe fallback - always trigger guardrail on error
      return {
        triggered: true,
        reason: 'price_missing',
        fallbackMessage: 'Posso confirmar com especialista para evitar erro? Prefere seguir por agendamento ou falar com humano?',
        handoffTrigger: true,
        evidence: { error: 'guardrail_check_failed' }
      };
    }
  }

  async checkConfidenceGuardrail(
    tenantId: string,
    intent: string,
    confidence: number,
    category: string = 'general'
  ): Promise<GuardrailCheck> {
    try {
      const { data, error } = await supabase.rpc('check_confidence_guardrail', {
        p_tenant_id: tenantId,
        p_intent: intent,
        p_confidence: confidence,
        p_category: category
      });

      if (error) throw error;

      return {
        triggered: data.triggered,
        reason: data.triggered ? 'low_confidence' : undefined,
        confirmationTemplate: data.confirmation_template,
        confidence: data.confidence,
        threshold: data.threshold,
        evidence: data.evidence
      };
    } catch (error) {
      console.error('Error checking confidence guardrail:', error);
      // Safe fallback - trigger confirmation on error
      return {
        triggered: true,
        reason: 'low_confidence',
        confirmationTemplate: `Você quis dizer "${intent}" ou algo diferente? Posso confirmar?`,
        confidence,
        threshold: 0.7,
        evidence: { error: 'confidence_check_failed' }
      };
    }
  }

  async logDecision(
    tenantId: string,
    conversationId: string,
    intent: string,
    confidence: number,
    guardrailTriggered?: string,
    evidence?: Record<string, any>,
    fallbackUsed: boolean = false,
    handoffOffered: boolean = false
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_guardrail_decision', {
        p_tenant_id: tenantId,
        p_conversation_id: conversationId,
        p_intent: intent,
        p_confidence: confidence,
        p_guardrail_triggered: guardrailTriggered,
        p_evidence: evidence || {},
        p_fallback_used: fallbackUsed,
        p_handoff_offered: handoffOffered
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging guardrail decision:', error);
      return null;
    }
  }

  async getSafeProductRecommendation(
    tenantId: string,
    budgetMin: number,
    budgetMax: number,
    material?: string,
    category: string = 'aliancas'
  ): Promise<{
    products: any[];
    alternatives: any[];
    hasSafeOptions: boolean;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_safe_product_recommendation', {
        p_tenant_id: tenantId,
        p_budget_min: budgetMin,
        p_budget_max: budgetMax,
        p_material: material,
        p_category: category
      });

      if (error) throw error;

      return {
        products: data.products || [],
        alternatives: data.alternatives || [],
        hasSafeOptions: data.has_safe_options || false
      };
    } catch (error) {
      console.error('Error getting safe product recommendation:', error);
      return {
        products: [],
        alternatives: [],
        hasSafeOptions: false
      };
    }
  }

  async validateResponse(
    tenantId: string,
    intent: string,
    confidence: number,
    responseContent: string,
    context: Record<string, any>
  ): Promise<{
    isValid: boolean;
    guardrails: GuardrailCheck[];
    safeResponse?: string;
    requiresHandoff?: boolean;
  }> {
    const guardrails: GuardrailCheck[] = [];
    let isValid = true;
    let safeResponse = responseContent;
    let requiresHandoff = false;

    try {
      // Check confidence guardrail
      const confidenceCheck = await this.checkConfidenceGuardrail(
        tenantId,
        intent,
        confidence,
        context.category || 'general'
      );

      if (confidenceCheck.triggered) {
        guardrails.push(confidenceCheck);
        isValid = false;
        safeResponse = confidenceCheck.confirmationTemplate || safeResponse;
      }

      // Check price guardrail if response mentions price
      if (responseContent.includes('R$') || responseContent.includes('preço') || responseContent.includes('valor')) {
        const productId = context.productId || context.product_id;
        
        if (productId) {
          const priceCheck = await this.checkPriceGuardrail(tenantId, productId, intent);
          
          if (priceCheck.triggered) {
            guardrails.push(priceCheck);
            isValid = false;
            safeResponse = priceCheck.fallbackMessage || safeResponse;
            requiresHandoff = priceCheck.handoffTrigger || false;
          }
        }
      }

      // Check for sensitive information
      const sensitivePatterns = [
        /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, // CPF
        /\b\d{16}\b/, // Card number
        /\b\d{3}\b/, // CVV
        /senha|password/i
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(responseContent)) {
          guardrails.push({
            triggered: true,
            reason: 'sensitive_info',
            fallbackMessage: 'Para informações sensíveis, prefiro conectar você com um especialista. Posso agendar?',
            handoffTrigger: true,
            evidence: { sensitive_pattern_detected: true }
          });
          isValid = false;
          requiresHandoff = true;
          break;
        }
      }

      return {
        isValid,
        guardrails,
        safeResponse: isValid ? responseContent : safeResponse,
        requiresHandoff
      };
    } catch (error) {
      console.error('Error validating response:', error);
      
      // Safe fallback on validation error
      return {
        isValid: false,
        guardrails: [{
          triggered: true,
          reason: 'low_confidence',
          fallbackMessage: 'Deixe-me conectar você com um especialista para garantir informações precisas.',
          handoffTrigger: true,
          evidence: { validation_error: true }
        }],
        safeResponse: 'Deixe-me conectar você com um especialista para garantir informações precisas.',
        requiresHandoff: true
      };
    }
  }

  async getDecisionLogs(
    tenantId: string,
    conversationId?: string,
    limit: number = 50
  ): Promise<DecisionLog[]> {
    try {
      let query = supabase
        .from('decision_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        tenantId: log.tenant_id,
        conversationId: log.conversation_id,
        intent: log.intent,
        confidence: log.confidence,
        guardrailTriggered: log.guardrail_triggered,
        evidence: log.evidence,
        fallbackUsed: log.fallback_used,
        handoffOffered: log.handoff_offered,
        userChoice: log.user_choice,
        createdAt: new Date(log.created_at)
      }));
    } catch (error) {
      console.error('Error getting decision logs:', error);
      return [];
    }
  }

  async updateGuardrailPolicy(
    tenantId: string,
    policyType: 'price_missing' | 'low_confidence' | 'sensitive_info',
    updates: {
      enabled?: boolean;
      thresholdValue?: number;
      fallbackMessage?: string;
      handoffTrigger?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('guardrail_policies')
        .update({
          enabled: updates.enabled,
          threshold_value: updates.thresholdValue,
          fallback_message: updates.fallbackMessage,
          handoff_trigger: updates.handoffTrigger,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('policy_type', policyType);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating guardrail policy:', error);
      return false;
    }
  }

  async getGuardrailStats(
    tenantId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalDecisions: number;
    guardrailsTriggered: number;
    fallbacksUsed: number;
    handoffsOffered: number;
    topTriggers: Array<{ reason: string; count: number }>;
    confidenceDistribution: Array<{ range: string; count: number }>;
  }> {
    try {
      let query = supabase
        .from('decision_logs')
        .select('*')
        .eq('tenant_id', tenantId);

      if (fromDate) {
        query = query.gte('created_at', fromDate.toISOString());
      }
      if (toDate) {
        query = query.lte('created_at', toDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const logs = data || [];
      
      // Calculate stats
      const totalDecisions = logs.length;
      const guardrailsTriggered = logs.filter(l => l.guardrail_triggered).length;
      const fallbacksUsed = logs.filter(l => l.fallback_used).length;
      const handoffsOffered = logs.filter(l => l.handoff_offered).length;

      // Top triggers
      const triggerCounts = logs.reduce((acc, log) => {
        if (log.guardrail_triggered) {
          acc[log.guardrail_triggered] = (acc[log.guardrail_triggered] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topTriggers = Object.entries(triggerCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Confidence distribution
      const confidenceRanges = {
        '0.0-0.3': 0,
        '0.3-0.5': 0,
        '0.5-0.7': 0,
        '0.7-0.9': 0,
        '0.9-1.0': 0
      };

      logs.forEach(log => {
        const conf = log.confidence;
        if (conf < 0.3) confidenceRanges['0.0-0.3']++;
        else if (conf < 0.5) confidenceRanges['0.3-0.5']++;
        else if (conf < 0.7) confidenceRanges['0.5-0.7']++;
        else if (conf < 0.9) confidenceRanges['0.7-0.9']++;
        else confidenceRanges['0.9-1.0']++;
      });

      const confidenceDistribution = Object.entries(confidenceRanges)
        .map(([range, count]) => ({ range, count }));

      return {
        totalDecisions,
        guardrailsTriggered,
        fallbacksUsed,
        handoffsOffered,
        topTriggers,
        confidenceDistribution
      };
    } catch (error) {
      console.error('Error getting guardrail stats:', error);
      return {
        totalDecisions: 0,
        guardrailsTriggered: 0,
        fallbacksUsed: 0,
        handoffsOffered: 0,
        topTriggers: [],
        confidenceDistribution: []
      };
    }
  }
}