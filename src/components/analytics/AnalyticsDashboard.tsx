import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Clock,
  ThumbsUp,
  AlertCircle,
  Filter
} from 'lucide-react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { PageHeader } from '../common/PageHeader';

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('7d');
  const { metrics, loadMetrics, loading, error } = useAnalyticsStore();

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  // Mock data para demonstração
  const mockMetrics = {
    totalConversations: 127,
    activeUsers: 24,
    avgResponseTime: '1.2min',
    aiConfidence: 0.94,
    conversationTrend: '+12%',
    usersTrend: '+8%',
    responseTrend: '-15%',
    confidenceTrend: '+3%',
    userSatisfaction: 88,
    resolutionRate: 92,
    handoverRate: 8,
    peakHours: '14h - 16h',
    avgConversationLength: '8.5min',
    messagesPerConversation: 12,
    topIntents: [
      { name: 'Consulta de Preço', count: 45, percentage: 35 },
      { name: 'Informação de Produto', count: 38, percentage: 30 },
      { name: 'Agendamento', count: 22, percentage: 17 },
      { name: 'Personalização', count: 18, percentage: 14 },
      { name: 'Localização', count: 5, percentage: 4 }
    ]
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Métricas e análises de performance"
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
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        }
        showBackButton={true}
      />

      {/* Mock Data Notice */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
          <p className="text-sm text-blue-700">
            Exibindo dados de demonstração. Conecte ao backend para dados reais.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Conversations"
          value={mockMetrics.totalConversations}
          trend={mockMetrics.conversationTrend}
          icon={<MessageSquare className="w-6 h-6 text-indigo-600" />}
        />
        <MetricCard
          title="Active Users"
          value={mockMetrics.activeUsers}
          trend={mockMetrics.usersTrend}
          icon={<Users className="w-6 h-6 text-green-600" />}
        />
        <MetricCard
          title="Avg. Response Time"
          value={mockMetrics.avgResponseTime}
          trend={mockMetrics.responseTrend}
          icon={<Clock className="w-6 h-6 text-yellow-600" />}
        />
        <MetricCard
          title="AI Confidence"
          value={`${(mockMetrics.aiConfidence * 100).toFixed(1)}%`}
          trend={mockMetrics.confidenceTrend}
          icon={<BarChart2 className="w-6 h-6 text-blue-600" />}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Response Quality</h3>
          <div className="space-y-4">
            <QualityMetric
              label="User Satisfaction"
              value={mockMetrics.userSatisfaction}
              icon={<ThumbsUp className="w-5 h-5" />}
            />
            <QualityMetric
              label="Resolution Rate"
              value={mockMetrics.resolutionRate}
              icon={<AlertCircle className="w-5 h-5" />}
            />
            <QualityMetric
              label="Handover Rate"
              value={mockMetrics.handoverRate}
              icon={<Users className="w-5 h-5" />}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Conversation Analytics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Hours</span>
              <span className="font-medium">{mockMetrics.peakHours}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Conversation Length</span>
              <span className="font-medium">{mockMetrics.avgConversationLength}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Messages per Conversation</span>
              <span className="font-medium">{mockMetrics.messagesPerConversation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intent Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Top Intents</h3>
        <div className="space-y-4">
          {mockMetrics.topIntents?.map((intent, index) => (
            <div key={index} className="flex items-center">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{intent.name}</span>
                  <span className="text-sm text-gray-500">{intent.count} conversations</span>
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

interface QualityMetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function QualityMetric({ label, value, icon }: QualityMetricProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm font-medium">{value}%</span>
      </div>
    </div>
  );
}