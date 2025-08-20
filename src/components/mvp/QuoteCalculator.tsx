import React, { useState } from 'react';
import { 
  Calculator, 
  Diamond, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react';
import { useMVPStore } from '../../stores/mvpStore';
import { formatCurrency } from '../../utils/formatters';
import { PageHeader } from '../common/PageHeader';

export function QuoteCalculator() {
  const { calculateQuote } = useMVPStore();
  const [quoteRequest, setQuoteRequest] = useState({
    product_type: '',
    specifications: {
      material: '',
      model: '',
      ring_size: '',
      budget_range: { min: 0, max: 0 },
      urgency: 'medium' as 'high' | 'medium' | 'low',
      occasion: ''
    }
  });
  
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!quoteRequest.product_type) {
      setError('Selecione um tipo de produto');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const result = await calculateQuote(quoteRequest);
      setQuoteResult(result);
      
      if (result.requires_handoff) {
        setError(`Handoff necessário: ${result.handoff_reason}`);
      }
    } catch (err) {
      setError('Erro ao calcular orçamento');
    } finally {
      setCalculating(false);
    }
  };

  const resetCalculator = () => {
    setQuoteRequest({
      product_type: '',
      specifications: {
        material: '',
        model: '',
        ring_size: '',
        budget_range: { min: 0, max: 0 },
        urgency: 'medium',
        occasion: ''
      }
    });
    setQuoteResult(null);
    setError(null);
  };

  const generateWhatsAppMessage = () => {
    if (!quoteResult || !quoteResult.success) return '';

    const { product, estimated_price, specifications } = quoteResult;
    
    return `*Orçamento - ${product.name}* 💎

📋 *Especificações:*
• Material: ${specifications.material || 'A definir'}
• Modelo: ${specifications.model || 'A definir'}
• Aro: ${specifications.ring_size || 'A medir'}
• Ocasião: ${specifications.occasion || 'Especial'}

💰 *Investimento Estimado:*
Entre ${formatCurrency(estimated_price.min)} e ${formatCurrency(estimated_price.max)}

⏰ *Prazo:* ${product.delivery_time || '15 dias úteis'}
🛡️ *Garantia:* ${product.warranty || 'Garantia vitalícia'}

${quoteResult.disclaimer || 'Preço final após avaliação presencial.'}

Gostaria de agendar uma visita para conhecer as peças? 😊`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calculadora de Orçamentos"
        subtitle="Gere orçamentos seguros com guardrails de preço"
        icon={<Calculator className="w-6 h-6 text-indigo-600" />}
        actions={
          <button
            onClick={resetCalculator}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Limpar
          </button>
        }
        showBackButton={true}
        backTo="/mvp"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium mb-4">Dados do Cliente</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Produto *
              </label>
              <select
                value={quoteRequest.product_type}
                onChange={(e) => setQuoteRequest({
                  ...quoteRequest,
                  product_type: e.target.value
                })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                <option value="alianca-classica-5mm">Aliança Clássica 5mm</option>
                <option value="alianca-anatomica-4mm">Aliança Anatômica 4mm</option>
                <option value="anel-solitario-1ct">Anel Solitário 1ct</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material
                </label>
                <select
                  value={quoteRequest.specifications.material}
                  onChange={(e) => setQuoteRequest({
                    ...quoteRequest,
                    specifications: {
                      ...quoteRequest.specifications,
                      material: e.target.value
                    }
                  })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione...</option>
                  <option value="ouro-amarelo">Ouro Amarelo 18k</option>
                  <option value="ouro-branco">Ouro Branco 18k</option>
                  <option value="ouro-rose">Ouro Rosé 18k</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Aro
                </label>
                <input
                  type="text"
                  value={quoteRequest.specifications.ring_size}
                  onChange={(e) => setQuoteRequest({
                    ...quoteRequest,
                    specifications: {
                      ...quoteRequest.specifications,
                      ring_size: e.target.value
                    }
                  })}
                  placeholder="Ex: 18"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ocasião
              </label>
              <select
                value={quoteRequest.specifications.occasion}
                onChange={(e) => setQuoteRequest({
                  ...quoteRequest,
                  specifications: {
                    ...quoteRequest.specifications,
                    occasion: e.target.value
                  }
                })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                <option value="noivado">Noivado</option>
                <option value="casamento">Casamento</option>
                <option value="bodas">Bodas</option>
                <option value="presente">Presente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Faixa de Orçamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={quoteRequest.specifications.budget_range?.min || ''}
                  onChange={(e) => setQuoteRequest({
                    ...quoteRequest,
                    specifications: {
                      ...quoteRequest.specifications,
                      budget_range: {
                        ...quoteRequest.specifications.budget_range,
                        min: parseInt(e.target.value) || 0
                      }
                    }
                  })}
                  placeholder="Mín (R$)"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  value={quoteRequest.specifications.budget_range?.max || ''}
                  onChange={(e) => setQuoteRequest({
                    ...quoteRequest,
                    specifications: {
                      ...quoteRequest.specifications,
                      budget_range: {
                        ...quoteRequest.specifications.budget_range,
                        max: parseInt(e.target.value) || 0
                      }
                    }
                  })}
                  placeholder="Máx (R$)"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgência
              </label>
              <select
                value={quoteRequest.specifications.urgency}
                onChange={(e) => setQuoteRequest({
                  ...quoteRequest,
                  specifications: {
                    ...quoteRequest.specifications,
                    urgency: e.target.value as 'high' | 'medium' | 'low'
                  }
                })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Baixa (sem pressa)</option>
                <option value="medium">Média (algumas semanas)</option>
                <option value="high">Alta (urgente)</option>
              </select>
            </div>

            <button
              onClick={handleCalculate}
              disabled={!quoteRequest.product_type || calculating}
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {calculating ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  Calcular Orçamento
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium mb-4">Resultado do Orçamento</h3>
          
          {error && (
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {quoteResult ? (
            quoteResult.success ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">Orçamento Calculado</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Produto:</span>
                      <span className="text-sm font-medium">{quoteResult.product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Faixa de Preço:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(quoteResult.estimated_price.min)} - {formatCurrency(quoteResult.estimated_price.max)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Prazo:</span>
                      <span className="text-sm font-medium">{quoteResult.product.delivery_time}</span>
                    </div>
                  </div>
                  
                  {quoteResult.disclaimer && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <p className="text-xs text-yellow-700">{quoteResult.disclaimer}</p>
                    </div>
                  )}
                </div>

                {/* WhatsApp Message Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Send className="w-4 h-4 mr-2 text-green-600" />
                    Mensagem para WhatsApp
                  </h4>
                  <div className="bg-white p-3 rounded border text-sm">
                    <pre className="whitespace-pre-wrap font-sans">
                      {generateWhatsAppMessage()}
                    </pre>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(generateWhatsAppMessage())}
                    className="mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Copiar Mensagem
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                  <span className="font-medium text-red-800">Erro no Orçamento</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {quoteResult.handoff_reason === 'price_missing' 
                    ? 'Preço não disponível - necessário handoff para especialista'
                    : 'Erro no cálculo - verifique os dados informados'
                  }
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Diamond className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Preencha os dados e clique em "Calcular Orçamento"</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">Templates Rápidos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickTemplate
            title="Aliança Clássica"
            description="Casal tradicional, orçamento médio"
            onClick={() => setQuoteRequest({
              product_type: 'alianca-classica-5mm',
              specifications: {
                material: 'ouro-amarelo',
                model: 'classica',
                ring_size: '',
                budget_range: { min: 3000, max: 5000 },
                urgency: 'medium',
                occasion: 'casamento'
              }
            })}
          />
          
          <QuickTemplate
            title="Anel de Noivado"
            description="Pedido especial, orçamento alto"
            onClick={() => setQuoteRequest({
              product_type: 'anel-solitario-1ct',
              specifications: {
                material: 'ouro-branco',
                model: 'solitario',
                ring_size: '',
                budget_range: { min: 8000, max: 15000 },
                urgency: 'high',
                occasion: 'noivado'
              }
            })}
          />
          
          <QuickTemplate
            title="Aliança Premium"
            description="Casal exigente, sem limite"
            onClick={() => setQuoteRequest({
              product_type: 'alianca-anatomica-4mm',
              specifications: {
                material: 'ouro-rose',
                model: 'anatomica',
                ring_size: '',
                budget_range: { min: 5000, max: 10000 },
                urgency: 'low',
                occasion: 'bodas'
              }
            })}
          />
        </div>
      </div>
    </div>
  );
}

interface QuickTemplateProps {
  title: string;
  description: string;
  onClick: () => void;
}

function QuickTemplate({ title, description, onClick }: QuickTemplateProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
    >
      <h4 className="font-medium text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </button>
  );
}