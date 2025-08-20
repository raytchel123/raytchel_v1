import React, { useState, useEffect } from 'react';
import { 
  Facebook, 
  Building2, 
  Smartphone, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Phone,
  Shield,
  Globe,
  Key
} from 'lucide-react';
import { WhatsAppMetaOfficial } from '../../lib/whatsappMetaOfficial';
import { PageHeader } from '../common/PageHeader';

export function WhatsAppBusinessSetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessAccounts, setBusinessAccounts] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedPhone, setSelectedPhone] = useState<any>(null);
  const [accessToken, setAccessToken] = useState('');
  const [appId, setAppId] = useState('');

  const whatsappMeta = WhatsAppMetaOfficial.getInstance();

  const steps = [
    {
      id: 1,
      title: 'Criar App Meta',
      description: 'Configure app no Meta for Developers',
      icon: <Facebook className="w-5 h-5" />
    },
    {
      id: 2,
      title: 'Autenticar Business',
      description: 'Conecte sua conta business',
      icon: <Building2 className="w-5 h-5" />
    },
    {
      id: 3,
      title: 'Selecionar Número',
      description: 'Escolha o número WhatsApp',
      icon: <Smartphone className="w-5 h-5" />
    },
    {
      id: 4,
      title: 'Configurar Webhook',
      description: 'Ativar recebimento de mensagens',
      icon: <Globe className="w-5 h-5" />
    },
    {
      id: 5,
      title: 'Finalizar',
      description: 'Integração completa',
      icon: <CheckCircle className="w-5 h-5" />
    }
  ];

  const loadBusinessAccounts = async () => {
    if (!accessToken) {
      setError('Access Token é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accounts = await whatsappMeta.getBusinessAccounts();
      setBusinessAccounts(accounts);
      
      if (accounts.length > 0) {
        setCurrentStep(3);
      } else {
        setError('Nenhuma conta business encontrada. Verifique suas permissões.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contas business');
    } finally {
      setLoading(false);
    }
  };

  const selectBusinessAccount = async (account: any) => {
    setSelectedBusiness(account);
    setLoading(true);

    try {
      const numbers = await whatsappMeta.getPhoneNumbers(account.id);
      setPhoneNumbers(numbers);
      
      if (numbers.length === 0) {
        setError('Nenhum número WhatsApp encontrado nesta conta. Adicione um número no Business Manager.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar números');
    } finally {
      setLoading(false);
    }
  };

  const selectPhoneNumber = (phone: any) => {
    setSelectedPhone(phone);
    setCurrentStep(4);
  };

  const completeSetup = async () => {
    if (!selectedPhone || !selectedBusiness) {
      setError('Selecione uma conta business e número');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Salvar configuração no banco
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          phone_number: selectedPhone.id,
          api_key: accessToken,
          webhook_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`,
          status: 'active',
          settings: {
            business_account_id: selectedBusiness.id,
            app_id: appId,
            business_name: selectedBusiness.name,
            display_phone_number: selectedPhone.display_phone_number,
            verified_name: selectedPhone.verified_name,
            quality_rating: selectedPhone.quality_rating
          }
        });

      if (error) throw error;

      setCurrentStep(5);
    } catch (err) {
      setError('Falha ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração WhatsApp Business"
        subtitle="Integração oficial com Facebook Business Manager"
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

      {/* Progress Steps */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                currentStep >= step.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`absolute top-6 w-24 h-1 ${
                  currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200'
                }`} style={{ left: `${(index + 1) * 20}%` }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Meta App Setup */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-4">Criar App no Meta for Developers</h4>
              <div className="space-y-3 text-sm text-blue-700">
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                  <p>Acesse <a href="https://developers.facebook.com/apps" target="_blank" className="underline font-medium">Meta for Developers</a></p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                  <p>Clique em "Create App" → "Business"</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                  <p>Adicione o produto "WhatsApp Business Platform"</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                  <p>Anote o App ID e gere um Access Token permanente</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App ID *
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Seu App ID do Meta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token *
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Permanent Access Token"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!appId || !accessToken}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Credenciais Configuradas
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Business Account Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                Conectar Conta Business
              </h4>
              
              <button
                onClick={loadBusinessAccounts}
                disabled={loading}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Carregando Contas...
                  </>
                ) : (
                  <>
                    <Facebook className="w-5 h-5 mr-2" />
                    Carregar Contas Business
                  </>
                )}
              </button>
            </div>

            {businessAccounts.length > 0 && (
              <div>
                <h5 className="font-medium mb-3">Selecione sua Conta Business:</h5>
                <div className="space-y-3">
                  {businessAccounts.map((account) => (
                    <div 
                      key={account.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectBusinessAccount(account)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h6 className="font-medium">{account.name}</h6>
                          <p className="text-sm text-gray-600">ID: {account.id}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Phone Number Selection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-indigo-600" />
                Selecionar Número WhatsApp
              </h4>
              
              {selectedBusiness && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm">
                    <strong>Conta Business:</strong> {selectedBusiness.name}
                  </p>
                </div>
              )}

              {phoneNumbers.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Nenhum número WhatsApp encontrado. Adicione um número no Business Manager.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {phoneNumbers.map((phone) => (
                    <div 
                      key={phone.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectPhoneNumber(phone)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h6 className="font-medium">{phone.display_phone_number}</h6>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Status: {phone.verified_name ? 'Verificado' : 'Pendente'}</span>
                            <span>Qualidade: {phone.quality_rating || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {phone.verified_name && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              ✓ Verificado
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
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Webhook Configuration */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-indigo-600" />
                Configuração do Webhook
              </h4>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h5 className="font-medium text-green-800 mb-3">Configuração Automática</h5>
                <p className="text-sm text-green-700 mb-4">
                  O webhook será configurado automaticamente. Você também pode configurar manualmente no Meta for Developers.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      Callback URL
                    </label>
                    <code className="block p-2 bg-white border rounded text-sm">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      Verify Token
                    </label>
                    <code className="block p-2 bg-white border rounded text-sm">
                      raytchel_webhook_2024
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      Webhook Fields
                    </label>
                    <code className="block p-2 bg-white border rounded text-sm">
                      messages
                    </code>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={completeSetup}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Finalizar Configuração
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Setup Complete */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-medium text-green-800 mb-2">
                Integração Concluída!
              </h4>
              <p className="text-sm text-green-700">
                Sua conta WhatsApp Business está conectada e pronta para uso.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Conta Conectada</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business:</span>
                    <span className="font-medium">{selectedBusiness?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Número:</span>
                    <span className="font-medium">{selectedPhone?.display_phone_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Ativo</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Recursos Disponíveis</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Envio e recebimento de mensagens</li>
                  <li>✓ Mensagens interativas (botões/listas)</li>
                  <li>✓ Templates aprovados pela Meta</li>
                  <li>✓ Mídia (imagens, documentos, áudio)</li>
                  <li>✓ Indicadores de leitura e digitação</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.open('/whatsapp?tab=test', '_blank')}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Phone className="w-5 h-5 mr-2" />
                Testar Agora
              </button>
              
              <button
                onClick={() => window.open('/whatsapp', '_blank')}
                className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Ir para Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="bg-yellow-50 p-6 rounded-lg border">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Requisitos da Meta</h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-1">
              <p>• <strong>Conta Business Verificada:</strong> Sua conta deve estar verificada e em boa situação</p>
              <p>• <strong>Número Dedicado:</strong> O número não pode ser usado simultaneamente no app móvel</p>
              <p>• <strong>Políticas de Uso:</strong> Siga as diretrizes da Meta para evitar suspensão</p>
              <p>• <strong>Templates Aprovados:</strong> Mensagens promocionais precisam de templates aprovados</p>
              <p>• <strong>Rate Limits:</strong> Respeite os limites de mensagens por segundo/minuto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}