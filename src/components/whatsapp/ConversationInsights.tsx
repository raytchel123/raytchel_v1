import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  User, 
  MessageSquare, 
  Clock, 
  Target,
  TrendingUp,
  Heart,
  Diamond,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { ConversationFlowService } from '../../lib/conversationFlow';
import { formatDistanceToNow } from '../../utils/dateFormat';

interface ConversationInsightsProps {
  contactId: string;
  tenantId: string;
}

export function ConversationInsights({ contactId, tenantId }: ConversationInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [contactId, tenantId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const flowService = ConversationFlowService.getInstance();
      const data = await flowService.getConversationInsights(contactId, tenantId);
      setInsights(data);
    } catch (err) {
      console.error('Error loading insights:', err);
      setError('Falha ao carregar insights da conversa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500">{error || 'Nenhum insight disponível'}</p>
      </div>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'welcome': return 'bg-blue-100 text-blue-800';
      case 'discovery': return 'bg-purple-100 text-purple-800';
      case 'product_presentation': return 'bg-indigo-100 text-indigo-800';
      case 'price_discussion': return 'bg-green-100 text-green-800';
      case 'customization_discussion': return 'bg-yellow-100 text-yellow-800';
      case 'appointment_scheduling': return 'bg-pink-100 text-pink-800';
      case 'objection_handling': return 'bg-red-100 text-red-800';
      case 'follow_up': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'welcome': return 'Acolhimento';
      case 'discovery': return 'Descoberta';
      case 'product_presentation': return 'Apresentação';
      case 'price_discussion': return 'Investimento';
      case 'customization_discussion': return 'Personalização';
      case 'appointment_scheduling': return 'Agendamento';
      case 'objection_handling': return 'Tratamento de Objeções';
      case 'follow_up': return 'Acompanhamento';
      default: return stage;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Profile */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-indigo-600" />
          Perfil do Cliente
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nome</p>
            <p className="font-medium">{insights.customer_profile.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Interações</p>
            <p className="font-medium">{insights.customer_profile.interaction_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estágio Atual</p>
            <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(insights.customer_profile.current_stage)}`}>
              {getStageLabel(insights.customer_profile.current_stage)}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Urgência</p>
            <span className={`font-medium ${getUrgencyColor(insights.customer_profile.urgency)}`}>
              {insights.customer_profile.urgency === 'high' ? 'Alta' : 
               insights.customer_profile.urgency === 'medium' ? 'Média' : 'Baixa'}
            </span>
          </div>
        </div>
        
        {insights.customer_profile.stage_description && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{insights.customer_profile.stage_description}</p>
          </div>
        )}
      </div>

      {/* Journey Progress */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-indigo-600" />
          Progresso da Jornada
        </h3>
        
        <div className="space-y-3">
          {insights.journey_progress.completed_stages.map((stage: string, index: number) => (
            <div key={index} className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">{getStageLabel(stage)}</span>
              <span className="text-xs text-gray-500">Concluído</span>
            </div>
          ))}
          
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="text-sm font-medium">{getStageLabel(insights.customer_profile.current_stage)}</span>
            <span className="text-xs text-indigo-600">Atual</span>
          </div>
        </div>

        {insights.journey_progress.current_objectives.length > 0 && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <h4 className="text-sm font-medium text-indigo-800 mb-2">Objetivos Atuais:</h4>
            <ul className="text-sm text-indigo-700 space-y-1">
              {insights.journey_progress.current_objectives.map((objective: string, index: number) => (
                <li key={index} className="flex items-center">
                  <ArrowRight className="w-3 h-3 mr-2" />
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Interests & Preferences */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-pink-600" />
          Interesses e Preferências
        </h3>
        
        <div className="space-y-4">
          {insights.interests.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Interesses Identificados:</p>
              <div className="flex flex-wrap gap-2">
                {insights.interests.map((interest: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {Object.keys(insights.preferences).length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Preferências:</p>
              <div className="space-y-2">
                {Object.entries(insights.preferences).map(([key, value]: [string, any], index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget Information */}
      {insights.budget_info && Object.keys(insights.budget_info).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-medium mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Informações de Orçamento
          </h3>
          
          <div className="space-y-2">
            {insights.budget_info.mentioned && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Orçamento Mencionado</span>
                <span className="font-medium">R$ {insights.budget_info.mentioned.toLocaleString()}</span>
              </div>
            )}
            {insights.budget_info.estimated && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Orçamento Estimado</span>
                <span className="font-medium">R$ {insights.budget_info.estimated.toLocaleString()}</span>
              </div>
            )}
            {insights.budget_info.range && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Faixa de Interesse</span>
                <span className="font-medium">
                  R$ {insights.budget_info.range.min.toLocaleString()} - R$ {insights.budget_info.range.max.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Objections */}
      {insights.objections.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-medium mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
            Objeções Identificadas
          </h3>
          
          <div className="space-y-2">
            {insights.objections.map((objection: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">
                  {objection === 'price' ? 'Preocupação com preço' :
                   objection === 'decision' ? 'Indecisão' :
                   objection === 'timing' ? 'Questão de tempo' :
                   objection}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Questions */}
      {insights.journey_progress.next_questions.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-medium mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
            Próximas Perguntas Sugeridas
          </h3>
          
          <div className="space-y-2">
            {insights.journey_progress.next_questions.map((question: string, index: number) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">{question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}