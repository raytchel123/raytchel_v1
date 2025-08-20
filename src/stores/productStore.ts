import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/products';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  loadProducts: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ products: data || [], loading: false });
    } catch (error) {
      console.error('Error loading products:', error);
      set({ error: 'Failed to load products', loading: false });
    }
  },

  addProduct: async (product) => {
    try {
      const { error } = await supabase
        .from('products')
        .insert([product]);

      if (error) throw error;
      get().loadProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      set({ error: 'Failed to add product' });
    }
  },

  updateProduct: async (id, product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id);

      if (error) throw error;
      get().loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      set({ error: 'Failed to update product' });
    }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      get().loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      set({ error: 'Failed to delete product' });
    }
  }
}));