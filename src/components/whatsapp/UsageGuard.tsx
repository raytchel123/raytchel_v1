import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { UsageService, ActionCheck } from '../../lib/usageService';

interface UsageGuardProps {
  tenantId: string;
  actionType: 'send_whatsapp' | 'send_template' | 'generate_quote' | 'create_appointment' | 'request_handoff';
  onCanProceed: () => void;
  onBlocked: (message: string) => void;
  children: React.ReactNode;
}

export function UsageGuard({ 
  tenantId, 
  actionType, 
  onCanProceed, 
  onBlocked, 
  children 
}: UsageGuardProps) {
  const [checking, setChecking] = useState(false);
  const [actionCheck, setActionCheck] = useState<ActionCheck | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const usageService = UsageService.getInstance();

  const checkUsageLimit = async () => {
    setChecking(true);
    try {
      const check = await usageService.canPerformAction(tenantId, actionType);
      setActionCheck(check);
      
      if (check.can_proceed) {
        onCanProceed();
      } else {
        setShowBlockModal(true);
        onBlocked(check.block_message || 'Limite de uso atingido');
      }
    } catch (error) {
      console.error('Error checking usage limit:', error);
      onBlocked('Erro ao verificar limite de uso');
    } finally {
      setChecking(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    checkUsageLimit();
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'send_whatsapp': 'Mensagens WhatsApp',
      'send_template': 'Templates',
      'generate_quote': 'Orçamentos',
      'create_appointment': 'Agendamentos',
      'request_handoff': 'Transferências'
    };
    return labels[actionType] || actionType;
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {checking ? (
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-500 mr-2" />
            <span className="text-sm text-gray-600">Verificando limite...</span>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && actionCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-red-900">Limite Atingido</h3>
                  <p className="text-sm text-red-700">
                    {getActionLabel(actionType)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    {actionCheck.block_message}
                  </p>
                </div>

                {actionCheck.usage_info && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Detalhes do Uso:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Usado este mês:</span>
                        <span className="font-medium">{actionCheck.usage_info.current_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limite do plano:</span>
                        <span className="font-medium">{actionCheck.usage_info.limit_value}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Percentual:</span>
                        <span className="font-medium text-red-600">
                          {actionCheck.usage_info.percentage?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => window.open('mailto:suporte@zaffira.com?subject=Upgrade de Plano', '_blank')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Falar com a equipe
                  </button>
                  
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}