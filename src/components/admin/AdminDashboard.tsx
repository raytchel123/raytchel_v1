import React, { useEffect, useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Clock,
  Target,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { formatCurrency } from '../../utils/formatters';
import { PageHeader } from '../common/PageHeader';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  description: string;
  color?: string;
}

function MetricCard({ title, value, trend, icon, description, color = 'indigo' }: MetricCardProps) {
  const getTrendColor = (trend?: number) => {
    if (!trend) return 'text-gray-500';
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trend?: number) => {
    if (!trend) return null;
    return trend > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-start">
        <div className={`p-3 bg-${color}-50 rounded-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center justify-end mt-1 ${getTrendColor(trend)}`}>
              {getTrendIcon(trend)}
              <span className="text-sm ml-1">
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { 
    currentOrg, 
    funnelMetrics, 
    dailyMetrics, 
    conversations,
    loading, 
    error,
    loadFunnelMetrics,
    loadDailyMetrics,
    loadConversations,
    clearError
  } = useAdminStore();

  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadDashboardData();
    }
  }, [currentOrg, dateRange]);

  const loadDashboardData = async () => {
    if (!currentOrg) return;

    try {
      clearError();
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      await Promise.all([
        loadFunnelMetrics(startDate, endDate),
        loadDailyMetrics(startDate, endDate),
        loadConversations('waiting_human')
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const pendingHandoffs = conversations.filter(c => c.status === 'waiting_human').length;
  const activeConversations = conversations.filter(c => c.status === 'active').length;

  // Calculate trends (mock data for now)
  const trends = {
    leads: 12.5,
    qualified: 8.3,
    booked: -2.1,
    attended: 15.7,
    paid: 22.4,
    sla: -18.2
  };

  if (loading && !funnelMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin"
        subtitle={`Visão geral do atendimento - ${currentOrg?.name}`}
        icon={<LayoutDashboard className="w-6 h-6 text-indigo-600" />}
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
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        }
        showBackButton={false}
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {pendingHandoffs > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong>{pendingHandoffs}</strong> conversas aguardando atendimento humano
              </p>
              <button className="text-sm text-yellow-800 underline mt-1">
                Ver fila de handoff →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funnel Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Leads Gerados"
          value={funnelMetrics?.leads || 0}
          trend={trends.leads}
          icon={<Users className={`w-6 h-6 text-blue-600`} />}
          description="Novos contatos"
          color="blue"
        />
        <MetricCard
          title="Qualificados"
          value={funnelMetrics?.qualified || 0}
          trend={trends.qualified}
          icon={<Target className={`w-6 h-6 text-green-600`} />}
          description="Leads qualificados"
          color="green"
        />
        <MetricCard
          title="Agendamentos"
          value={funnelMetrics?.booked || 0}
          trend={trends.booked}
          icon={<Clock className={`w-6 h-6 text-purple-600`} />}
          description="Visitas agendadas"
          color="purple"
        />
        <MetricCard
          title="Vendas"
          value={funnelMetrics?.paid || 0}
          trend={trends.paid}
          icon={<DollarSign className={`w-6 h-6 text-yellow-600`} />}
          description="Vendas concluídas"
          color="yellow"
        />
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
            Funil de Conversão
          </h3>
          
          <div className="space-y-4">
            {funnelMetrics && (
              <>
                <ConversionStep
                  from="Leads"
                  to="Qualificados"
                  rate={funnelMetrics.conversion_rates.lead_to_qualified}
                  fromValue={funnelMetrics.leads}
                  toValue={funnelMetrics.qualified}
                />
                <ConversionStep
                  from="Qualificados"
                  to="Agendados"
                  rate={funnelMetrics.conversion_rates.qualified_to_booked}
                  fromValue={funnelMetrics.qualified}
                  toValue={funnelMetrics.booked}
                />
                <ConversionStep
                  from="Agendados"
                  to="Compareceram"
                  rate={funnelMetrics.conversion_rates.booked_to_attended}
                  fromValue={funnelMetrics.booked}
                  toValue={funnelMetrics.attended}
                />
                <ConversionStep
                  from="Compareceram"
                  to="Vendas"
                  rate={funnelMetrics.conversion_rates.attended_to_paid}
                  fromValue={funnelMetrics.attended}
                  toValue={funnelMetrics.paid}
                />
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
            Atendimento em Tempo Real
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium">Conversas Ativas</span>
              </div>
              <span className="text-lg font-bold">{activeConversations}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium">Aguardando Humano</span>
              </div>
              <span className="text-lg font-bold">{pendingHandoffs}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium">SLA Médio</span>
              </div>
              <span className="text-lg font-bold">
                {funnelMetrics ? Math.round(funnelMetrics.avg_first_response_sla / 60) : 0}min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <BarChart2 className="w-5 h-5 mr-2 text-indigo-600" />
          Tendência Diária
        </h3>
        
        <div className="h-64 flex items-end space-x-2">
          {dailyMetrics.slice(-7).map((metric, index) => {
            const maxValue = Math.max(...dailyMetrics.slice(-7).map(m => m.leads));
            const height = maxValue > 0 ? (metric.leads / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-indigo-600 rounded-t-lg hover:bg-indigo-700 transition-all cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`${metric.leads} leads em ${new Date(metric.date).toLocaleDateString()}`}
                />
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(metric.date).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit' 
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Gerenciar Fluxos"
          description="Criar e editar fluxos de atendimento"
          icon={<BarChart2 className="w-6 h-6 text-indigo-600" />}
          href="/admin/flows"
        />
        <QuickActionCard
          title="Base de Conhecimento"
          description="Gerenciar Q&A e intenções"
          icon={<MessageSquare className="w-6 h-6 text-green-600" />}
          href="/admin/knowledge"
        />
        <QuickActionCard
          title="Fila de Handoff"
          description="Atender conversas pendentes"
          icon={<Users className="w-6 h-6 text-yellow-600" />}
          href="/admin/handoff"
          badge={pendingHandoffs > 0 ? pendingHandoffs : undefined}
        />
      </div>
    </div>
  );
}

interface ConversionStepProps {
  from: string;
  to: string;
  rate: number;
  fromValue: number;
  toValue: number;
}

function ConversionStep({ from, to, rate, fromValue, toValue }: ConversionStepProps) {
  const getColor = (rate: number) => {
    if (rate >= 70) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{from} → {to}</span>
        <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColor(rate)}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{fromValue}</span>
        <span>{toValue}</span>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

function QuickActionCard({ title, description, icon, href, badge }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="block bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-50 rounded-lg">
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        {badge && (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            {badge}
          </span>
        )}
      </div>
    </a>
  );
}