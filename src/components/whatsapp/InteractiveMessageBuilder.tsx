import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  MessageSquare, 
  List, 
  MousePointer,
  Save,
  Eye,
  Send
} from 'lucide-react';
import { WhatsAppFallbackService } from '../../lib/whatsappFallback';

interface InteractiveMessageBuilderProps {
  onSend: (message: any) => Promise<void>;
  onClose: () => void;
}

export function InteractiveMessageBuilder({ onSend, onClose }: InteractiveMessageBuilderProps) {
  const [messageType, setMessageType] = useState<'buttons' | 'list'>('buttons');
  const [messageText, setMessageText] = useState('');
  const [buttons, setButtons] = useState([{ id: '', title: '' }]);
  const [listTitle, setListTitle] = useState('');
  const [listRows, setListRows] = useState([{ id: '', title: '', description: '' }]);
  const [preview, setPreview] = useState('');

  const addButton = () => {
    if (buttons.length < 3) { // WhatsApp limit
      setButtons([...buttons, { id: '', title: '' }]);
    }
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  const addListRow = () => {
    if (listRows.length < 10) { // WhatsApp limit
      setListRows([...listRows, { id: '', title: '', description: '' }]);
    }
  };

  const removeListRow = (index: number) => {
    setListRows(listRows.filter((_, i) => i !== index));
  };

  const updateListRow = (index: number, field: string, value: string) => {
    const newRows = [...listRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setListRows(newRows);
  };

  const generatePreview = () => {
    if (messageType === 'buttons') {
      const fallback = WhatsAppFallbackService.generateButtonFallback(messageText, buttons);
      setPreview(fallback);
    } else {
      const fallback = WhatsAppFallbackService.generateListFallback(messageText, {
        title: listTitle,
        rows: listRows
      });
      setPreview(fallback);
    }
  };

  const handleSend = async () => {
    try {
      if (messageType === 'buttons') {
        const validButtons = buttons.filter(btn => btn.id && btn.title);
        if (validButtons.length === 0) {
          alert('Adicione pelo menos um botão válido');
          return;
        }
        
        await onSend({
          type: 'interactive_buttons',
          text: messageText,
          buttons: validButtons
        });
      } else {
        const validRows = listRows.filter(row => row.id && row.title);
        if (validRows.length === 0) {
          alert('Adicione pelo menos uma opção válida');
          return;
        }
        
        await onSend({
          type: 'interactive_list',
          text: messageText,
          list: {
            title: listTitle,
            rows: validRows
          }
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error sending interactive message:', error);
      alert('Erro ao enviar mensagem interativa');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Criar Mensagem Interativa</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Type Selector */}
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setMessageType('buttons')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                messageType === 'buttons'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MousePointer className="w-4 h-4 mr-2" />
              Botões (até 3)
            </button>
            <button
              onClick={() => setMessageType('list')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                messageType === 'list'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Lista (até 10)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Builder */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto da Mensagem
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Digite o texto da mensagem..."
                />
              </div>

              {messageType === 'buttons' ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Botões (máximo 3)
                    </label>
                    <button
                      onClick={addButton}
                      disabled={buttons.length >= 3}
                      className="flex items-center px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {buttons.map((button, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={button.id}
                          onChange={(e) => updateButton(index, 'id', e.target.value)}
                          placeholder="ID do botão"
                          className="w-1/3 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={button.title}
                          onChange={(e) => updateButton(index, 'title', e.target.value)}
                          placeholder="Texto do botão (máx 20 chars)"
                          maxLength={20}
                          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => removeButton(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título da Lista
                    </label>
                    <input
                      type="text"
                      value={listTitle}
                      onChange={(e) => setListTitle(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Opções Disponíveis"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Opções da Lista (máximo 10)
                      </label>
                      <button
                        onClick={addListRow}
                        disabled={listRows.length >= 10}
                        className="flex items-center px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {listRows.map((row, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={row.id}
                              onChange={(e) => updateListRow(index, 'id', e.target.value)}
                              placeholder="ID"
                              className="w-1/4 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={row.title}
                              onChange={(e) => updateListRow(index, 'title', e.target.value)}
                              placeholder="Título (máx 24 chars)"
                              maxLength={24}
                              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => removeListRow(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updateListRow(index, 'description', e.target.value)}
                            placeholder="Descrição (máx 72 chars)"
                            maxLength={72}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Preview</h4>
                <button
                  onClick={generatePreview}
                  className="flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Gerar Preview
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="bg-white p-4 rounded-lg shadow-sm max-w-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium">Zaffira</span>
                  </div>
                  
                  {messageText && (
                    <p className="text-sm mb-3">{messageText}</p>
                  )}
                  
                  {messageType === 'buttons' ? (
                    <div className="space-y-2">
                      {buttons.filter(btn => btn.title).map((button, index) => (
                        <button
                          key={index}
                          className="w-full p-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm hover:bg-indigo-50"
                        >
                          {button.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <div className="p-2 bg-gray-100 border-b">
                        <span className="text-sm font-medium">{listTitle || 'Lista'}</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {listRows.filter(row => row.title).map((row, index) => (
                          <div key={index} className="p-2 border-b last:border-b-0 hover:bg-gray-50">
                            <div className="text-sm font-medium">{row.title}</div>
                            {row.description && (
                              <div className="text-xs text-gray-500">{row.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {preview && (
                <div>
                  <h5 className="font-medium mb-2">Fallback (Não-Meta)</h5>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{preview}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Send className="w-5 h-5 mr-2" />
              Enviar Mensagem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}