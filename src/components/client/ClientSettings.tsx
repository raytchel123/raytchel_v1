import React, { useState } from 'react';
import { 
  Bot,
  LayoutDashboard,
  MessageSquare,
  Users,
  Book,
  Settings,
  Lock,
  QrCode,
  Edit,
  Save,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: SettingsTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    id: 'atendimentos',
    label: 'Atendimentos',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    id: 'equipe',
    label: 'Equipe',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'conhecimento',
    label: 'Base de Conhecimento',
    icon: <Book className="w-5 h-5" />
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    icon: <Lock className="w-5 h-5" />
  }
];

export function ClientSettings() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiName, setAiName] = useState('Raytchel');
  const [showQRCode, setShowQRCode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie suas preferências e configurações do sistema"
        icon={<Settings className="w-6 h-6 text-indigo-600" />}
      />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    activeTab === tab.id ? 'bg-indigo-50' : 'bg-gray-50'
                  }`}>
                    {tab.icon}
                  </div>
                  <span className="ml-3">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    {/* AI Name Customization */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Bot className="w-5 h-5 mr-2 text-gray-500" />
                        Personalização da IA
                      </h3>
                      <div className="flex items-center space-x-4">
                        <input
                          type="text"
                          value={aiName}
                          onChange={(e) => setAiName(e.target.value)}
                          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nome da IA"
                        />
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Leads Atendidos</h4>
                        <p className="text-2xl font-bold">127</p>
                        <p className="text-sm text-green-600">+12% este mês</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Taxa de Conversão</h4>
                        <p className="text-2xl font-bold">32%</p>
                        <p className="text-sm text-green-600">+5% este mês</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Satisfação</h4>
                        <p className="text-2xl font-bold">4.8/5.0</p>
                        <p className="text-sm text-green-600">+0.2 este mês</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'seguranca' && (
                  <div className="space-y-6">
                    {/* Password Change */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Alterar Senha</h3>
                      <div className="space-y-4 max-w-md">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Senha Atual
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nova Senha
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Nova Senha
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                        </div>
                        <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                          Alterar Senha
                        </button>
                      </div>
                    </div>

                    {/* 2FA */}
                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Autenticação em Dois Fatores</h3>
                      {!showQRCode ? (
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <QrCode className="w-5 h-5 mr-2" />
                          Ativar 2FA
                        </button>
                      ) : (
                        <div className="space-y-4 max-w-md">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <img
                              src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=example"
                              alt="QR Code"
                              className="mx-auto"
                            />
                            <p className="text-sm text-center mt-2">
                              Escaneie o QR Code com seu aplicativo autenticador
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Código de Verificação
                            </label>
                            <input
                              type="text"
                              className="w-full p-2 border rounded-lg"
                              placeholder="000000"
                            />
                          </div>
                          <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            Confirmar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'equipe' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Gerenciar Equipe</h3>
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        Adicionar Operador
                      </button>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Limite do Plano</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>Você está utilizando 3 de 5 operadores disponíveis em seu plano.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        { name: 'João Silva', email: 'joao@email.com', role: 'Supervisor' },
                        { name: 'Maria Santos', email: 'maria@email.com', role: 'Operador' },
                        { name: 'Pedro Costa', email: 'pedro@email.com', role: 'Operador' }
                      ].map((user, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{user.role}</span>
                            <button className="p-2 text-gray-400 hover:text-gray-500">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'conhecimento' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Base de Conhecimento</h3>
                    
                    <div className="space-y-4">
                      {[
                        { title: 'Horário de Atendimento', category: 'Geral' },
                        { title: 'Formas de Pagamento', category: 'Financeiro' },
                        { title: 'Política de Cancelamento', category: 'Políticas' }
                      ].map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              <span className="text-sm text-gray-500">{item.category}</span>
                            </div>
                            <button className="text-indigo-600 hover:text-indigo-700">
                              Ver detalhes
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Sugerir Novo Tópico
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}