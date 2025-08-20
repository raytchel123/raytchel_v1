// Raytchel Admin Types

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: {
    timezone?: string;
    business_hours?: {
      start: string;
      end: string;
      days: string[];
    };
    branding?: {
      primary_color: string;
      logo_url?: string;
    };
  };
  created_at: Date;
  updated_at: Date;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'agent' | 'viewer';
  user?: AdminUser;
  created_at: Date;
}

export interface Connection {
  id: string;
  org_id: string;
  type: 'whatsapp' | 'webhook' | 'runtime_key';
  name: string;
  status: 'active' | 'inactive' | 'error';
  creds_json: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface FlowNode {
  id: string;
  type: 'start' | 'ask' | 'action' | 'message' | 'condition' | 'end';
  position: { x: number; y: number };
  text?: string;
  options?: Array<{ label: string; goTo: string }>;
  action?: string;
  goTo?: string;
  conditions?: Array<{ intent: string; goTo: string }>;
  defaultGoTo?: string;
  metadata?: Record<string, any>;
}

export interface Flow {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  graph_json: {
    nodes: FlowNode[];
    start: string;
    metadata?: Record<string, any>;
  };
  validation_errors: string[];
  created_by: string;
  created_at: Date;
  published_at?: Date;
  rolled_back_from_id?: string;
}

export interface Intent {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  samples: string[];
  confidence_threshold: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface QAItem {
  id: string;
  org_id: string;
  question: string;
  variations: string[];
  answer_richtext: string;
  media: Array<{ type: string; url: string }>;
  source?: string;
  confidence_policy: 'low_confirm' | 'low_fallback' | 'strict';
  requires_guardrail: boolean;
  guardrail_conditions: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  duration_min: number;
  price_cents?: number;
  professionals: string[];
  upsells: string[];
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  id: string;
  org_id: string;
  resource_type: 'professional' | 'room';
  resource_id: string;
  resource_name: string;
  availability_json: Record<string, string[]>;
  timezone: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Template {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  type: 'button' | 'list' | 'carousel' | 'text';
  payload_json: Record<string, any>;
  usage_count: number;
  click_count: number;
  conversion_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DailyMetrics {
  id: string;
  org_id: string;
  date: Date;
  leads: number;
  qualified: number;
  booked: number;
  attended: number;
  paid: number;
  first_response_sla_sec: number;
  template_ctr_json: Record<string, number>;
  flow_conversion_json: Record<string, number>;
  created_at: Date;
}

export interface Conversation {
  id: string;
  org_id: string;
  contact_id: string;
  contact_name?: string;
  contact_phone?: string;
  status: 'active' | 'waiting_human' | 'resolved' | 'closed';
  current_flow_id?: string;
  current_step?: string;
  last_intent?: string;
  requires_human: boolean;
  handoff_reason?: string;
  handoff_requested_at?: Date;
  assigned_agent_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  before_json?: Record<string, any>;
  after_json?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface OutboxEvent {
  id: string;
  org_id: string;
  event_type: string;
  payload: Record<string, any>;
  webhook_urls: string[];
  delivery_attempts: number;
  last_attempt_at?: Date;
  delivered_at?: Date;
  error_message?: string;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validation_errors?: string[];
}

export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
  node_count?: number;
}

export interface RuntimeSyncResponse {
  flows: Flow[];
  intents: Intent[];
  qa_faq: QAItem[];
  services: Service[];
  templates: Template[];
  metadata: {
    org_id: string;
    generated_at: number;
    since_ts?: number;
  };
}

export interface FunnelMetrics {
  leads: number;
  qualified: number;
  booked: number;
  attended: number;
  paid: number;
  conversion_rates: {
    lead_to_qualified: number;
    qualified_to_booked: number;
    booked_to_attended: number;
    attended_to_paid: number;
  };
  avg_first_response_sla: number;
}