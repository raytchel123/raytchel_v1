import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Settings,
  Key,
  Globe,
  Shield,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Facebook,
  Building2,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { supabase } from '../../lib/supabase';

interface ConnectionStatus {
  isConnected: boolean;
  phoneNumber?: string;
  businessName?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  lastSync?: Date;
  error?: string;
  businessAccountId?: string;
  appId?: string;
}

interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  appId: string;
  appSecret: string;
  webhookVerifyToken: string;
}

export function WhatsAppConnection() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false
  });
  const [credentials, setCredentials] = useState<WhatsAppCredentials>({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    appId: '',
    appSecret: '',
    webhookVerifyToken: 'raytchel_webhook_2024'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [businessAccounts, setBusinessAccounts] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const loadConnectionStatus = async () => {
    try {
      setLoading(true);
      
      // Carregar configurações existentes
      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (config) {
        setCredentials({
          accessToken: config.api_key || '',
          phoneNumberId: config.phone_number || '',
          businessAccountId: config.settings?.business_account_id || '',
          appId: config.settings?.app_id || '',
          appSecret: config.settings?.app_secret || '',
          webhookVerifyToken: config.settings?.webhook_verify_token || 'raytchel_webhook_2024'
        });

        setConnectionStatus({
          isConnected: config.status === 'active',
          phoneNumber: config.phone_number,
          businessName: config.settings?.business_name,
          verificationStatus: config.settings?.verification_status,
          lastSync: config.updated_at ? new Date(config.updated_at) : undefined,
          businessAccountId: config.settings?.business_account_id,
          appId: config.settings?.app_id
        });

        if (config.status === 'active') {
          setStep(5); // Já conectado
        } else if (config.api_key) {
          setStep(3); // Tem credenciais, precisa configurar webhook
        }
      }
    } catch (err) {
      console.error('Error loading connection status:', err);
      setError('Falha ao carregar status da conexão');
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithFacebook = () => {
    // Redirecionar para autenticação do Facebook Business
    const clientId = credentials.appId || 'YOUR_APP_ID';
    const redirectUri = encodeURIComponent(`${window.location.origin}/whatsapp/callback`);
    const scope = encodeURIComponent('whatsapp_business_management,whatsapp_business_messaging');
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    
    window.open(authUrl, 'facebook-auth', 'width=600,height=600');
  };

  const loadBusinessAccounts = async () => {
    if (!credentials.accessToken) {
      setError('Access Token é necessário');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${credentials.accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        setBusinessAccounts(data.data || []);
        
        if (data.data && data.data.length > 0) {
          setStep(3);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Falha ao carregar contas business');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contas business');
    } finally {
      setTesting(false);
    }
  };

  const loadPhoneNumbers = async (businessAccountId: string) => {
    setTesting(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${businessAccountId}/phone_numbers?access_token=${credentials.accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.data || []);
        
        setCredentials(prev => ({
          ...prev,
          businessAccountId
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Falha ao carregar números');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar números');
    } finally {
      setTesting(false);
    }
  };

  const selectPhoneNumber = async (phoneNumberId: string, displayPhoneNumber: string) => {
    setCredentials(prev => ({
      ...prev,
      phoneNumberId
    }));

    setConnectionStatus(prev => ({
      ...prev,
      phoneNumber: displayPhoneNumber
    }));

    setStep(4); // Avançar para configuração do webhook
  };

  const testConnection = async () => {
    if (!credentials.accessToken || !credentials.phoneNumberId) {
      setError('Preencha o Access Token e Phone Number ID');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // Testar conexão com a API do WhatsApp
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}?access_token=${credentials.accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: true,
          phoneNumber: data.display_phone_number,
          businessName: data.name,
          verificationStatus: data.verified_name ? 'verified' : 'pending'
        }));

        setStep(4); // Avançar para configuração do webhook
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Falha na conexão');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao testar conexão');
      setConnectionStatus(prev => ({ ...prev, isConnected: false, error: err.message }));
    } finally {
      setTesting(false);
    }
  };

  const configureWebhook = async () => {
    if (!credentials.phoneNumberId || !credentials.accessToken) {
      setError('Credenciais incompletas');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
      
      // Configurar webhook via API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/webhooks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            callback_url: webhookUrl,
            verify_token: credentials.webhookVerifyToken,
            fields: ['messages']
          })
        }
      );

      if (response.ok) {
        setStep(5); // Configuração completa
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Falha ao configurar webhook');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao configurar webhook');
    } finally {
      setSaving(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          phone_number: credentials.phoneNumberId,
          api_key: credentials.accessToken,
          webhook_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`,
          status: connectionStatus.isConnected ? 'active' : 'inactive',
          settings: {
            business_account_id: credentials.businessAccountId,
            app_id: credentials.appId,
            app_secret: credentials.appSecret,
            webhook_verify_token: credentials.webhookVerifyToken,
            business_name: connectionStatus.businessName,
            verification_status: connectionStatus.verificationStatus,
            display_phone_number: connectionStatus.phoneNumber
          }
        });

      if (error) throw error;

      setStep(5); // Configuração completa
      alert('Configuração salva com sucesso!');
    } catch (err) {
      setError('Falha ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    alert('URL do webhook copiada!');
  };

  const copyVerifyToken = () => {
    navigator.clipboard.writeText(credentials.webhookVerifyToken);
    alert('Verify token copiado!');
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
        title="Conexão WhatsApp Business"
        subtitle="Configure a integração oficial com a Meta API"
        icon={<Phone className="w-6 h-6 text-green-600" />}
        showBackButton={true}
        backTo="/whatsapp"
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

      {/* Connection Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${
              connectionStatus.isConnected ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Phone className={`w-6 h-6 ${
                connectionStatus.isConnected ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="font-medium">
                {connectionStatus.isConnected ? 'Conectado' : 'Não Conectado'}
              </h3>
              {connectionStatus.phoneNumber && (
                <p className="text-sm text-gray-600">{connectionStatus.phoneNumber}</p>
              )}
              {connectionStatus.businessName && (
                <p className="text-sm text-gray-600">{connectionStatus.businessName}</p>
              )}
            </div>
          </div>
          
          {connectionStatus.isConnected && (
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm ${
                connectionStatus.verificationStatus === 'verified' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {connectionStatus.verificationStatus === 'verified' ? 'Verificado' : 'Pendente'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Setup Steps */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-6">Processo de Integração Oficial</h3>
        
        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <React.Fragment key={stepNumber}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= stepNumber 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > stepNumber ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  stepNumber
                )}
              </div>
              {stepNumber < 5 && (
                <div className={`flex-1 h-1 mx-4 ${
                  step > stepNumber ? 'bg-indigo-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Passo 1: Configurar Facebook Business Manager
              </h4>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h5 className="font-medium text-blue-800">Criar Conta Business</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Acesse o <a href="https://business.facebook.com" target="_blank" className="underline font-medium">Facebook Business Manager</a> e crie uma conta business se ainda não tiver.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h5 className="font-medium text-blue-800">Adicionar WhatsApp Business</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        No Business Manager, vá em "Contas" → "WhatsApp Accounts" → "Adicionar" e conecte sua conta WhatsApp Business.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h5 className="font-medium text-blue-800">Verificar Número</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Certifique-se de que seu número WhatsApp Business está verificado e aprovado pela Meta.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Business Manager Configurado
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Facebook className="w-5 h-5 mr-2 text-blue-600" />
                Passo 2: Criar App no Meta for Developers
              </h4>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h5 className="font-medium text-blue-800">Criar App</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Acesse <a href="https://developers.facebook.com/apps" target="_blank" className="underline font-medium">Meta for Developers</a> e clique em "Create App" → "Business".
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h5 className="font-medium text-blue-800">Adicionar WhatsApp</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        No seu app, adicione o produto "WhatsApp Business Platform" e configure as permissões.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h5 className="font-medium text-blue-800">Obter Credenciais</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Anote o App ID e App Secret (Settings → Basic) e gere um Access Token permanente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    App ID *
                  </label>
                  <input
                    type="text"
                    value={credentials.appId}
                    onChange={(e) => setCredentials({
                      ...credentials,
                      appId: e.target.value
                    })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Seu App ID do Meta"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token *
                  </label>
                  <div className="relative">
                    <input
                      type={showTokens ? "text" : "password"}
                      value={credentials.accessToken}
                      onChange={(e) => setCredentials({
                        ...credentials,
                        accessToken: e.target.value
                      })}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Permanent Access Token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens(!showTokens)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={loadBusinessAccounts}
                disabled={testing || !credentials.accessToken || !credentials.appId}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Conectar Business Manager
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                Passo 3: Selecionar Conta Business
              </h4>
              
              {businessAccounts.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Nenhuma conta business encontrada. Verifique se você tem acesso às contas no Business Manager.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {businessAccounts.map((account) => (
                    <div 
                      key={account.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadPhoneNumbers(account.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">{account.name}</h5>
                          <p className="text-sm text-gray-600">ID: {account.id}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={loadBusinessAccounts}
                disabled={testing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Recarregar Contas
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-indigo-600" />
                Passo 4: Selecionar Número WhatsApp
              </h4>
              
              {phoneNumbers.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Nenhum número WhatsApp encontrado nesta conta business. Adicione um número no Business Manager.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {phoneNumbers.map((phone) => (
                    <div 
                      key={phone.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectPhoneNumber(phone.id, phone.display_phone_number)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">{phone.display_phone_number}</h5>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Status: {phone.verified_name ? 'Verificado' : 'Pendente'}</span>
                            <span>Qualidade: {phone.quality_rating || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {phone.verified_name && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              Verificado
                            </span>
                          )}
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={() => loadPhoneNumbers(credentials.businessAccountId)}
                disabled={testing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Recarregar Números
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-medium text-green-800 mb-2">
                WhatsApp Business Conectado!
              </h4>
              <p className="text-sm text-green-700">
                Sua integração oficial está ativa e pronta para receber mensagens.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Informações da Conta</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Número:</span>
                    <span className="font-medium">{connectionStatus.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business:</span>
                    <span className="font-medium">{connectionStatus.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      connectionStatus.verificationStatus === 'verified' 
                        ? 'text-green-600' 
                        : 'text-yellow-600'
                    }`}>
                      {connectionStatus.verificationStatus === 'verified' ? 'Verificado' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">App ID:</span>
                    <span className="font-medium font-mono text-xs">{connectionStatus.appId}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Próximos Passos</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Teste enviando uma mensagem</li>
                  <li>• Configure templates de mensagem</li>
                  <li>• Ajuste horários de atendimento</li>
                  <li>• Monitore analytics em tempo real</li>
                  <li>• Configure guardrails de segurança</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.open('/whatsapp?tab=test', '_blank')}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Testar Integração
              </button>
              
              <button
                onClick={() => window.open('/whatsapp?tab=settings', '_blank')}
                className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Settings className="w-5 h-5 mr-2" />
                Configurações
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Webhook Configuration (Step 4) */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="font-medium mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-indigo-600" />
            Passo 4: Configurar Webhook (Automático)
          </h4>
          
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h5 className="font-medium text-indigo-800 mb-2">Configuração Automática:</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-indigo-700 mb-1">
                    Callback URL (será configurada automaticamente)
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-white border rounded text-sm">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                    </code>
                    <button
                      onClick={copyWebhookUrl}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-700 mb-1">
                    Verify Token
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-white border rounded text-sm">
                      {credentials.webhookVerifyToken}
                    </code>
                    <button
                      onClick={copyVerifyToken}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={configureWebhook}
                disabled={saving}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Configurar Webhook
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Important Information */}
      <div className="bg-yellow-50 p-6 rounded-lg border">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Requisitos Importantes</h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-1">
              <p>• <strong>Conta Business Verificada:</strong> Sua conta WhatsApp Business deve estar verificada pela Meta</p>
              <p>• <strong>Aprovação da API:</strong> Solicite acesso à WhatsApp Business API no Business Manager</p>
              <p>• <strong>Número Dedicado:</strong> Use um número exclusivo para a API (não pode ser usado no app móvel)</p>
              <p>• <strong>Compliance:</strong> Siga as políticas de uso da Meta para evitar suspensão</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {connectionStatus.isConnected && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.open('/whatsapp?tab=test', '_blank')}
              className="flex items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
            >
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              <span>Testar Mensagem</span>
            </button>
            
            <button
              onClick={() => window.open('/whatsapp?tab=settings', '_blank')}
              className="flex items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
            >
              <Settings className="w-5 h-5 mr-2 text-gray-600" />
              <span>Configurações</span>
            </button>
            
            <button
              onClick={() => window.open('/whatsapp?tab=analytics', '_blank')}
              className="flex items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
            >
              <BarChart2 className="w-5 h-5 mr-2 text-purple-600" />
              <span>Ver Analytics</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}