import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';
import type { Order } from '../types/orders';

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  loadOrders: () => Promise<void>;
  createOrder: (order: Omit<Order, 'id' | 'timeline' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  loadOrders: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ orders: data || [], loading: false });
    } catch (error) {
      console.error('Error loading orders:', error);
      set({ error: 'Failed to load orders', loading: false });
    }
  },

  createOrder: async (order) => {
    try {
      // Criar pedido
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          ...order,
          timeline: [{
            title: 'Pedido criado',
            type: 'status_change',
            timestamp: new Date()
          }]
        }])
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação
      const notifications = NotificationService.getInstance();
      await notifications.sendOrderConfirmation(data);

      get().loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      set({ error: 'Failed to create order' });
    }
  },

  updateOrder: async (id, updates) => {
    try {
      // Verificar mudança de status
      const currentOrder = get().orders.find(o => o.id === id);
      const statusChanged = updates.status && updates.status !== currentOrder?.status;
      const paymentConfirmed = 
        updates.paymentDetails?.status === 'paid' && 
        currentOrder?.paymentDetails?.status !== 'paid';

      // Atualizar timeline
      const timeline = [
        ...(currentOrder?.timeline || []),
        {
          title: statusChanged 
            ? `Status alterado para ${updates.status}`
            : paymentConfirmed
            ? 'Pagamento confirmado'
            : 'Pedido atualizado',
          type: statusChanged ? 'status_change' : paymentConfirmed ? 'payment' : 'note',
          timestamp: new Date()
        }
      ];

      // Atualizar pedido
      const { error } = await supabase
        .from('orders')
        .update({ ...updates, timeline })
        .eq('id', id);

      if (error) throw error;

      // Enviar notificações
      const notifications = NotificationService.getInstance();
      
      if (paymentConfirmed) {
        await notifications.sendPaymentConfirmation(currentOrder!);
      }

      if (statusChanged && updates.status) {
        await notifications.sendStatusUpdate(currentOrder!, updates.status);
        
        // Enviar lembrete de entrega
        if (updates.status === 'shipped') {
          await notifications.sendDeliveryReminder(currentOrder!);
        }
        
        // Solicitar feedback
        if (updates.status === 'delivered') {
          // Aguardar 2 dias para solicitar feedback
          setTimeout(() => {
            notifications.sendFeedbackRequest(currentOrder!);
          }, 2 * 24 * 60 * 60 * 1000);
        }
      }

      get().loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      set({ error: 'Failed to update order' });
    }
  }
}));