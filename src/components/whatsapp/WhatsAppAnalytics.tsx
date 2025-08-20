import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  MessageSquare, 
  Users,
  Clock,
  ThumbsUp,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/PageHeader';

export function WhatsAppAnalytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    avgResponseTime: '0s',
    satisfactionRate: 0,
    conversionRate: 0,
    topIntents: [],
    messagesByDay: [],
    responseTimeByHour: []
  });

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would fetch data from Supabase
      // For now, we'll use mock data
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setMetrics({
        totalConversations: 156,
        activeConversations: 24,
        avgResponseTime: '1.5min',
        satisfactionRate: 92,
        conversionRate: 28,
        topIntents: [
          { name: 'Consulta de Preço', count: 45, percentage: 28 },
          { name: 'Informação de Produto', count: 38, percentage: 24 },
          { name: 'Agendamento', count: 22, percentage: 14 },
          { name: 'Personalização', count: 18, percentage: 12 },
          { name: 'Localização', count: 15, percentage: 10 }
        ],
        messagesByDay: [
          { day: 'Seg', count: 120 },
          { day: 'Ter', count: 145 },
          { day: 'Qua', count: 132 },
          { day: 'Qui', count: 165 },
          { day: 'Sex', count: 187 },
          { day: 'Sáb', count: 98 },
          { day: 'Dom', count: 65 }
        ],
        responseTimeByHour: [
          { hour: '9h', time: 45 },
          { hour: '10h', time: 52 },
          { hour: '11h', time: 68 },
          { hour: '12h', time: 75 },
          { hour: '13h', time: 62 },
          { hour: '14h', time: 48 },
          { hour: '15h', time: 55 },
          { hour: '16h', time: 70 },
          { hour: '17h', time: 80 },
          { hour: '18h', time: 65 }
        ]
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Falha ao carregar métricas');
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

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise de Conversas"
        subtitle="Métricas detalhadas do WhatsApp Business"
        icon={<BarChart2 className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>
          </div>
        }
        showBackButton={true}
        backTo="/whatsapp"
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Conversas"
          value={metrics.totalConversations}
          trend="+12%"
          icon={<MessageSquare className="w-6 h-6 text-indigo-600" />}
        />
        <MetricCard
          title="Conversas Ativas"
          value={metrics.activeConversations}
          trend="+5%"
          icon={<Users className="w-6 h-6 text-green-600" />}
        />
        <MetricCard
          title="Tempo Médio de Resposta"
          value={metrics.avgResponseTime}
          trend="-18%"
          icon={<Clock className="w-6 h-6 text-yellow-600" />}
        />
        <MetricCard
          title="Taxa de Satisfação"
          value={`${metrics.satisfactionRate}%`}
          trend="+3%"
          icon={<ThumbsUp className="w-6 h-6 text-blue-600" />}
        />
      </div>

      {/* Intent Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Intenções Principais</h3>
        <div className="space-y-4">
          {metrics.topIntents.map((intent, index) => (
            <div key={index} className="flex items-center">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{intent.name}</span>
                  <span className="text-sm text-gray-500">{intent.count} conversas</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${intent.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages by Day */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
            Mensagens por Dia
          </h3>
          <div className="h-64 flex items-end space-x-4">
            {metrics.messagesByDay.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-indigo-600 rounded-t-lg hover:bg-indigo-700 transition-all cursor-pointer"
                  style={{ 
                    height: `${(day.count / Math.max(...metrics.messagesByDay.map(d => d.count))) * 100}%` 
                  }}
                  title={`${day.count} mensagens`}
                />
                <span className="text-xs text-gray-500 mt-2">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time by Hour */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-indigo-600" />
            Tempo de Resposta por Hora
          </h3>
          <div className="h-64 flex items-end space-x-4">
            {metrics.responseTimeByHour.map((hour, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-green-600 rounded-t-lg hover:bg-green-700 transition-all cursor-pointer"
                  style={{ 
                    height: `${(hour.time / Math.max(...metrics.responseTimeByHour.map(h => h.time))) * 100}%` 
                  }}
                  title={`${hour.time}s`}
                />
                <span className="text-xs text-gray-500 mt-2">{hour.hour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
          Métricas de Conversão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Taxa de Conversão</h4>
            <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
            <p className="text-sm text-gray-500 mt-1">
              Conversas que resultaram em vendas
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Agendamentos</h4>
            <p className="text-2xl font-bold">18</p>
            <p className="text-sm text-gray-500 mt-1">
              Visitas agendadas na loja
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Orçamentos</h4>
            <p className="text-2xl font-bold">32</p>
            <p className="text-sm text-gray-500 mt-1">
              Orçamentos enviados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 flex items-center justify-end ${
              trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}