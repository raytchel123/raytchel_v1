import React from 'react';
import { 
  MessageSquare, 
  Users, 
  BarChart2,
  Clock,
  X
} from 'lucide-react';

interface WidgetProps {
  type: 'conversations' | 'team' | 'metrics';
  onRemove?: () => void;
}

export function DashboardWidget({ type, onRemove }: WidgetProps) {
  const renderContent = () => {
    switch (type) {
      case 'conversations':
        return (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
              Atendimentos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-gray-500">Ativos</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">1.2min</p>
                <p className="text-sm text-gray-500">Tempo Médio</p>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Equipe
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Ana Silva', status: 'online', chats: 3 },
                { name: 'João Santos', status: 'busy', chats: 5 },
                { name: 'Maria Costa', status: 'offline', chats: 0 }
              ].map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      agent.status === 'online' ? 'bg-green-500' :
                      agent.status === 'busy' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm">{agent.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {agent.chats} chats
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'metrics':
        return (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center">
              <BarChart2 className="w-5 h-5 mr-2 text-purple-600" />
              Métricas
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Taxa de Conversão</span>
                  <span className="font-medium">32%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '32%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Satisfação</span>
                  <span className="font-medium">94%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm relative">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {renderContent()}
    </div>
  );
}