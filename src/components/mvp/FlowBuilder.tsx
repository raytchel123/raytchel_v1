import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Play, 
  GitBranch, 
  MessageSquare,
  HelpCircle,
  Zap,
  Square,
  ArrowRight,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';
import { useMVPStore } from '../../stores/mvpStore';
import { PageHeader } from '../common/PageHeader';

interface FlowNode {
  id: string;
  type: 'start' | 'message' | 'ask' | 'action' | 'condition' | 'end';
  position: { x: number; y: number };
  text?: string;
  options?: Array<{ label: string; goTo: string }>;
  action?: string;
  template_id?: string;
  goTo?: string;
  conditions?: Array<{ field: string; op: string; value: any; goTo: string }>;
  metadata?: Record<string, any>;
}

interface Flow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  start: string;
}

export function FlowBuilder() {
  const { currentSnapshot, publishSnapshot } = useMVPStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (currentSnapshot?.flows) {
      setFlows(currentSnapshot.flows);
      if (currentSnapshot.flows.length > 0 && !selectedFlow) {
        setSelectedFlow(currentSnapshot.flows[0]);
      }
    }
  }, [currentSnapshot]);

  const addNode = (type: FlowNode['type']) => {
    if (!selectedFlow) return;

    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 300 },
      ...(type === 'message' && { text: 'Nova mensagem' }),
      ...(type === 'ask' && { text: 'Pergunta?', options: [] }),
      ...(type === 'action' && { action: 'send_template' }),
      ...(type === 'condition' && { conditions: [] })
    };

    const updatedFlow = {
      ...selectedFlow,
      nodes: [...selectedFlow.nodes, newNode]
    };

    setSelectedFlow(updatedFlow);
    setSelectedNode(newNode);
    setIsDirty(true);
  };

  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    if (!selectedFlow) return;

    const updatedFlow = {
      ...selectedFlow,
      nodes: selectedFlow.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    };

    setSelectedFlow(updatedFlow);
    setIsDirty(true);

    if (selectedNode?.id === nodeId) {
      setSelectedNode({ ...selectedNode, ...updates });
    }
  };

  const deleteNode = (nodeId: string) => {
    if (!selectedFlow || nodeId === selectedFlow.start) return;

    const updatedFlow = {
      ...selectedFlow,
      nodes: selectedFlow.nodes.filter(node => node.id !== nodeId)
    };

    setSelectedFlow(updatedFlow);
    setIsDirty(true);

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const saveFlow = async () => {
    if (!selectedFlow || !currentSnapshot) return;

    const updatedFlows = flows.map(f => 
      f.id === selectedFlow.id ? selectedFlow : f
    );

    const updatedSnapshot = {
      ...currentSnapshot,
      flows: updatedFlows
    };

    const success = await publishSnapshot(updatedSnapshot);
    if (success) {
      setIsDirty(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start': return '🚀';
      case 'message': return '💬';
      case 'ask': return '❓';
      case 'action': return '⚡';
      case 'condition': return '🔀';
      case 'end': return '🏁';
      default: return '📦';
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-green-100 border-green-300 text-green-800';
      case 'message': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'ask': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'action': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'condition': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'end': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editor de Fluxos"
        subtitle="Construa fluxos de atendimento para joalheria"
        icon={<GitBranch className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            {isDirty && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                Não salvo
              </span>
            )}
            <button
              onClick={() => setShowSimulation(true)}
              disabled={!selectedFlow}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Simular
            </button>
            <button
              onClick={saveFlow}
              disabled={!isDirty || !selectedFlow}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar & Publicar
            </button>
          </div>
        }
        showBackButton={true}
        backTo="/mvp"
      />

      {/* Flow Selection */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <select
            value={selectedFlow?.id || ''}
            onChange={(e) => {
              const flow = flows.find(f => f.id === e.target.value);
              setSelectedFlow(flow || null);
              setSelectedNode(null);
            }}
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecione um fluxo</option>
            {flows.map(flow => (
              <option key={flow.id} value={flow.id}>
                {flow.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedFlow && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium mb-4">Adicionar Nós</h3>
            <div className="space-y-2">
              <button
                onClick={() => addNode('message')}
                className="w-full flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Mensagem
              </button>
              <button
                onClick={() => addNode('ask')}
                className="w-full flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Pergunta
              </button>
              <button
                onClick={() => addNode('action')}
                className="w-full flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Ação
              </button>
              <button
                onClick={() => addNode('condition')}
                className="w-full flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Condição
              </button>
              <button
                onClick={() => addNode('end')}
                className="w-full flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                <Square className="w-4 h-4 mr-2" />
                Fim
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-medium">{selectedFlow.name}</h3>
              <p className="text-sm text-gray-600">{selectedFlow.description}</p>
            </div>
            
            <div className="relative h-96 overflow-auto bg-gray-50">
              {selectedFlow.nodes.map((node) => (
                <div
                  key={node.id}
                  className={`absolute w-40 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    getNodeColor(node.type)
                  } ${selectedNode?.id === node.id ? 'ring-2 ring-indigo-500' : ''}`}
                  style={{
                    left: node.position.x,
                    top: node.position.y
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">{getNodeIcon(node.type)}</span>
                      <span className="text-xs font-medium capitalize">{node.type}</span>
                    </div>
                    {node.id !== selectedFlow.start && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    )}
                  </div>
                  
                  <div className="text-xs">
                    <p className="font-medium">{node.id}</p>
                    {node.text && (
                      <p className="mt-1 truncate" title={node.text}>
                        {node.text.substring(0, 30)}...
                      </p>
                    )}
                    {node.goTo && (
                      <div className="flex items-center mt-1 text-gray-600">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        <span>{node.goTo}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium mb-4">Propriedades</h3>
            
            {selectedNode ? (
              <NodePropertiesPanel
                node={selectedNode}
                availableNodes={selectedFlow.nodes.filter(n => n.id !== selectedNode.id)}
                onUpdate={(updates) => updateNode(selectedNode.id, updates)}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Selecione um nó para editar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Simulation Modal */}
      {showSimulation && selectedFlow && (
        <FlowSimulationModal
          flow={selectedFlow}
          onClose={() => setShowSimulation(false)}
        />
      )}
    </div>
  );
}

interface NodePropertiesPanelProps {
  node: FlowNode;
  availableNodes: FlowNode[];
  onUpdate: (updates: Partial<FlowNode>) => void;
}

function NodePropertiesPanel({ node, availableNodes, onUpdate }: NodePropertiesPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ID do Nó
        </label>
        <input
          type="text"
          value={node.id}
          onChange={(e) => onUpdate({ id: e.target.value })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo
        </label>
        <select
          value={node.type}
          onChange={(e) => onUpdate({ type: e.target.value as FlowNode['type'] })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          <option value="start">Início</option>
          <option value="message">Mensagem</option>
          <option value="ask">Pergunta</option>
          <option value="action">Ação</option>
          <option value="condition">Condição</option>
          <option value="end">Fim</option>
        </select>
      </div>

      {(node.type === 'message' || node.type === 'ask') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texto
          </label>
          <textarea
            value={node.text || ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="Digite o texto da mensagem..."
          />
        </div>
      )}

      {node.type === 'ask' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opções
          </label>
          <div className="space-y-2">
            {(node.options || []).map((option, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => {
                    const newOptions = [...(node.options || [])];
                    newOptions[index] = { ...option, label: e.target.value };
                    onUpdate({ options: newOptions });
                  }}
                  placeholder="Rótulo"
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <select
                  value={option.goTo}
                  onChange={(e) => {
                    const newOptions = [...(node.options || [])];
                    newOptions[index] = { ...option, goTo: e.target.value };
                    onUpdate({ options: newOptions });
                  }}
                  className="w-20 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">→</option>
                  {availableNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id}</option>
                  ))}
                </select>
              </div>
            ))}
            <button
              onClick={() => {
                const newOptions = [...(node.options || []), { label: '', goTo: '' }];
                onUpdate({ options: newOptions });
              }}
              className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-sm text-gray-600"
            >
              + Adicionar Opção
            </button>
          </div>
        </div>
      )}

      {node.type === 'action' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ação
            </label>
            <select
              value={node.action || ''}
              onChange={(e) => onUpdate({ action: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Selecione...</option>
              <option value="send_template">Enviar Template</option>
              <option value="calculate_quote">Calcular Orçamento</option>
              <option value="trigger_event">Disparar Evento</option>
              <option value="request_handoff">Solicitar Handoff</option>
            </select>
          </div>

          {node.action === 'send_template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template ID
              </label>
              <select
                value={node.template_id || ''}
                onChange={(e) => onUpdate({ template_id: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Selecione...</option>
                <option value="t_models">Modelos</option>
                <option value="t_material">Material</option>
                <option value="t_agendar">Agendar</option>
                <option value="t_orcamento">Orçamento</option>
              </select>
            </div>
          )}
        </div>
      )}

      {(node.type === 'message' || node.type === 'action') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Próximo Nó
          </label>
          <select
            value={node.goTo || ''}
            onChange={(e) => onUpdate({ goTo: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">Selecione...</option>
            {availableNodes.map(n => (
              <option key={n.id} value={n.id}>{n.id}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

interface FlowSimulationModalProps {
  flow: Flow;
  onClose: () => void;
}

function FlowSimulationModal({ flow, onClose }: FlowSimulationModalProps) {
  const [currentNodeId, setCurrentNodeId] = useState(flow.start);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [sessionData, setSessionData] = useState<Record<string, any>>({});

  const currentNode = flow.nodes.find(n => n.id === currentNodeId);

  const processUserInput = () => {
    if (!userInput.trim() || !currentNode) return;

    const log = [...simulationLog, `👤 Usuário: ${userInput}`];
    
    // Simular processamento baseado no tipo do nó
    if (currentNode.type === 'ask' && currentNode.options) {
      const selectedOption = currentNode.options.find(opt => 
        opt.label.toLowerCase().includes(userInput.toLowerCase()) ||
        userInput === (currentNode.options?.indexOf(opt) + 1).toString()
      );
      
      if (selectedOption && selectedOption.goTo) {
        setCurrentNodeId(selectedOption.goTo);
        log.push(`🤖 Sistema: Opção "${selectedOption.label}" selecionada`);
        
        // Salvar dados da sessão
        setSessionData(prev => ({
          ...prev,
          [currentNode.id]: selectedOption.label
        }));
      } else {
        log.push(`🤖 Sistema: Opção não reconhecida. Tente novamente.`);
      }
    } else if (currentNode.goTo) {
      setCurrentNodeId(currentNode.goTo);
      log.push(`🤖 Sistema: Avançando para próximo passo`);
    }

    setSimulationLog(log);
    setUserInput('');
  };

  const resetSimulation = () => {
    setCurrentNodeId(flow.start);
    setSimulationLog([]);
    setUserInput('');
    setSessionData({});
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Simulação: {flow.name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Current Node */}
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-medium text-indigo-800">
                Nó Atual: {currentNode?.id}
              </h4>
              {currentNode?.text && (
                <p className="text-sm text-indigo-700 mt-1">{currentNode.text}</p>
              )}
              {currentNode?.type === 'ask' && currentNode.options && (
                <div className="mt-2 space-y-1">
                  {currentNode.options.map((option, index) => (
                    <div key={index} className="text-xs text-indigo-600">
                      {index + 1}. {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session Data */}
            {Object.keys(sessionData).length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Dados Coletados</h4>
                <div className="space-y-1">
                  {Object.entries(sessionData).map(([key, value]) => (
                    <div key={key} className="text-xs text-green-700">
                      <strong>{key}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Log */}
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <h4 className="font-medium mb-2">Log da Conversa</h4>
              {simulationLog.length === 0 ? (
                <p className="text-sm text-gray-500">Inicie a simulação digitando uma mensagem</p>
              ) : (
                <div className="space-y-1">
                  {simulationLog.map((entry, index) => (
                    <p key={index} className="text-sm">{entry}</p>
                  ))}
                </div>
              )}
            </div>

            {/* User Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && processUserInput()}
                placeholder="Digite uma mensagem ou número da opção..."
                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                onClick={processUserInput}
                disabled={!userInput.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>

            <button
              onClick={resetSimulation}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Reiniciar Simulação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}