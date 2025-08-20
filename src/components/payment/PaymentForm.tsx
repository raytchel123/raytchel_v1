import React, { useState } from 'react';
import { AppmaxPayment } from '../../lib/appmax';
import { CreditCard, QrCode, Receipt, AlertCircle } from 'lucide-react';

interface PaymentFormProps {
  amount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

export function PaymentForm({ amount, items, onSuccess, onError }: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'boleto'>('credit_card');
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    document: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payment = AppmaxPayment.getInstance();
      const response = await payment.createPayment({
        orderId: crypto.randomUUID(),
        amount,
        paymentMethod,
        installments,
        customerInfo: {
          name: formData.name,
          email: formData.email,
          document: formData.document,
          phone: formData.phone
        },
        items
      });

      if (response.success && response.transactionId) {
        onSuccess(response.transactionId);
      } else {
        onError(response.error || 'Payment failed');
      }
    } catch (error) {
      onError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-6">Pagamento</h2>

      {/* Payment Method Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          <PaymentMethodButton
            active={paymentMethod === 'credit_card'}
            onClick={() => setPaymentMethod('credit_card')}
            icon={<CreditCard className="w-5 h-5" />}
            label="Cartão"
          />
          <PaymentMethodButton
            active={paymentMethod === 'pix'}
            onClick={() => setPaymentMethod('pix')}
            icon={<QrCode className="w-5 h-5" />}
            label="PIX"
          />
          <PaymentMethodButton
            active={paymentMethod === 'boleto'}
            onClick={() => setPaymentMethod('boleto')}
            icon={<Receipt className="w-5 h-5" />}
            label="Boleto"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF/CNPJ
            </label>
            <input
              type="text"
              required
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Credit Card Fields */}
        {paymentMethod === 'credit_card' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número do Cartão
              </label>
              <input
                type="text"
                required
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validade
                </label>
                <input
                  type="text"
                  required
                  placeholder="MM/AA"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  required
                  value={formData.cvv}
                  onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parcelas
              </label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}x de R$ {(amount / (i + 1)).toFixed(2)}
                    {i === 0 ? ' à vista' : ' sem juros'}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* PIX Instructions */}
        {paymentMethod === 'pix' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
              <p className="text-sm text-blue-700">
                Após confirmar, você receberá um QR Code para pagamento via PIX.
                O pagamento será confirmado automaticamente em instantes.
              </p>
            </div>
          </div>
        )}

        {/* Boleto Instructions */}
        {paymentMethod === 'boleto' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
              <p className="text-sm text-yellow-700">
                O boleto será gerado após a confirmação. O prazo de compensação
                é de até 3 dias úteis após o pagamento.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando...
            </span>
          ) : (
            `Pagar R$ ${amount.toFixed(2)}`
          )}
        </button>
      </form>
    </div>
  );
}

interface PaymentMethodButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function PaymentMethodButton({ active, onClick, icon, label }: PaymentMethodButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${
        active
          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
          : 'border-gray-200 hover:border-gray-300 text-gray-600'
      }`}
    >
       {icon}
      <span className="text-sm mt-2">{label}</span>
    </button>
  );
}