import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  Users,
  RefreshCw,
  Settings,
  ExternalLink
} from 'lucide-react';
import { UsageService, UsageStatus, UsageAlert } from '../../lib/usageService';
import { PageHeader } from '../common/PageHeader';

export function UsageMonitor() {
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const usageService = UsageService.getInstance();
  const tenantId = '00000000-0000-0000-0000-000000000001'; // Zaffira

  useEffect(() => {
    loadUsageData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadUsageData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadUsageData = async () => {
    try {
      setError(null);
      const [status, alertsData] = await Promise.all([
        usageService.getUsageStatus(tenantId),
        usageService.getUsageAlerts(tenantId)
      ]);

      setUsageStatus(status);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading usage data:', err);
      setError('Falha ao carregar dados de uso');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
  };

  const getUsageIcon = (usageType: string) => {
    switch (usageType) {
      case 'whatsapp_messages': return <MessageSquare className="w-5 h-5" />;
      case 'templates': return <FileText className="w-5 h-5" />;
      case 'quotes': return <DollarSign className="w-5 h-5" />;
      case 'appointments': return <Calendar className="w-5 h-5" />;
      case 'handoffs': return <Users className="w-5 h-5" />;
      default: return <BarChart2 className="w-5 h-5" />;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const formatUsageType = (usageType: string) => {
    return usageService.getUsageTypeLabel(usageType);
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
        title="Monitor de Uso"
        subtitle="Acompanhe o consumo mensal e limites do plano"
        icon={<BarChart2 className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              Período: {usageStatus?.month_year || 'N/A'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
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
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Alertas de Uso Ativos ({alerts.length})
              </h3>
              <div className="mt-2 space-y-1">
                {alerts.slice(0, 3).map((alert) => (
                  <p key={alert.id} className="text-sm text-yellow-700">
                    • {formatUsageType(alert.usage_type)}: {alert.threshold_percentage}% do limite atingido
                    ({alert.current_usage}/{alert.limit_value})
                  </p>
                ))}
                {alerts.length > 3 && (
                  <p className="text-sm text-yellow-700">
                    ... e mais {alerts.length - 3} alertas
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usageStatus?.usage && Object.entries(usageStatus.usage).map(([usageType, usage]) => (
          <div key={usageType} className={`bg-white p-6 rounded-lg shadow-sm border ${
            usage.blocked ? 'border-red-300' : usage.warning ? 'border-yellow-300' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  usage.blocked ? 'bg-red-50' : usage.warning ? 'bg-yellow-50' : 'bg-green-50'
                }`}>
                  {getUsageIcon(usageType)}
                </div>
                <div>
                  <h3 className="font-medium">{formatUsageType(usageType)}</h3>
                  <p className="text-sm text-gray-600">
                    {usage.current} / {usage.limit}
                  </p>
                </div>
              </div>
              
              {usage.blocked && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  Bloqueado
                </span>
              )}
              {usage.warning && !usage.blocked && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  Atenção
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progresso</span>
                <span className={`font-medium ${
                  usage.blocked ? 'text-red-600' : 
                  usage.warning ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {usage.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(usage.percentage)}`}
                  style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Restante: {usage.remaining}</span>
                <span>Reset: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Action Button */}
            {usage.blocked && (
              <div className="mt-4 pt-4 border-t">
                <button className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Falar com a equipe
                </button>
              </div>
            )}
            
            {usage.warning && !usage.blocked && (
              <div className="mt-4 pt-4 border-t">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 text-sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Considere aumentar plano
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Usage Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
          Tendência de Uso
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Used Features */}
          <div>
            <h4 className="font-medium mb-3 text-gray-700">Recursos Mais Utilizados</h4>
            <div className="space-y-2">
              {usageStatus?.usage && Object.entries(usageStatus.usage)
                .sort(([,a], [,b]) => b.current - a.current)
                .slice(0, 5)
                .map(([usageType, usage]) => (
                  <div key={usageType} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{formatUsageType(usageType)}</span>
                    <span className="font-medium">{usage.current}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Risk Assessment */}
          <div>
            <h4 className="font-medium mb-3 text-gray-700">Avaliação de Risco</h4>
            <div className="space-y-2">
              {usageStatus?.usage && Object.entries(usageStatus.usage)
                .filter(([,usage]) => usage.percentage >= 60)
                .sort(([,a], [,b]) => b.percentage - a.percentage)
                .map(([usageType, usage]) => (
                  <div key={usageType} className={`flex justify-between items-center p-2 rounded border ${
                    usage.blocked ? 'bg-red-50 border-red-200' :
                    usage.warning ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <span className="text-sm">{formatUsageType(usageType)}</span>
                    <span className={`font-medium ${
                      usage.blocked ? 'text-red-600' :
                      usage.warning ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {usage.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))
              }
              {(!usageStatus?.usage || Object.values(usageStatus.usage).every(u => u.percentage < 60)) && (
                <div className="flex items-center p-2 bg-green-50 rounded border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-700">Uso dentro do normal</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Alertas Recentes</h3>
        
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum alerta de uso registrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${
                alert.threshold_percentage === 100 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        alert.threshold_percentage === 100 ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <span className="font-medium">
                        {formatUsageType(alert.usage_type)} - {alert.threshold_percentage}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.current_usage} de {alert.limit_value} utilizados
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.alert_sent_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Information */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-indigo-900">Plano Atual</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Gerencie seus limites mensais e acompanhe o uso em tempo real
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="flex items-center px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Limites
            </button>
            
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Upgrade Plano
            </button>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="bg-blue-50 p-6 rounded-lg border">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Como Funciona o Sistema de Limites
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-2">🟢 Uso Normal (0-79%)</h4>
            <ul className="space-y-1 text-xs">
              <li>• Todas as funcionalidades disponíveis</li>
              <li>• Contadores atualizados em tempo real</li>
              <li>• Reset automático todo dia 1º</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">🟡 Atenção (80-99%)</h4>
            <ul className="space-y-1 text-xs">
              <li>• Alerta automático enviado</li>
              <li>• Sugestão de upgrade do plano</li>
              <li>• Funcionalidades ainda ativas</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">🔴 Limite Atingido (100%)</h4>
            <ul className="space-y-1 text-xs">
              <li>• Bloqueio suave da funcionalidade</li>
              <li>• CTA "Falar com a equipe"</li>
              <li>• Outras funcionalidades continuam</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">🔄 Reset Automático</h4>
            <ul className="space-y-1 text-xs">
              <li>• Todo dia 1º do mês às 00:00</li>
              <li>• Contadores zerados automaticamente</li>
              <li>• Histórico preservado para auditoria</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}