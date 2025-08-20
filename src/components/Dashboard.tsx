import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Clock,
  ThumbsUp,
  DollarSign,
  Plus,
  Bot,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { DashboardWidget } from './widgets/DashboardWidget';
import { AddWidgetModal } from './widgets/AddWidgetModal';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { formatCurrency } from '../utils/formatters';

interface QuickStatProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
  description: string;
}

function QuickStat({ title, value, trend, icon, description }: QuickStatProps) {
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
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  console.log('Rendering Dashboard component'); // Debug log
  
  const [widgets, setWidgets] = useState<string[]>(['conversations', 'metrics', 'team']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { metrics, loading, error, loadMetrics, clearError } = useAnalyticsStore();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => {
      clearInterval(interval);
      clearError();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      clearError();
      await loadMetrics();
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (retryCount < 3) {
        // Retry with exponential backoff
        const timeout = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadDashboardData();
        }, timeout);
      }
    }
  };

  const handleAddWidget = (type: string) => {
    setWidgets([...widgets, type]);
    setShowAddModal(false);
  };

  const handleRemoveWidget = (index: number) => {
    const newWidgets = [...widgets];
    newWidgets.splice(index, 1);
    setWidgets(newWidgets);
  };

  const handleRetry = () => {
    setRetryCount(0);
    loadDashboardData();
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button 
          onClick={handleRetry}
          className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Bot className="w-6 h-6 mr-2" />
            Dashboard
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral do sistema
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRetry}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            title="Atualizar dados"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Widget
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickStat
          title="Atendimentos Hoje"
          value={metrics?.totalChats || 0}
          trend="+12%"
          icon={<MessageSquare className="w-6 h-6 text-indigo-600" />}
          description="Total de conversas"
        />
        <QuickStat
          title="Precisão da IA"
          value={`${((metrics?.aiConfidence || 0) * 100).toFixed(1)}%`}
          trend="+5.2%"
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          description="Média global"
        />
        <QuickStat
          title="Satisfação"
          value={`${((metrics?.satisfactionScore || 0) * 100).toFixed(1)}%`}
          trend="+8.3%"
          icon={<ThumbsUp className="w-6 h-6 text-blue-600" />}
          description="Últimas 24h"
        />
        <QuickStat
          title="Vendas"
          value={formatCurrency(metrics?.totalSales || 0)}
          trend="+15.4%"
          icon={<DollarSign className="w-6 h-6 text-purple-600" />}
          description="Hoje"
        />
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((type, index) => (
          <DashboardWidget
            key={`${type}-${index}`}
            type={type as any}
            onRemove={() => handleRemoveWidget(index)}
          />
        ))}
      </div>

      {/* Add Widget Modal */}
      {showAddModal && (
        <AddWidgetModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddWidget}
        />
      )}
    </div>
  );
}