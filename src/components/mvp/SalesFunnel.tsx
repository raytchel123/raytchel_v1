import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  DollarSign,
  Clock,
  Target,
  ArrowRight,
  RefreshCw,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/formatters';
import { PageHeader } from '../common/PageHeader';

interface FunnelMetrics {
  contacts: number;
  qualified: number;
  quoted: number;
  scheduled: number;
  visited: number;
  sold: number;
  conversion_rates: {
    contact_to_qualified: number;
    qualified_to_quoted: number;
    quoted_to_scheduled: number;
    scheduled_to_visited: number;
    visited_to_sold: number;
  };
  avg_sla: number;
  total_revenue: number;
}

export function SalesFunnel() {
  const [metrics, setMetrics] = useState<FunnelMetrics>({
    contacts: 0,
    qualified: 0,
    quoted: 0,
    scheduled: 0,
    visited: 0,
    sold: 0,
    conversion_rates: {
      contact_to_qualified: 0,
      qualified_to_quoted: 0,
      quoted_to_scheduled: 0,
      scheduled_to_visited: 0,
      visited_to_sold: 0
    },
    avg_sla: 0,
    total_revenue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadMetrics();
    loadRecentActivity();
  }, [dateRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Simular dados do funil para demonstração
      // Em produção, isso viria do banco de dados
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockMetrics: FunnelMetrics = {
        contacts: 156,
        qualified: 124,
        quoted: 89,
        scheduled: 67,
        visited: 52,
        sold: 23,
        conversion_rates: {
          contact_to_qualified: 79.5,
          qualified_to_quoted: 71.8,
          quoted_to_scheduled: 75.3,
          scheduled_to_visited: 77.6,
          visited_to_sold: 44.2
        },
        avg_sla: 1.8,
        total_revenue: 287650
      };
      
      setMetrics(mockMetrics);
    } catch (err) {
      setError('Falha ao carregar métricas do funil');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Mock de atividade recente
      const mockActivity = [
        {
          id: '1',
          type: 'contact',
          contact_name: 'Maria Silva',
          action: 'Novo contato via WhatsApp',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          status: 'qualified'
        },
        {
          id: '2',
          type: 'quote',
          contact_name: 'João Santos',
          action: 'Orçamento de aliança solicitado',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          status: 'quoted',
          value: 4200
        },
        {
          id: '3',
          type: 'appointment',
          contact_name: 'Ana Costa',
          action: 'Visita agendada para amanhã',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'scheduled'
        },
        {
          id: '4',
          type: 'sale',
          contact_name: 'Pedro Lima',
          action: 'Venda de anel de noivado',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'sold',
          value: 12500
        }
      ];
      
      setRecentActivity(mockActivity);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    }
  };

  const getFunnelStageColor = (stage: string) => {
    switch (stage) {
      case 'contacts': return 'bg-blue-500';
      case 'qualified': return 'bg-indigo-500';
      case 'quoted': return 'bg-purple-500';
      case 'scheduled': return 'bg-pink-500';
      case 'visited': return 'bg-orange-500';
      case 'sold': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Users className="w-4 h-4" />;
      case 'quote': return <DollarSign className="w-4 h-4" />;
      case 'appointment': return <Calendar className="w-4 h-4" />;
      case 'sale': return <Target className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'contact': return 'text-blue-600 bg-blue-50';
      case 'quote': return 'text-purple-600 bg-purple-50';
      case 'appointment': return 'text-orange-600 bg-orange-50';
      case 'sale': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funil de Vendas"
        subtitle="Acompanhe a jornada do cliente: contato → venda"
        icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
            <button
              onClick={loadMetrics}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        }
        showBackButton={true}
        backTo="/mvp"
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Funnel Visualization */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-6">Funil de Conversão - Joalheria</h3>
        
        <div className="space-y-6">
          {/* Funnel Stages */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <FunnelStage
              title="Contatos"
              value={metrics.contacts}
              color="blue"
              icon={<MessageSquare className="w-5 h-5" />}
              description="WhatsApp inicial"
            />
            <FunnelStage
              title="Qualificados"
              value={metrics.qualified}
              color="indigo"
              icon={<Users className="w-5 h-5" />}
              description="Interesse confirmado"
              conversion={metrics.conversion_rates.contact_to_qualified}
            />
            <FunnelStage
              title="Orçamentos"
              value={metrics.quoted}
              color="purple"
              icon={<DollarSign className="w-5 h-5" />}
              description="Preço apresentado"
              conversion={metrics.conversion_rates.qualified_to_quoted}
            />
            <FunnelStage
              title="Agendados"
              value={metrics.scheduled}
              color="pink"
              icon={<Calendar className="w-5 h-5" />}
              description="Visita marcada"
              conversion={metrics.conversion_rates.quoted_to_scheduled}
            />
            <FunnelStage
              title="Visitaram"
              value={metrics.visited}
              color="orange"
              icon={<Clock className="w-5 h-5" />}
              description="Compareceram"
              conversion={metrics.conversion_rates.scheduled_to_visited}
            />
            <FunnelStage
              title="Vendas"
              value={metrics.sold}
              color="green"
              icon={<Target className="w-5 h-5" />}
              description="Fecharam compra"
              conversion={metrics.conversion_rates.visited_to_sold}
            />
          </div>

          {/* Conversion Flow */}
          <div className="flex items-center justify-center space-x-4 py-4">
            {[
              { from: 'Contatos', to: 'Qualificados', rate: metrics.conversion_rates.contact_to_qualified },
              { from: 'Qualificados', to: 'Orçamentos', rate: metrics.conversion_rates.qualified_to_quoted },
              { from: 'Orçamentos', to: 'Agendados', rate: metrics.conversion_rates.quoted_to_scheduled },
              { from: 'Agendados', to: 'Visitaram', rate: metrics.conversion_rates.scheduled_to_visited },
              { from: 'Visitaram', to: 'Vendas', rate: metrics.conversion_rates.visited_to_sold }
            ].map((conversion, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full ${
                    conversion.rate >= 70 ? 'bg-green-500' :
                    conversion.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-600 mt-1 block">
                    {conversion.rate.toFixed(1)}%
                  </span>
                </div>
                {index < 4 && <ArrowRight className="w-4 h-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.total_revenue)}</p>
              <p className="text-sm text-green-600">+18.5% vs período anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">SLA Médio</p>
              <p className="text-2xl font-bold">{metrics.avg_sla}min</p>
              <p className="text-sm text-blue-600">-12% vs período anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics.total_revenue / Math.max(metrics.sold, 1))}
              </p>
              <p className="text-sm text-purple-600">+8.2% vs período anterior</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Atividade Recente</h3>
          <button
            onClick={loadRecentActivity}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.contact_name}</p>
                <p className="text-xs text-gray-600">{activity.action}</p>
              </div>
              <div className="text-right">
                {activity.value && (
                  <p className="text-sm font-medium">{formatCurrency(activity.value)}</p>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Análise de Conversão por Etapa</h3>
        
        <div className="space-y-4">
          <ConversionAnalysis
            from="Contatos"
            to="Qualificados"
            rate={metrics.conversion_rates.contact_to_qualified}
            fromValue={metrics.contacts}
            toValue={metrics.qualified}
            insights="IA qualifica automaticamente baseada em interesse demonstrado"
          />
          <ConversionAnalysis
            from="Qualificados"
            to="Orçamentos"
            rate={metrics.conversion_rates.qualified_to_quoted}
            fromValue={metrics.qualified}
            toValue={metrics.quoted}
            insights="Orçamentos gerados automaticamente com preços estimados"
          />
          <ConversionAnalysis
            from="Orçamentos"
            to="Agendados"
            rate={metrics.conversion_rates.quoted_to_scheduled}
            fromValue={metrics.quoted}
            toValue={metrics.scheduled}
            insights="CTA de agendamento após apresentação de preço"
          />
          <ConversionAnalysis
            from="Agendados"
            to="Visitaram"
            rate={metrics.conversion_rates.scheduled_to_visited}
            fromValue={metrics.scheduled}
            toValue={metrics.visited}
            insights="Taxa de comparecimento às visitas agendadas"
          />
          <ConversionAnalysis
            from="Visitaram"
            to="Vendas"
            rate={metrics.conversion_rates.visited_to_sold}
            fromValue={metrics.visited}
            toValue={metrics.sold}
            insights="Conversão presencial - atendimento humano especializado"
          />
        </div>
      </div>
    </div>
  );
}

interface FunnelStageProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  description: string;
  conversion?: number;
}

function FunnelStage({ title, value, color, icon, description, conversion }: FunnelStageProps) {
  return (
    <div className="text-center">
      <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-${color}-100 flex items-center justify-center`}>
        <div className={`text-${color}-600`}>
          {icon}
        </div>
      </div>
      <h4 className="font-medium text-gray-900">{title}</h4>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-500">{description}</p>
      {conversion !== undefined && (
        <p className={`text-xs mt-1 font-medium ${
          conversion >= 70 ? 'text-green-600' :
          conversion >= 50 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {conversion.toFixed(1)}% conversão
        </p>
      )}
    </div>
  );
}

interface ConversionAnalysisProps {
  from: string;
  to: string;
  rate: number;
  fromValue: number;
  toValue: number;
  insights: string;
}

function ConversionAnalysis({ from, to, rate, fromValue, toValue, insights }: ConversionAnalysisProps) {
  const getColor = (rate: number) => {
    if (rate >= 70) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{from} → {to}</span>
        <span className="text-sm font-bold">{rate.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full ${getColor(rate)}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{fromValue} → {toValue}</span>
        <span>{toValue - fromValue < 0 ? '' : '+'}{toValue - fromValue} perdidos</span>
      </div>
      <p className="text-xs text-gray-600 italic">{insights}</p>
    </div>
  );
}