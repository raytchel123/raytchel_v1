import React, { useState } from 'react';
import { 
  Diamond, 
  TrendingUp, 
  Settings, 
  GitBranch,
  Calculator,
  Calendar,
  Upload,
  BarChart2,
  Shield
} from 'lucide-react';
import { SnapshotManager } from './SnapshotManager';
import { FlowBuilder } from './FlowBuilder';
import { SalesFunnel } from './SalesFunnel';
import { QuoteCalculator } from './QuoteCalculator';
import { AppointmentManager } from './AppointmentManager';
import { GuardrailsManager } from '../admin/GuardrailsManager';
import { UsageMonitor } from '../admin/UsageMonitor';
import { PageHeader } from '../common/PageHeader';

export function MVPDashboard() {
  const [activeTab, setActiveTab] = useState('funnel');

  const tabs = [
    {
      id: 'funnel',
      label: 'Funil de Vendas',
      icon: <TrendingUp className="w-4 h-4" />,
      component: <SalesFunnel />
    },
    {
      id: 'flows',
      label: 'Editor de Fluxos',
      icon: <GitBranch className="w-4 h-4" />,
      component: <FlowBuilder />
    },
    {
      id: 'quotes',
      label: 'Calculadora',
      icon: <Calculator className="w-4 h-4" />,
      component: <QuoteCalculator />
    },
    {
      id: 'appointments',
      label: 'Agendamentos',
      icon: <Calendar className="w-4 h-4" />,
      component: <AppointmentManager />
    },
    {
      id: 'publish',
      label: 'Publicação',
      icon: <Upload className="w-4 h-4" />,
      component: <SnapshotManager />
    },
    {
      id: 'guardrails',
      label: 'Guardrails',
      icon: <Shield className="w-4 h-4" />,
      component: <GuardrailsManager />
    },
    {
      id: 'usage',
      label: 'Uso & Limites',
      icon: <BarChart2 className="w-4 h-4" />,
      component: <UsageMonitor />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="MVP Admin"
        subtitle="Painel de Gestão de Vendas da Zaffira"
        icon={<Diamond className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Sistema Ativo
            </span>
          </div>
        }
      />

      {/* Navigation */}
      <div className="bg-white border-b px-6">
        <nav className="flex space-x-8 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="p-6">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </main>
    </div>
  );
}