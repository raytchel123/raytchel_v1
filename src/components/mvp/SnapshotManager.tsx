import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  History, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  RotateCcw,
  Save,
  Play
} from 'lucide-react';
import { useMVPStore } from '../../stores/mvpStore';
import { formatDistanceToNow } from '../../utils/dateFormat';
import { PageHeader } from '../common/PageHeader';

export function SnapshotManager() {
  const {
    currentSnapshot,
    snapshotHistory,
    publishedVersion,
    loading,
    error,
    publishing,
    loadCurrentSnapshot,
    loadSnapshotHistory,
    publishSnapshot,
    rollbackSnapshot,
    clearError
  } = useMVPStore();

  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<any>(null);

  useEffect(() => {
    loadCurrentSnapshot();
    loadSnapshotHistory();
  }, []);

  const handlePublish = async () => {
    if (!currentSnapshot) return;
    
    const confirmed = confirm(
      'Tem certeza que deseja publicar esta configuração? Isso irá atualizar a IA em produção.'
    );
    
    if (!confirmed) return;
    
    const success = await publishSnapshot(currentSnapshot);
    if (success) {
      alert('Configuração publicada com sucesso!');
    }
  };

  const handleRollback = async (targetVersion: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja fazer rollback para a versão ${targetVersion}? Isso irá reverter todas as configurações.`
    );
    
    if (!confirmed) return;
    
    const success = await rollbackSnapshot(targetVersion);
    if (success) {
      alert('Rollback realizado com sucesso!');
    }
  };

  const formatSnapshotSize = (snapshot: any) => {
    const size = JSON.stringify(snapshot).length;
    return `${(size / 1024).toFixed(1)}KB`;
  };

  const getSnapshotStats = (snapshot: any) => {
    if (!snapshot) return { qna: 0, templates: 0, products: 0, triggers: 0 };
    
    return {
      qna: snapshot.qna?.length || 0,
      templates: snapshot.templates?.length || 0,
      products: snapshot.products?.length || 0,
      triggers: snapshot.triggers?.length || 0
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicação & Runtime Sync"
        subtitle="Gerencie versões e publique configurações para a IA"
        icon={<Upload className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </button>
          </div>
        }
        showBackButton={true}
        backTo="/mvp"
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

      {/* Current Snapshot Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium mb-2">Configuração Atual</h3>
            {currentSnapshot ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Versão: {publishedVersion || 'Não publicada'}</span>
                  <span>Tamanho: {formatSnapshotSize(currentSnapshot)}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  {Object.entries(getSnapshotStats(currentSnapshot)).map(([key, count]) => (
                    <span key={key} className="px-2 py-1 bg-gray-100 rounded-full">
                      {key}: {count}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma configuração carregada</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={loadCurrentSnapshot}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {currentSnapshot && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Publicar Configuração
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Snapshot History */}
      {showHistory && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium mb-4">Histórico de Versões</h3>
          
          {snapshotHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhuma versão encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {snapshotHistory.map((snapshot) => (
                <div key={snapshot.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{snapshot.version}</span>
                      {snapshot.is_active && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Ativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Criada {formatDistanceToNow(new Date(snapshot.created_at))}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {!snapshot.is_active && (
                      <button
                        onClick={() => handleRollback(snapshot.version)}
                        className="flex items-center px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded-lg"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshot Preview */}
      {showPreview && currentSnapshot && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Preview da Configuração</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Q&A Preview */}
            <div>
              <h4 className="font-medium mb-3 text-blue-600">Q&A ({currentSnapshot.qna?.length || 0})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentSnapshot.qna?.slice(0, 5).map((qa: any, index: number) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">{qa.question}</p>
                    <p className="text-xs text-gray-600 mt-1">{qa.answer.substring(0, 100)}...</p>
                    {qa.requires_guardrail && (
                      <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Guardrail
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Templates Preview */}
            <div>
              <h4 className="font-medium mb-3 text-green-600">Templates ({currentSnapshot.templates?.length || 0})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentSnapshot.templates?.slice(0, 5).map((template: any, index: number) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium">{template.name}</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        template.type === 'button' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {template.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {template.payload?.text || template.payload?.title || 'Template interativo'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Products Preview */}
            <div>
              <h4 className="font-medium mb-3 text-purple-600">Produtos ({currentSnapshot.products?.length || 0})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentSnapshot.products?.slice(0, 5).map((product: any, index: number) => (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      R$ {product.estimated_price?.min} - R$ {product.estimated_price?.max}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Triggers Preview */}
            <div>
              <h4 className="font-medium mb-3 text-orange-600">Triggers ({currentSnapshot.triggers?.length || 0})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentSnapshot.triggers?.slice(0, 5).map((trigger: any, index: number) => (
                  <div key={index} className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium">{trigger.id}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Evento: {trigger.event}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Status da Publicação</h3>
              <p className="text-sm text-gray-600">
                {publishedVersion ? `Versão ${publishedVersion} ativa` : 'Nenhuma versão publicada'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Sincronização</h3>
              <p className="text-sm text-gray-600">
                Runtime atualizado automaticamente
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Histórico</h3>
              <p className="text-sm text-gray-600">
                {snapshotHistory.length} versões salvas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      {currentSnapshot && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium mb-4">Resumo da Configuração Atual</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Q&A</span>
                <span className="text-lg font-bold text-blue-600">
                  {currentSnapshot.qna?.length || 0}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {currentSnapshot.qna?.filter((q: any) => q.requires_guardrail).length || 0} com guardrails
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Templates</span>
                <span className="text-lg font-bold text-green-600">
                  {currentSnapshot.templates?.length || 0}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {currentSnapshot.templates?.filter((t: any) => t.type === 'button').length || 0} botões, {' '}
                {currentSnapshot.templates?.filter((t: any) => t.type === 'list').length || 0} listas
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-800">Produtos</span>
                <span className="text-lg font-bold text-purple-600">
                  {currentSnapshot.products?.length || 0}
                </span>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Com preços estimados
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-800">Triggers</span>
                <span className="text-lg font-bold text-orange-600">
                  {currentSnapshot.triggers?.length || 0}
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Automações ativas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Publish Actions */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-indigo-900">Pronto para Publicar?</h3>
            <p className="text-sm text-indigo-700 mt-1">
              A publicação irá atualizar a IA em produção com as configurações atuais.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => clearError()}
              className="px-3 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"
            >
              Limpar Erros
            </button>
            
            <button
              onClick={handlePublish}
              disabled={!currentSnapshot || publishing}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publicar Agora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}