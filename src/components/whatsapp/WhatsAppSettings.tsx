import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Bot, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  Key,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/PageHeader';

export function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    phoneNumber: '',
    apiKey: '',
    webhookUrl: '',
    status: 'inactive',
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    },
    autoReply: true,
    autoReplyMessage: 'Olá! Obrigado por entrar em contato com a Zaffira Joalheria. Nosso horário de atendimento é de segunda a sábado, das 9h às 18h. Deixe sua mensagem e retornaremos assim que possível.',
    templates: [
      {
        name: 'welcome',
        content: 'Olá! Seja bem-vindo(a) à Zaffira Joalheria. Como posso ajudar você hoje? 💎'
      },
      {
        name: 'product_inquiry',
        content: 'Temos diversas opções de {product_type}. Posso te mostrar algumas peças do nosso catálogo?'
      },
      {
        name: 'appointment',
        content: 'Ótimo! Podemos agendar uma visita para você conhecer nossas peças pessoalmente. Qual seria o melhor dia e horário para você?'
      }
    ]
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          ...settings,
          phoneNumber: data.phone_number,
          apiKey: data.api_key,
          webhookUrl: data.webhook_url,
          status: data.status,
          businessHours: data.business_hours,
          autoReply: data.auto_reply
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Falha ao carregar configurações');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({
          phone_number: settings.phoneNumber,
          api_key: settings.apiKey,
          webhook_url: settings.webhookUrl,
          status: settings.status,
          business_hours: settings.businessHours,
          auto_reply: settings.autoReply
        });

      if (error) throw error;
      
      setSaving(false);
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Falha ao salvar configurações');
      setSaving(false);
    }
  };

  const handleTemplateChange = (index: number, field: string, value: string) => {
    const newTemplates = [...settings.templates];
    newTemplates[index] = {
      ...newTemplates[index],
      [field]: value
    };
    
    setSettings({
      ...settings,
      templates: newTemplates
    });
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
        title="Configurações do WhatsApp"
        subtitle="Configure integração e comportamento do WhatsApp Business"
        icon={<MessageSquare className="w-6 h-6 text-green-600" />}
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Configurações
              </>
            )}
          </button>
        }
        showBackButton={true}
        backTo="/whatsapp"
      />

      {error && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* WhatsApp API Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
          Configuração da API
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do WhatsApp Business
            </label>
            <input
              type="text"
              value={settings.phoneNumber}
              onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="+5511999999999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="flex">
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="flex-1 p-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button className="px-4 py-2 bg-gray-100 border-t border-r border-b rounded-r-lg hover:bg-gray-200">
                <Key className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL do Webhook
            </label>
            <input
              type="text"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="https://seu-dominio.com/api/whatsapp/webhook"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.status === 'active'}
              onChange={(e) => setSettings({ 
                ...settings, 
                status: e.target.checked ? 'active' : 'inactive' 
              })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Ativar integração</span>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-indigo-600" />
          Horário de Atendimento
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Início
              </label>
              <input
                type="time"
                value={settings.businessHours.start}
                onChange={(e) => setSettings({
                  ...settings,
                  businessHours: { ...settings.businessHours, start: e.target.value }
                })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Término
              </label>
              <input
                type="time"
                value={settings.businessHours.end}
                onChange={(e) => setSettings({
                  ...settings,
                  businessHours: { ...settings.businessHours, end: e.target.value }
                })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoReply}
              onChange={(e) => setSettings({ ...settings, autoReply: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Resposta automática fora do horário</span>
          </div>

          {settings.autoReply && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Resposta Automática
              </label>
              <textarea
                value={settings.autoReplyMessage}
                onChange={(e) => setSettings({ ...settings, autoReplyMessage: e.target.value })}
                rows={4}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Message Templates */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-indigo-600" />
          Templates de Mensagem
        </h3>
        
        <div className="space-y-4">
          {settings.templates.map((template, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Template
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => handleTemplateChange(index, 'name', e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo
                </label>
                <textarea
                  value={template.content}
                  onChange={(e) => handleTemplateChange(index, 'content', e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Importante</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Para usar o WhatsApp Business API, você precisa:
                <br />
                1. Ter uma conta Business verificada
                <br />
                2. Solicitar acesso à API do WhatsApp
                <br />
                3. Configurar um webhook para receber mensagens
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}