import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useUsageStore } from '../../stores/usageStore';
import { PageHeader } from '../common/PageHeader';

export function UsageLimitsConfig() {
  const { 
    usageStatus, 
    loading, 
    error,
    loadUsageStatus,
    updateLimits,
    clearError 
  } = useUsageStore();

  const [editingLimits, setEditingLimits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadUsageStatus();
  }, []);

  useEffect(() => {
    if (usageStatus?.usage) {
      const currentLimits: Record<string, number> = {};
      Object.entries(usageStatus.usage).forEach(([type, usage]) => {
        currentLimits[type] = usage.limit;
      });
      setEditingLimits(currentLimits);
    }
  }, [usageStatus]);

  const handleSave = async () => {
    setSaving(true);
    clearError();

    try {
      const success = await updateLimits(editingLimits);
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving limits:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateLimit = (usageType: string, value: number) => {
    setEditingLimits(prev => ({
      ...prev,
      [usageType]: Math.max(0, value)
    }));
  };

  const getRecommendedLimit = (usageType: string, currentUsage: number) => {
    const recommendations: Record<string, number> = {
      'whatsapp_messages': Math.max(1000, currentUsage * 2),
      'templates': Math.max(500, currentUsage * 2),
      'quotes': Math.max(100, currentUsage * 2),
      'appointments': Math.max(50, currentUsage * 2),
      'handoffs': Math.max(20, currentUsage * 2)
    };
    return recommendations[usageType] || currentUsage * 2;
  };

  const formatUsageType = (usageType: string) => {
    const labels: Record<string, string> = {
      'whatsapp_messages': 'Mensagens WhatsApp',
      'templates': 'Templates Enviados',
      'quotes': 'Orçamentos Gerados',
      'appointments': 'Agendamentos',
      'handoffs': 'Transferências Humanas'
    };
    return labels[usageType] || usageType;
  };

  const calculateMonthlyCost = (limits: Record<string, number>) => {
    // Cálculo simplificado de custo baseado nos limites
    const costs = {
      'whatsapp_messages': 0.05, // R$ 0,05 por mensagem
      'templates': 0.10, // R$ 0,10 por template
      'quotes': 1.00, // R$ 1,00 por orçamento
      'appointments': 2.00, // R$ 2,00 por agendamento
      'handoffs': 5.00 // R$ 5,00 por handoff
    };

    return Object.entries(limits).reduce((total, [type, limit]) => {
      return total + (limit * (costs[type] || 0));
    }, 0);
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
        title="Configuração de Limites"
        subtitle="Defina limites mensais para cada funcionalidade"
        icon={<Settings className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            {showSuccess && (
              <div className="flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">Limites salvos!</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Limites
                </>
              )}
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

      {/* Limits Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Limites Mensais por Funcionalidade</h3>
        
        <div className="space-y-6">
          {usageStatus?.usage && Object.entries(usageStatus.usage).map(([usageType, usage]) => (
            <div key={usageType} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium">{formatUsageType(usageType)}</h4>
                  <p className="text-sm text-gray-600">
                    Uso atual: {usage.current} / {usage.limit} ({usage.percentage.toFixed(1)}%)
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  usage.blocked ? 'bg-red-100 text-red-800' :
                  usage.warning ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {usage.blocked ? 'Bloqueado' : usage.warning ? 'Atenção' : 'Normal'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite Atual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingLimits[usageType] || usage.limit}
                    onChange={(e) => updateLimit(usageType, parseInt(e.target.value) || 0)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recomendado
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-600">
                      {getRecommendedLimit(usageType, usage.current)}
                    </span>
                    <button
                      onClick={() => updateLimit(usageType, getRecommendedLimit(usageType, usage.current))}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progresso
                  </label>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usage.blocked ? 'bg-red-500' :
                        usage.warning ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Estimation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Estimativa de Custo Mensal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Limites atuais:</span>
              <span className="font-medium">
                R$ {calculateMonthlyCost(
                  usageStatus?.usage ? 
                    Object.fromEntries(Object.entries(usageStatus.usage).map(([k, v]) => [k, v.limit])) :
                    {}
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Novos limites:</span>
              <span className="font-medium text-indigo-600">
                R$ {calculateMonthlyCost(editingLimits).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-medium">Diferença:</span>
              <span className={`font-medium ${
                calculateMonthlyCost(editingLimits) > calculateMonthlyCost(
                  usageStatus?.usage ? 
                    Object.fromEntries(Object.entries(usageStatus.usage).map(([k, v]) => [k, v.limit])) :
                    {}
                ) ? 'text-red-600' : 'text-green-600'
              }`}>
                {calculateMonthlyCost(editingLimits) > calculateMonthlyCost(
                  usageStatus?.usage ? 
                    Object.fromEntries(Object.entries(usageStatus.usage).map(([k, v]) => [k, v.limit])) :
                    {}
                ) ? '+' : ''}
                R$ {(calculateMonthlyCost(editingLimits) - calculateMonthlyCost(
                  usageStatus?.usage ? 
                    Object.fromEntries(Object.entries(usageStatus.usage).map(([k, v]) => [k, v.limit])) :
                    {}
                )).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Planos Disponíveis</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Básico:</span>
                <span>R$ 97/mês</span>
              </div>
              <div className="flex justify-between">
                <span>Profissional:</span>
                <span>R$ 197/mês</span>
              </div>
              <div className="flex justify-between">
                <span>Enterprise:</span>
                <span>Sob consulta</span>
              </div>
            </div>
            <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Ver Detalhes dos Planos
            </button>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="font-medium text-gray-800 mb-3">Diretrizes de Uso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">🟢 Uso Eficiente</h4>
            <ul className="space-y-1 text-xs">
              <li>• Use templates para respostas frequentes</li>
              <li>• Qualifique leads antes de gerar orçamentos</li>
              <li>• Configure handoffs apenas quando necessário</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">⚠️ Alertas Automáticos</h4>
            <ul className="space-y-1 text-xs">
              <li>• 80% do limite: Notificação de atenção</li>
              <li>• 100% do limite: Bloqueio suave da funcionalidade</li>
              <li>• Reset automático todo dia 1º do mês</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}