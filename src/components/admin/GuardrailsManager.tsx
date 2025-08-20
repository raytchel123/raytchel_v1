import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  BarChart2,
  Clock,
  Users,
  MessageSquare,
  TrendingDown,
  Save,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { GuardrailsService } from '../../lib/guardrailsService';
import { formatDistanceToNow } from '../../utils/dateFormat';
import { PageHeader } from '../common/PageHeader';

export function GuardrailsManager() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [saving, setSaving] = useState(false);

  const guardrailsService = GuardrailsService.getInstance();
  const tenantId = '00000000-0000-0000-0000-000000000001'; // Zaffira

  useEffect(() => {
    loadGuardrailData();
  }, [dateRange]);

  const loadGuardrailData = async () => {
    try {
      setLoading(true);
      setError(null);

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
      }

      const [statsData, logsData] = await Promise.all([
        guardrailsService.getGuardrailStats(tenantId, startDate, endDate),
        guardrailsService.getDecisionLogs(tenantId, undefined, 100)
      ]);

      setStats(statsData);
      setLogs(logsData);
    } catch (err) {
      console.error('Error loading guardrail data:', err);
      setError('Falha ao carregar dados dos guardrails');
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (policyType: string, updates: any) => {
    try {
      setSaving(true);
      const success = await guardrailsService.updateGuardrailPolicy(
        tenantId,
        policyType as any,
        updates
      );
      
      if (success) {
        await loadGuardrailData();
      } else {
        setError('Falha ao atualizar política');
      }
    } catch (err) {
      setError('Erro ao salvar política');
    } finally {
      setSaving(false);
    }
  };

  const getGuardrailIcon = (reason: string) => {
    switch (reason) {
      case 'price_missing': return <DollarSign className="w-4 h-4 text-red-600" />;
      case 'low_confidence': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'sensitive_info': return <Shield className="w-4 h-4 text-purple-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getGuardrailColor = (reason: string) => {
    switch (reason) {
      case 'price_missing': return 'bg-red-50 text-red-800 border-red-200';
      case 'low_confidence': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'sensitive_info': return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getGuardrailLabel = (reason: string) => {
    switch (reason) {
      case 'price_missing': return 'Preço Ausente';
      case 'low_confidence': return 'Baixa Confiança';
      case 'sensitive_info': return 'Info Sensível';
      default: return reason;
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
        title="Guardrails de Segurança"
        subtitle="Monitore e configure proteções da IA"
        icon={<Shield className="w-6 h-6 text-indigo-600" />}
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
            </select>
            <button
              onClick={loadGuardrailData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Decisões</p>
              <p className="text-2xl font-bold">{stats?.totalDecisions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Shield className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Guardrails Ativados</p>
              <p className="text-2xl font-bold">{stats?.guardrailsTriggered || 0}</p>
              <p className="text-xs text-yellow-600">
                {stats?.totalDecisions > 0 
                  ? `${((stats.guardrailsTriggered / stats.totalDecisions) * 100).toFixed(1)}%`
                  : '0%'
                } das decisões
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Fallbacks Usados</p>
              <p className="text-2xl font-bold">{stats?.fallbacksUsed || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Handoffs Oferecidos</p>
              <p className="text-2xl font-bold">{stats?.handoffsOffered || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Triggers */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4 flex items-center">
          <BarChart2 className="w-5 h-5 mr-2 text-indigo-600" />
          Principais Guardrails Ativados
        </h3>
        
        {stats?.topTriggers?.length > 0 ? (
          <div className="space-y-3">
            {stats.topTriggers.map((trigger: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getGuardrailIcon(trigger.reason)}
                  <span className="font-medium">{getGuardrailLabel(trigger.reason)}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{trigger.count}</span>
                  <p className="text-xs text-gray-500">ativações</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhum guardrail ativado no período</p>
        )}
      </div>

      {/* Confidence Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Distribuição de Confiança</h3>
        
        <div className="space-y-3">
          {stats?.confidenceDistribution?.map((dist: any, index: number) => (
            <div key={index} className="flex items-center">
              <div className="w-20 text-sm text-gray-600">{dist.range}</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      dist.range.startsWith('0.9') ? 'bg-green-500' :
                      dist.range.startsWith('0.7') ? 'bg-blue-500' :
                      dist.range.startsWith('0.5') ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ 
                      width: `${stats.totalDecisions > 0 ? (dist.count / stats.totalDecisions) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
              <div className="w-12 text-sm font-medium text-right">{dist.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Decision Logs */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Logs de Decisões Recentes</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3 text-sm font-medium text-gray-600">Timestamp</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Intent</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Confiança</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Guardrail</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.slice(0, 20).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-600">
                    {formatDistanceToNow(log.createdAt)}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {log.intent}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        log.confidence >= 0.8 ? 'text-green-600' :
                        log.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(log.confidence * 100).toFixed(0)}%
                      </span>
                      <div className={`w-12 h-2 rounded-full ${
                        log.confidence >= 0.8 ? 'bg-green-200' :
                        log.confidence >= 0.6 ? 'bg-yellow-200' : 'bg-red-200'
                      }`}>
                        <div
                          className={`h-2 rounded-full ${
                            log.confidence >= 0.8 ? 'bg-green-500' :
                            log.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${log.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    {log.guardrailTriggered ? (
                      <span className={`px-2 py-1 rounded-full text-xs border ${getGuardrailColor(log.guardrailTriggered)}`}>
                        {getGuardrailLabel(log.guardrailTriggered)}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        ✓ Passou
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      {log.fallbackUsed && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                          Fallback
                        </span>
                      )}
                      {log.handoffOffered && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          Handoff
                        </span>
                      )}
                      {!log.fallbackUsed && !log.handoffOffered && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Normal
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guardrail Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-indigo-600" />
          Configuração de Guardrails
        </h3>
        
        <div className="space-y-6">
          {/* Price Missing Policy */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                <h4 className="font-medium">Preço Ausente</h4>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  onChange={(e) => updatePolicy('price_missing', { enabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem de Fallback
                </label>
                <textarea
                  defaultValue="Posso confirmar com especialista para evitar erro? Prefere seguir por agendamento ou falar com humano?"
                  onChange={(e) => updatePolicy('price_missing', { fallbackMessage: e.target.value })}
                  rows={2}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  onChange={(e) => updatePolicy('price_missing', { handoffTrigger: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Oferecer handoff automaticamente</span>
              </div>
            </div>
          </div>

          {/* Low Confidence Policy */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-medium">Baixa Confiança</h4>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  onChange={(e) => updatePolicy('low_confidence', { enabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite de Confiança (0.0 - 1.0)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  onChange={(e) => updatePolicy('low_confidence', { thresholdValue: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template de Confirmação
                </label>
                <textarea
                  defaultValue='Você quis dizer "{intent}" ou algo diferente? Posso confirmar?'
                  onChange={(e) => updatePolicy('low_confidence', { fallbackMessage: e.target.value })}
                  rows={2}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{intent}'} para inserir a intenção detectada
                </p>
              </div>
            </div>
          </div>

          {/* Sensitive Info Policy */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium">Informações Sensíveis</h4>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  onChange={(e) => updatePolicy('sensitive_info', { enabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Proteção
              </label>
              <textarea
                defaultValue="Para informações sensíveis, prefiro conectar você com um especialista. Posso agendar?"
                onChange={(e) => updatePolicy('sensitive_info', { fallbackMessage: e.target.value })}
                rows={2}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => loadGuardrailData()}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Guardrail Examples */}
      <div className="bg-blue-50 p-6 rounded-lg border">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Como os Guardrails Funcionam
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-red-600 mb-2">🚫 Preço Ausente</h4>
            <p className="text-xs">
              <strong>Trigger:</strong> Cliente pergunta preço de produto sem price definido<br/>
              <strong>Ação:</strong> Oferece agendamento ou handoff<br/>
              <strong>Nunca:</strong> Inventa ou estima preços
            </p>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-yellow-600 mb-2">⚠️ Baixa Confiança</h4>
            <p className="text-xs">
              <strong>Trigger:</strong> Confiança &lt; 70%<br/>
              <strong>Ação:</strong> Pede confirmação da intenção<br/>
              <strong>Exemplo:</strong> "Você quis dizer X ou Y?"
            </p>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-purple-600 mb-2">🛡️ Info Sensível</h4>
            <p className="text-xs">
              <strong>Trigger:</strong> CPF, cartão, senha detectados<br/>
              <strong>Ação:</strong> Redireciona para especialista<br/>
              <strong>Proteção:</strong> Dados pessoais seguros
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}