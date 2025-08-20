/*
  # AI Training and Behavior Analysis Tables

  1. New Tables
    - `ai_training_history`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `training_type` (text, check constraint: 'rules', 'tone', 'responses')
      - `description` (text, not null)
      - `changes` (jsonb, not null)
      - `impact_metrics` (jsonb, default '{}')
      - `created_at` (timestamptz, default now())
      - `created_by` (uuid, foreign key to profiles)

    - `ai_behavior_analysis`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `chat_id` (uuid, foreign key to chats)
      - `analysis_type` (text, check constraint: 'intent', 'tone', 'effectiveness')
      - `before_state` (jsonb, not null)
      - `after_state` (jsonb, not null)
      - `improvement_metrics` (jsonb, default '{}')
      - `created_at` (timestamptz, default now())

    - `ai_training_suggestions`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `category` (text, not null)
      - `current_behavior` (text, not null)
      - `suggested_behavior` (text, not null)
      - `reason` (text, not null)
      - `confidence` (float, check constraint: 0-1)
      - `status` (text, check constraint: 'pending', 'approved', 'rejected', 'implemented')
      - `implemented_at` (timestamptz)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for tenant-based access control

  3. Functions
    - `record_training_change()` - Records training modifications
    - `analyze_behavior_change()` - Analyzes AI behavior improvements
    - `get_recent_training_history()` - Retrieves recent training changes
    - `get_training_suggestions()` - Gets AI improvement suggestions

  4. Initial Data
    - Sample training history for Zaffira tenant
    - Demonstrates tone adjustments, response variations, and rule implementations
*/

-- Create ai_training_history table
CREATE TABLE IF NOT EXISTS ai_training_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  training_type TEXT CHECK (training_type IN ('rules', 'tone', 'responses')),
  description TEXT NOT NULL,
  changes JSONB NOT NULL,
  impact_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Create ai_behavior_analysis table
CREATE TABLE IF NOT EXISTS ai_behavior_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  chat_id UUID REFERENCES chats(id),
  analysis_type TEXT CHECK (analysis_type IN ('intent', 'tone', 'effectiveness')),
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  improvement_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_training_suggestions table
CREATE TABLE IF NOT EXISTS ai_training_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  category TEXT NOT NULL,
  current_behavior TEXT NOT NULL,
  suggested_behavior TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')) DEFAULT 'pending',
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_behavior_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_suggestions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Tenant training history access"
  ON ai_training_history FOR ALL
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Tenant behavior analysis access"
  ON ai_behavior_analysis FOR ALL
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Tenant training suggestions access"
  ON ai_training_suggestions FOR ALL
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid()
  ));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_training_history_tenant ON ai_training_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_history_type ON ai_training_history(training_type);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_analysis_tenant ON ai_behavior_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_analysis_chat ON ai_behavior_analysis(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_suggestions_tenant ON ai_training_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_suggestions_status ON ai_training_suggestions(status);

-- Create function to record training change
CREATE OR REPLACE FUNCTION record_training_change(
  p_tenant_id UUID,
  p_training_type TEXT,
  p_description TEXT,
  p_changes JSONB,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO ai_training_history (
    tenant_id,
    training_type,
    description,
    changes,
    created_by
  ) VALUES (
    p_tenant_id,
    p_training_type,
    p_description,
    p_changes,
    p_created_by
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to analyze behavior change
CREATE OR REPLACE FUNCTION analyze_behavior_change(
  p_tenant_id UUID,
  p_chat_id UUID,
  p_analysis_type TEXT,
  p_before_state JSONB,
  p_after_state JSONB
)
RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
  v_metrics JSONB;
BEGIN
  -- Calculate improvement metrics
  v_metrics := jsonb_build_object(
    'confidence_change', 
    (p_after_state->>'confidence')::float - (p_before_state->>'confidence')::float,
    'response_time_change',
    (p_after_state->>'response_time')::float - (p_before_state->>'response_time')::float,
    'effectiveness_change',
    (p_after_state->>'effectiveness')::float - (p_before_state->>'effectiveness')::float
  );

  -- Record analysis
  INSERT INTO ai_behavior_analysis (
    tenant_id,
    chat_id,
    analysis_type,
    before_state,
    after_state,
    improvement_metrics
  ) VALUES (
    p_tenant_id,
    p_chat_id,
    p_analysis_type,
    p_before_state,
    p_after_state,
    v_metrics
  )
  RETURNING id INTO v_analysis_id;

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent training history
CREATE OR REPLACE FUNCTION get_recent_training_history(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  training_type TEXT,
  description TEXT,
  impact_summary JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.training_type,
    h.description,
    h.impact_metrics,
    h.created_at
  FROM ai_training_history h
  WHERE h.tenant_id = p_tenant_id
  ORDER BY h.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get training suggestions
CREATE OR REPLACE FUNCTION get_training_suggestions(
  p_tenant_id UUID,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  current_behavior TEXT,
  suggested_behavior TEXT,
  reason TEXT,
  confidence FLOAT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.category,
    s.current_behavior,
    s.suggested_behavior,
    s.reason,
    s.confidence,
    s.status,
    s.created_at
  FROM ai_training_suggestions s
  WHERE s.tenant_id = p_tenant_id
    AND (p_category IS NULL OR s.category = p_category)
    AND (p_status IS NULL OR s.status = p_status)
  ORDER BY s.confidence DESC, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial training history for Zaffira
DO $$
DECLARE
  v_zaffira_tenant_id UUID;
BEGIN
  -- Get Zaffira tenant ID
  SELECT id INTO v_zaffira_tenant_id FROM tenants WHERE slug = 'zaffira' LIMIT 1;
  
  -- Only insert if tenant exists
  IF v_zaffira_tenant_id IS NOT NULL THEN
    INSERT INTO ai_training_history (
      tenant_id,
      training_type,
      description,
      changes,
      impact_metrics
    ) VALUES
    (
      v_zaffira_tenant_id,
      'tone',
      'Ajuste no tom de respostas sobre preços',
      jsonb_build_object(
        'before', 'Foco em valores e preços',
        'after', 'Foco em investimento e benefícios',
        'rules_updated', ARRAY['price_inquiry', 'value_proposition']
      ),
      jsonb_build_object(
        'conversion_rate_change', 0.15,
        'customer_satisfaction', 0.92,
        'engagement_increase', 0.23
      )
    ),
    (
      v_zaffira_tenant_id,
      'responses',
      'Novas variações para saudação inicial',
      jsonb_build_object(
        'added_variations', 2,
        'context', 'initial_greeting',
        'personalization_level', 'increased'
      ),
      jsonb_build_object(
        'engagement_rate_change', 0.18,
        'response_time_improvement', 0.12,
        'customer_satisfaction', 0.94
      )
    ),
    (
      v_zaffira_tenant_id,
      'rules',
      'Implementação de regras para detecção de urgência',
      jsonb_build_object(
        'new_rules', ARRAY['urgency_detection', 'priority_routing'],
        'triggers', ARRAY['keywords', 'sentiment', 'time_sensitivity']
      ),
      jsonb_build_object(
        'handover_accuracy', 0.89,
        'response_priority_improvement', 0.25,
        'customer_satisfaction', 0.91
      )
    );
  END IF;
END $$;