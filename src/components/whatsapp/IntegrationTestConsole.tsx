import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  Bot,
  Database,
  Zap,
  Terminal,
  Send,
  Phone,
  Brain,
  User
} from 'lucide-react';
import { OpenAIIntegration } from '../../lib/openaiIntegration';
import { WhatsAppMetaIntegration } from '../../lib/whatsappMeta';
import { ConversationService } from '../../lib/conversationService';
import { PageHeader } from '../common/PageHeader';

interface TestLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
  duration?: number;
}

export function IntegrationTestConsole() {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'OpenAI Connection', status: 'pending' },
    { name: 'WhatsApp Meta API', status: 'pending' },
    { name: 'Database Connection', status: 'pending' },
    { name: 'Full Message Flow', status: 'pending' }
  ]);
  const [testing, setTesting] = useState(false);
  const [customMessage, setCustomMessage] = useState('Olá, este é um teste de integração');
  const [testUserId, setTestUserId] = useState('+15551828227');
  const [aiConversation, setAiConversation] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    addLog('info', 'Console de Testes de Integração Inicializado');
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

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const testOpenAIConnection = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('OpenAI Connection', { status: 'running' });
    addLog('info', 'Testando conexão com OpenAI...');

    try {
      const openai = OpenAIIntegration.getInstance();
      const result = await openai.testConnection();
      const duration = Date.now() - startTime;

      if (result.success) {
        updateTestResult('OpenAI Connection', { 
          status: 'success', 
          message: `Conectado! ${result.models} modelos disponíveis`,
          duration 
        });
        addLog('success', `OpenAI conectado com sucesso! ${result.models} modelos disponíveis`, result);
        return true;
      } else {
        updateTestResult('OpenAI Connection', { 
          status: 'error', 
          message: result.error,
          duration 
        });
        addLog('error', `Falha na conexão OpenAI: ${result.error}`, result);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('OpenAI Connection', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        duration 
      });
      addLog('error', 'Erro ao testar OpenAI', error);
      return false;
    }
  };

  const testWhatsAppConnection = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('WhatsApp Meta API', { status: 'running' });
    addLog('info', 'Testando conexão com WhatsApp Meta API...');

    try {
      const whatsapp = WhatsAppMetaIntegration.getInstance();
      const result = await whatsapp.testConnection();
      const duration = Date.now() - startTime;

      if (result.success) {
        updateTestResult('WhatsApp Meta API', { 
          status: 'success', 
          message: 'Conectado com sucesso!',
          duration 
        });
        addLog('success', 'WhatsApp Meta API conectado com sucesso!', result.data);
        return true;
      } else {
        updateTestResult('WhatsApp Meta API', { 
          status: 'error', 
          message: result.error,
          duration 
        });
        addLog('error', `Falha na conexão WhatsApp: ${result.error}`, result);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('WhatsApp Meta API', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        duration 
      });
      addLog('error', 'Erro ao testar WhatsApp Meta API', error);
      return false;
    }
  };

  const testDatabaseConnection = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Database Connection', { status: 'running' });
    addLog('info', 'Testando conexão com banco de dados...');

    try {
      const conversationService = ConversationService.getInstance();
      const testConversation = await conversationService.getOrCreateConversation('test_user_db');
      const duration = Date.now() - startTime;

      updateTestResult('Database Connection', { 
        status: 'success', 
        message: 'Banco conectado com sucesso!',
        duration 
      });
      addLog('success', 'Banco de dados conectado com sucesso!', {
        conversationId: testConversation.id
      });
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('Database Connection', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        duration 
      });
      addLog('error', 'Erro ao testar banco de dados', error);
      return false;
    }
  };

  const testFullMessageFlow = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Full Message Flow', { status: 'running' });
    addLog('info', 'Testando fluxo completo de mensagem...');

    try {
      const conversationService = ConversationService.getInstance();
      const testMessage = customMessage || 'Olá, este é um teste de integração';
      const userId = testUserId || 'test_user_flow';

      addLog('info', `Processando mensagem: "${testMessage}"`);

      // Process message through full flow
      await conversationService.processMessage(testMessage, userId);

      const duration = Date.now() - startTime;
      updateTestResult('Full Message Flow', { 
        status: 'success', 
        message: 'Fluxo completo executado com sucesso!',
        duration 
      });
      addLog('success', 'Fluxo completo de mensagem testado com sucesso!', {
        testMessage,
        userId,
        duration: `${duration}ms`
      });
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('Full Message Flow', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        duration 
      });
      addLog('error', 'Erro no fluxo completo de mensagem', error);
      return false;
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    addLog('info', '🚀 Iniciando bateria completa de testes...');

    // Reset all test results
    setTestResults(prev => prev.map(test => ({ ...test, status: 'pending' })));

    const tests = [
      { name: 'OpenAI Connection', fn: testOpenAIConnection },
      { name: 'WhatsApp Meta API', fn: testWhatsAppConnection },
      { name: 'Database Connection', fn: testDatabaseConnection },
      { name: 'Full Message Flow', fn: testFullMessageFlow }
    ];

    let successCount = 0;

    for (const test of tests) {
      const success = await test.fn();
      if (success) successCount++;
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const allPassed = successCount === tests.length;
    addLog(
      allPassed ? 'success' : 'warning', 
      `✅ Testes concluídos: ${successCount}/${tests.length} passaram`
    );

    setTesting(false);
  };

  const testCustomMessage = async () => {
    if (!customMessage.trim()) {
      addLog('warning', 'Digite uma mensagem para testar');
      return;
    }

    addLog('info', `Testando mensagem personalizada: "${customMessage}"`);
    await testFullMessageFlow();
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Console limpo - pronto para novos testes');
  };

  const testAIConversation = async () => {
    if (!aiMessage.trim() || aiTesting) return;
    
    setAiTesting(true);
    const userMessage = aiMessage.trim();
    setAiMessage('');
    
    // Adicionar mensagem do usuário
    const newUserMessage = {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    
    setAiConversation(prev => [...prev, newUserMessage]);
    addLog('info', `Enviando mensagem para IA: "${userMessage}"`);
    
    try {
      const openai = OpenAIIntegration.getInstance();
      
      // Preparar contexto da conversa
      const conversationHistory = aiConversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Adicionar mensagem atual
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      
      // Gerar resposta
      const aiResponse = await openai.generateResponse(conversationHistory, 'test_user_ai');
      
      // Adicionar resposta da IA
      const newAiMessage = {
        role: 'assistant' as const,
        content: aiResponse,
        timestamp: new Date()
      };
      
      setAiConversation(prev => [...prev, newUserMessage, newAiMessage]);
      addLog('success', `IA respondeu: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`);
      
    } catch (error) {
      addLog('error', `Erro na conversa com IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Adicionar mensagem de erro
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Desculpe, estou tendo dificuldades técnicas no momento. 🤖',
        timestamp: new Date()
      };
      
      setAiConversation(prev => [...prev, newUserMessage, errorMessage]);
    } finally {
      setAiTesting(false);
    }
  };
  
  const clearAIConversation = () => {
    setAiConversation([]);
    addLog('info', 'Conversa com IA limpa');
  };
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getLogIcon = (type: TestLog['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Console de Testes de Integração"
        subtitle="Teste OpenAI + WhatsApp Meta + Banco de Dados"
        icon={<Terminal className="w-6 h-6 text-indigo-600" />}
        actions={
          <button
            onClick={runAllTests}
            disabled={testing}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Executando Testes...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Executar Todos os Testes
              </>
            )}
          </button>
        }
        showBackButton={true}
        backTo="/whatsapp"
      />

      {/* Test Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {testResults.map((test) => (
          <div key={test.name} className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {test.name === 'OpenAI Connection' && <Brain className="w-4 h-4 text-green-600" />}
                {test.name === 'WhatsApp Meta API' && <Phone className="w-4 h-4 text-blue-600" />}
                {test.name === 'Database Connection' && <Database className="w-4 h-4 text-purple-600" />}
                {test.name === 'Full Message Flow' && <Zap className="w-4 h-4 text-yellow-600" />}
                <span className="text-sm font-medium">{test.name}</span>
              </div>
              {getStatusIcon(test.status)}
            </div>
            
            {test.message && (
              <p className={`text-xs mt-2 ${
                test.status === 'success' ? 'text-green-600' :
                test.status === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {test.message}
              </p>
            )}
            
            {test.duration && (
              <p className="text-xs text-gray-500 mt-1">
                {test.duration}ms
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Custom Message Test */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
          Teste de Mensagem Personalizada
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📱 Número de Teste (WhatsApp) - Para onde as mensagens são enviadas
              </label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="+15551828227"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Use apenas números autorizados no Meta Developer Console
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Teste
              </label>
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Digite uma mensagem para testar..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && !testing && testCustomMessage()}
              />
            </div>
          </div>
          
          <button
            onClick={testCustomMessage}
            disabled={!customMessage.trim() || testing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5 mr-2" />
            Testar Mensagem
          </button>
        </div>
      </div>

      {/* AI Conversation Test */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-medium mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-600" />
          Conversar com a IA
        </h3>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {aiConversation.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white border text-gray-800'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {msg.role === 'user' ? (
                        <User className="w-3 h-3" />
                      ) : (
                        <Bot className="w-3 h-3" />
                      )}
                      <span className="text-xs font-medium">
                        {msg.role === 'user' ? 'Você' : 'Raytchel'}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                    <div className="text-right mt-1">
                      <span className="text-xs opacity-70">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {aiConversation.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Inicie uma conversa com a Raytchel!</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              placeholder="Digite sua mensagem para a IA..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && !aiTesting && testAIConversation()}
            />
            <button
              onClick={testAIConversation}
              disabled={!aiMessage.trim() || aiTesting}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {aiTesting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={clearAIConversation}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Limpar conversa
            </button>
            <div className="text-xs text-gray-500">
              {aiConversation.length} mensagens • Contexto preservado
            </div>
          </div>
        </div>
      </div>
      {/* Individual Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={testOpenAIConnection}
          disabled={testing}
          className="flex items-center justify-center p-4 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Brain className="w-5 h-5 mr-2 text-green-600" />
          Testar OpenAI
        </button>
        
        <button
          onClick={testWhatsAppConnection}
          disabled={testing}
          className="flex items-center justify-center p-4 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Phone className="w-5 h-5 mr-2 text-blue-600" />
          Testar WhatsApp
        </button>
        
        <button
          onClick={testDatabaseConnection}
          disabled={testing}
          className="flex items-center justify-center p-4 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Database className="w-5 h-5 mr-2 text-purple-600" />
          Testar Banco
        </button>
        
        <button
          onClick={testFullMessageFlow}
          disabled={testing}
          className="flex items-center justify-center p-4 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Zap className="w-5 h-5 mr-2 text-yellow-600" />
          Testar Fluxo
        </button>
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
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50"
          >
            Limpar
          </button>
        </div>

        <div className="h-96 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Aguardando eventos de teste...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="mb-2">
                <div className="flex items-start space-x-3">
                  <span className="text-gray-500 text-xs">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="text-xs">
                    {getLogIcon(log.type)}
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

      {/* Configuration Info */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          Configuração Atual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <p><strong>OpenAI Model:</strong> {import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo'}</p>
            <p><strong>Bot Await Time:</strong> {import.meta.env.VITE_BOT_AWAIT || '15000'}ms</p>
          </div>
          <div>
            <p><strong>WhatsApp API Version:</strong> v22.0</p>
            <p><strong>Database:</strong> Supabase PostgreSQL</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Testes Passaram</p>
              <p className="text-xl font-bold">
                {testResults.filter(t => t.status === 'success').length}/{testResults.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Erros</p>
              <p className="text-xl font-bold">
                {testResults.filter(t => t.status === 'error').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <Terminal className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Logs</p>
              <p className="text-xl font-bold">{logs.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
            <div>
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-xl font-bold">
                {testResults.filter(t => t.duration).length > 0 
                  ? Math.round(testResults.reduce((acc, t) => acc + (t.duration || 0), 0) / testResults.filter(t => t.duration).length)
                  : 0}ms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}