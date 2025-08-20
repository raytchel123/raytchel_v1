import { supabase } from './supabase';

interface PaymentLinkRequest {
  orderId: string;
  amount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  paymentMethod: 'credit_card' | 'pix';
  installments?: number;
}

interface PaymentLinkResponse {
  success: boolean;
  url?: string;
  qrCode?: string;
  pixCode?: string;
  error?: string;
}

export class AppmaxPayment {
  private static instance: AppmaxPayment;
  private apiKey: string;
  private apiUrl: string;

  private constructor() {
    this.apiKey = import.meta.env.VITE_APPMAX_API_KEY || '';
    this.apiUrl = import.meta.env.VITE_APPMAX_API_URL || '';
  }

  static getInstance(): AppmaxPayment {
    if (!AppmaxPayment.instance) {
      AppmaxPayment.instance = new AppmaxPayment();
    }
    return AppmaxPayment.instance;
  }

  async generatePaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('appmax_transactions')
        .insert([{
          order_id: request.orderId,
          amount: request.amount,
          status: 'pending',
          payment_method: request.paymentMethod,
          installments: request.installments || 1,
          payment_details: request
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Here you would integrate with Appmax API
      // This is a placeholder for the actual API integration
      const response = await this.createPaymentLink(request);

      // Update transaction with payment link
      await supabase
        .from('appmax_transactions')
        .update({
          external_id: response.transactionId,
          payment_url: response.url,
          metadata: {
            qrCode: response.qrCode,
            pixCode: response.pixCode
          }
        })
        .eq('id', payment.id);

      return {
        success: true,
        url: response.url,
        qrCode: response.qrCode,
        pixCode: response.pixCode
      };
    } catch (error) {
      console.error('Error generating payment link:', error);
      return {
        success: false,
        error: 'Falha ao gerar link de pagamento'
      };
    }
  }

  private async createPaymentLink(request: PaymentLinkRequest): Promise<any> {
    // Placeholder for Appmax API integration
    // In production, this would make actual API calls
    return {
      transactionId: `mock-${Date.now()}`,
      url: request.paymentMethod === 'credit_card' 
        ? 'https://pay.appmax.com.br/link/123'
        : undefined,
      qrCode: request.paymentMethod === 'pix' 
        ? 'data:image/png;base64,qrcode-data'
        : undefined,
      pixCode: request.paymentMethod === 'pix'
        ? '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000'
        : undefined
    };
  }
}