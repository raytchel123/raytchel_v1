import React from 'react';
import { X, MessageSquare, Users, BarChart2 } from 'lucide-react';

interface AddWidgetModalProps {
  onClose: () => void;
  onAdd: (type: string) => void;
}

export function AddWidgetModal({ onClose, onAdd }: AddWidgetModalProps) {
  const widgets = [
    {
      id: 'conversations',
      title: 'Atendimentos',
      description: 'Monitoramento de conversas',
      icon: <MessageSquare className="w-5 h-5 text-indigo-600" />
    },
    {
      id: 'team',
      title: 'Equipe',
      description: 'Performance dos operadores',
      icon: <Users className="w-5 h-5 text-green-600" />
    },
    {
      id: 'metrics',
      title: 'Métricas',
      description: 'Indicadores personalizados',
      icon: <BarChart2 className="w-5 h-5 text-purple-600" />
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Adicionar Widget</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {widgets.map((widget) => (
            <button
              key={widget.id}
              onClick={() => {
                onAdd(widget.id);
                onClose();
              }}
              className="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center text-left"
            >
              <div className="p-2 bg-gray-100 rounded-lg mr-4">
                {widget.icon}
              </div>
              <div>
                <h4 className="font-medium">{widget.title}</h4>
                <p className="text-sm text-gray-500">{widget.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}