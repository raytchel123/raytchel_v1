import React, { useState } from 'react';
import { X, Calculator, DollarSign, Clock, Check, AlertTriangle } from 'lucide-react';
import { BudgetCalculator } from '../../lib/budgetCalculator';
import { GuardrailsService } from '../../lib/guardrailsService';

interface BudgetCalculatorModalProps {
  onClose: () => void;
  onSend: (message: string) => void;
}

export function BudgetCalculatorModal({ onClose, onSend }: BudgetCalculatorModalProps) {
  const [jewelryType, setJewelryType] = useState<'ring' | 'necklace' | 'bracelet' | 'earrings'>('ring');
  const [material, setMaterial] = useState<'gold_18k' | 'gold_14k' | 'silver_925' | 'platinum'>('gold_18k');
  const [weight, setWeight] = useState(5);
  const [hasStones, setHasStones] = useState(false);
  const [hasEngraving, setHasEngraving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_present' | 'card_link'>('cash');
  const [guardrailCheck, setGuardrailCheck] = useState<any>(null);
  const [showGuardrailWarning, setShowGuardrailWarning] = useState(false);

  const calculator = BudgetCalculator.getInstance();
  const guardrails = GuardrailsService.getInstance();
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const budgetItems = [{
    type: 'custom' as const,
    metalType: material,
    weight,
    stones: hasStones ? [{ type: 'diamante', quantity: 1, size: '1.3mm' }] : undefined,
    engraving: hasEngraving
  }];

  const budget = calculator.calculateBudget(budgetItems, paymentMethod);

  const handleSend = () => {
    if (!budget) return;
    
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };
    
    const baseMessage = `*Orçamento - ${jewelryType.charAt(0).toUpperCase() + jewelryType.slice(1)}*\n\n` +
      `Material: ${material.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n` +
      `${hasStones ? 'Com diamantes\n' : ''}` +
      `${hasEngraving ? 'Com gravação\n' : ''}` +
      `Peso estimado: ${weight}g\n\n` +
      `*Valor total: ${formatCurrency(budget.total)}*\n\n` +
      `Prazo de entrega estimado: 15 dias úteis\n\n`;
    
    // Create interactive message with payment options
    const interactiveMessage = baseMessage + 'Como você gostaria de realizar o pagamento?';
    
    // For now, send as regular message with options
    const message = baseMessage + 
      `Formas de pagamento disponíveis:\n` +
      `💚 PIX à vista (5% de desconto): ${formatCurrency(budget.total * 0.95)}\n` +
      `💳 Cartão em até 12x sem juros: ${formatCurrency(budget.total / 12)}/mês\n` +
      `💰 Entrada + saldo: Condições especiais\n\n` +
      `Qual forma prefere?`;
    
    onSend(message);
    onClose();
  };

  const checkPriceGuardrail = async () => {
    try {
      const productId = `${jewelryType}-${material}-${weight}g`;
      const check = await guardrails.checkPriceGuardrail(
        tenantId,
        productId,
        'price_inquiry'
      );
      
      setGuardrailCheck(check);
      setShowGuardrailWarning(check.triggered);
      
      return !check.triggered;
    } catch (error) {
      console.error('Error checking price guardrail:', error);
      setShowGuardrailWarning(true);
      return false;
    }
  };

  const handleSendWithGuardrail = async () => {
    const isValid = await checkPriceGuardrail();
    
    if (!isValid && guardrailCheck?.triggered) {
      // Use guardrail fallback message
      const fallbackMessage = guardrailCheck.fallbackMessage || 
        'Posso confirmar com especialista para evitar erro? Prefere seguir por agendamento ou falar com humano?';
      
      onSend(fallbackMessage);
      
      // Log guardrail decision
      await guardrails.logDecision(
        tenantId,
        'budget_calculator',
        'price_inquiry',
        0.5, // Low confidence for missing price
        'price_missing',
        {
          product_type: jewelryType,
          material,
          weight,
          estimated_total: budget.total
        },
        true, // fallback used
        guardrailCheck.handoffTrigger
      );
    } else {
      // Safe to send normal budget message
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calculator className="w-5 h-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold">Calculadora de Orçamento</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Joia
            </label>
            <select
              value={jewelryType}
              onChange={(e) => setJewelryType(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="ring">Anel</option>
              <option value="necklace">Colar</option>
              <option value="bracelet">Pulseira</option>
              <option value="earrings">Brincos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="gold_18k">Ouro 18k</option>
              <option value="gold_14k">Ouro 14k</option>
              <option value="silver_925">Prata 925</option>
              <option value="platinum">Platina</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso (gramas): {weight}g
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasStones}
                onChange={(e) => setHasStones(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Com diamantes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasEngraving}
                onChange={(e) => setHasEngraving(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Com gravação</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="cash">À vista (5% desconto)</option>
              <option value="card_present">Cartão presencial</option>
              <option value="card_link">Link de pagamento</option>
            </select>
          </div>

          {budget && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                <span className="font-medium">Orçamento Estimado</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(budget.total)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Prazo: 15 dias úteis
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            
            {showGuardrailWarning && (
              <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-700">Preço não confirmado</span>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleSendWithGuardrail}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showGuardrailWarning ? 'Enviar com Guardrail' : 'Enviar Orçamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}