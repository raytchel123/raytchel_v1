import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  MessageSquare,
  Webhook,
  Play,
  Copy,
  BarChart2,
  Terminal,
  Zap,
  Phone,
  Key,
  Globe
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';

interface TestLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'webhook';
  message: string;
  details?: any;
}

interface WebhookTest {
  id: string;
  name: string;
  description: string;
  payload: any;
  expectedResponse: string;
}

export function WhatsAppTestConsole() {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [testing, setTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'active' | 'error'>('unknown');
  const [customMessage, setCustomMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Configuração do WhatsApp
  const WHATSAPP_CONFIG = {
    token: 'EAAZA0beuOn34BPEM4keCSrT67uDrROBwFiRjx6j4N1Sk9CheiTHthkwgs8cMINizdyHVxNruxKkZBZCMcBYtf0zQ2G4iAOJdX2FKsSBU2dsN7yuS1Fe6yZCYU42EwLrWFgkwLsrf8npOZBuZCNZBNeCjBKTVatOXkUHOC1AEXPbvqHDRwIGZCVZB7SBUwGKAf2d2M7uV1PrPQ3vJeMZAP12bmFvgVNknjGAwyZCk3fyqN0ZB1ORqlAZDZD',
    phoneNumberId: '1320457612840383',
    testNumber: '+15551828227', // 📱 NÚMERO PARA ONDE AS MENSAGENS SÃO ENVIADAS
    verifyToken: 'raytchel_webhook_2024',
    webhookUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`
  };

  // Testes pré-definidos
  const webhookTests: WebhookTest[] = [
    {
      id: 'greeting',
      name: 'Saudação Básica',
      description: 'Teste de resposta para saudação',
      payload: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_test_1',
                from: WHATSAPP_CONFIG.testNumber,
                type: 'text',
                text: { body: 'oi' },
                timestamp: Math.floor(Date.now() / 1000)
              }],
              metadata: {
                phone_number_id: WHATSAPP_CONFIG.phoneNumberId
              }
            }
          }]
        }]
      },
      expectedResponse: 'Olá! Sistema funcionando!'
    },
    {
      id: 'price_inquiry',
      name: 'Consulta de Preço',
      description: 'Teste de resposta para pergunta sobre preços',
      payload: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_test_2',
                from: WHATSAPP_CONFIG.testNumber,
                type: 'text',
                text: { body: 'quanto custa' },
                timestamp: Math.floor(Date.now() / 1000)
              }],
              metadata: {
                phone_number_id: WHATSAPP_CONFIG.phoneNumberId
              }
            }
          }]
        }]
      },
      expectedResponse: 'Nossos valores começam em R$ 3.465'
    },
    {
      id: 'appointment',
      name: 'Agendamento',
      description: 'Teste de resposta para agendamento',
      payload: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_test_3',
                from: WHATSAPP_CONFIG.testNumber,
                type: 'text',
                text: { body: 'agendar visita' },
                timestamp: Math.floor(Date.now() / 1000)
              }],
              metadata: {
                phone_number_id: WHATSAPP_CONFIG.phoneNumberId
              }
            }
          }]
        }]
      },
      expectedResponse: 'Podemos agendar sua visita'
    },
    {
      id: 'location',
      name: 'Localização',
      description: 'Teste de resposta para pergunta sobre localização',
      payload: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg_test_4',
                from: WHATSAPP_CONFIG.testNumber,
                type: 'text',
                text: { body: 'onde fica' },
                timestamp: Math.floor(Date.now() / 1000)
              }],
              metadata: {
                phone_number_id: WHATSAPP_CONFIG.phoneNumberId
              }
            }
          }]
        }]
      },
      expectedResponse: 'Estamos no centro de São Luís'
    }
  ];

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    addLog('info', 'Console de Testes WhatsApp Inicializado', {
      webhookUrl: WHATSAPP_CONFIG.webhookUrl,
      phoneNumberId: WHATSAPP_CONFIG.phoneNumberId
    });
    
    // Verificar status do webhook na inicialização
    checkWebhookStatus();
  }, []);

  const addLog = (type: TestLog['type'], message: string, details?: any) => {
    const newLog: TestLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      details
    };
    
    setLogs(prev => [...prev, newLog]);
  };

  const checkWebhookStatus = async () => {
    try {
      addLog('info', 'Verificando status do webhook...');
      
      const verifyUrl = `${WHATSAPP_CONFIG.webhookUrl}?hub.mode=subscribe&hub.verify_token=${WHATSAPP_CONFIG.verifyToken}&hub.challenge=test_challenge_123`;
      
      const response = await fetch(verifyUrl, {
        method: 'GET'
      });
      
      const result = await response.text();
      
      if (response.ok && result === 'test_challenge_123') {
        setWebhookStatus('active');
        addLog('success', 'Webhook verificado com sucesso!', {
          status: response.status,
          challenge: result
        });
      } else {
        setWebhookStatus('error');
        addLog('error', 'Falha na verificação do webhook', {
          status: response.status,
          response: result
        });
      }
    } catch (error) {
      setWebhookStatus('error');
      addLog('error', 'Erro ao verificar webhook', {
        error: error.message
      });
    }
  };

  const testWebhookMessage = async (test: WebhookTest) => {
    try {
      setTesting(true);
      addLog('info', `Iniciando teste: ${test.name}`, {
        message: test.payload.entry[0].changes[0].value.messages[0].text.body
      });

      const response = await fetch(WHATSAPP_CONFIG.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.payload)
      });

      const result = await response.text();
      
      if (response.ok) {
        addLog('success', `✅ Teste "${test.name}" executado com sucesso`, {
          status: response.status,
          response: result,
          expected: test.expectedResponse
        });
      } else {
        addLog('error', `❌ Teste "${test.name}" falhou`, {
          status: response.status,
          response: result
        });
      }
    } catch (error) {
      addLog('error', `❌ Erro no teste "${test.name}"`, {
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const testCustomMessage = async () => {
    if (!customMessage.trim()) return;
    
    const customTest: WebhookTest = {
      id: 'custom',
      name: 'Mensagem Personalizada',
      description: 'Teste com mensagem personalizada',
      payload: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: `msg_custom_${Date.now()}`,
                from: WHATSAPP_CONFIG.testNumber,
                type: 'text',
                text: { body: customMessage },
                timestamp: Math.floor(Date.now() / 1000)
              }],
              metadata: {
                phone_number_id: WHATSAPP_CONFIG.phoneNumberId
              }
            }
          }]
        }]
      },
      expectedResponse: 'Resposta baseada no conteúdo'
    };
    
    await testWebhookMessage(customTest);
    setCustomMessage('');
  };

  const runAllTests = async () => {
    addLog('info', '🚀 Iniciando bateria completa de testes...');
    
    for (const test of webhookTests) {
      await testWebhookMessage(test);
      // Aguardar entre testes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    addLog('info', '✅ Bateria de testes concluída!');
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WHATSAPP_CONFIG.webhookUrl);
    addLog('info', 'URL do webhook copiada para área de transferência');
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Console limpo - pronto para novos testes');
  };

  const getStatusColor = (status: typeof webhookStatus) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status: typeof webhookStatus) => {
    switch (status) {
      case 'active': return 'Webhook Ativo';
      case 'error': return 'Webhook com Erro';
      default: return 'Status Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Console de Testes WhatsApp"
        subtitle="Teste e monitore o webhook em tempo real"
        icon={<Webhook className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(webhookStatus)}`}>
              {getStatusText(webhookStatus)}
            </span>
            <button
              onClick={checkWebhookStatus}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Verificar Status
            </button>
          </div>
        }
        showBackButton={true}
        backTo="/whatsapp"
      />

      {/* Configuração */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-indigo-600" />
          Configuração do Webhook
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">URL do Webhook</span>
                <button 
                  onClick={copyWebhookUrl}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <code className="text-xs text-gray-600 break-all">
                {WHATSAPP_CONFIG.webhookUrl}
              </code>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Verify Token</span>
              <code className="block text-xs text-gray-600 mt-1">
                {WHATSAPP_CONFIG.verifyToken}
              </code>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Phone Number ID</span>
              <code className="block text-xs text-gray-600 mt-1">
                {WHATSAPP_CONFIG.phoneNumberId}
              </code>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Access Token</span>
              <code className="block text-xs text-gray-600 mt-1">
                {WHATSAPP_CONFIG.token.substring(0, 20)}...
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Teste Personalizado */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
          Teste Personalizado
        </h3>
        
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Digite uma mensagem para testar o webhook..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && !testing && testCustomMessage()}
            />
          </div>
          <button
            onClick={testCustomMessage}
            disabled={!customMessage.trim() || testing}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            <Send className="w-5 h-5 mr-2" />
            Testar
          </button>
        </div>
      </div>

      {/* Testes Pré-definidos */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium flex items-center">
            <Play className="w-5 h-5 mr-2 text-green-600" />
            Testes Automatizados
          </h3>
          <button
            onClick={runAllTests}
            disabled={testing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Executar Todos
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhookTests.map((test) => (
            <div key={test.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">{test.name}</h4>
                  <p className="text-sm text-gray-600">{test.description}</p>
                </div>
                <button
                  onClick={() => testWebhookMessage(test)}
                  disabled={testing}
                  className="flex items-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Testar
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded text-xs">
                  <span className="font-medium">Input:</span> "{test.payload.entry[0].changes[0].value.messages[0].text.body}"
                </div>
                <div className="p-2 bg-blue-50 rounded text-xs">
                  <span className="font-medium">Esperado:</span> {test.expectedResponse}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Console de Logs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium">Logs em Tempo Real</h3>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {logs.length} eventos
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Auto-scroll</span>
            </label>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aguardando eventos...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="mb-2">
                <div className="flex items-start space-x-3">
                  <span className="text-gray-500 text-xs">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    log.type === 'success' ? 'bg-green-900 text-green-300' :
                    log.type === 'error' ? 'bg-red-900 text-red-300' :
                    log.type === 'webhook' ? 'bg-blue-900 text-blue-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
                {log.details && (
                  <div className="ml-20 mt-1">
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-300">
                        Ver detalhes
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-800 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Instruções de Configuração */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center">
          <Key className="w-5 h-5 mr-2" />
          Configuração no Meta Developer Console
        </h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>1.</strong> Acesse: <a href="https://developers.facebook.com/apps" className="underline">Meta for Developers</a></p>
          <p><strong>2.</strong> Vá em WhatsApp → Configuration → Webhook</p>
          <p><strong>3.</strong> Configure:</p>
          <ul className="ml-4 space-y-1">
            <li>• <strong>Callback URL:</strong> {WHATSAPP_CONFIG.webhookUrl}</li>
            <li>• <strong>Verify Token:</strong> {WHATSAPP_CONFIG.verifyToken}</li>
            <li>• <strong>Webhook Fields:</strong> messages</li>
          </ul>
          <p><strong>4.</strong> Clique "Verify and Save"</p>
          <p><strong>5.</strong> Teste enviando "oi" do número configurado</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <BarChart2 className="w-8 h-8 text-indigo-600" />
            <div>
              <p className="text-sm text-gray-600">Total de Testes</p>
              <p className="text-xl font-bold">{logs.filter(l => l.type === 'success' || l.type === 'error').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Sucessos</p>
              <p className="text-xl font-bold">{logs.filter(l => l.type === 'success').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Erros</p>
              <p className="text-xl font-bold">{logs.filter(l => l.type === 'error').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <Phone className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Webhooks</p>
              <p className="text-xl font-bold">{logs.filter(l => l.type === 'webhook').length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}