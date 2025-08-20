import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getSession: () => Promise<any>;
  ensureProfile: (user: User) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  getSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  initAuth: async () => {
    try {
      // Ambiente de teste - simular usuário autenticado
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Criar um usuário mock para ambiente de teste
        const mockUser = {
          id: 'test-admin-id',
          email: 'admin@zaffira.com',
          user_metadata: { name: 'Admin Zaffira', role: 'admin' }
        };
        
        const mockSession = {
          user: mockUser,
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token'
        };
        
        set({ 
          user: mockUser as any, 
          session: mockSession,
          loading: false 
        });
        
        return;
      }
      
      // Comportamento normal para ambiente de produção
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        try {
          await get().ensureProfile(session.user);
        } catch (error) {
          console.error('Error ensuring profile:', error);
        }
      }
      
      set({ 
        user: session?.user ?? null, 
        session,
        loading: false 
      });

      // Subscribe to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          try {
            await get().ensureProfile(session.user);
          } catch (error) {
            console.error('Error ensuring profile on auth change:', error);
          }
        }
        
        set({ 
          user: session?.user ?? null, 
          session,
          loading: false
        });
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Auth init error:', error);
      set({ error: 'Failed to initialize auth', loading: false });
    }
  },

  ensureProfile: async (user: User) => {
    try {
      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Only create profile if it doesn't exist
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            role: user.user_metadata?.role || 'client'
          }]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error ensuring profile:', error);
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      // Ambiente de teste - bypass de autenticação
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Criar um usuário mock para ambiente de teste
        const mockUser = {
          id: 'test-admin-id',
          email: 'admin@zaffira.com',
          user_metadata: { name: 'Admin Zaffira', role: 'admin' }
        };
        
        const mockSession = {
          user: mockUser,
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token'
        };
        
        set({ 
          user: mockUser as any, 
          session: mockSession,
          loading: false 
        });
        
        return { data: mockSession, error: null };
      }
      
      // Usando o email e senha fornecidos pelo usuário
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Traduzir mensagens de erro para português
        let errorMessage = 'Falha no login. Verifique suas credenciais.';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha inválidos.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login.';
        }
        throw new Error(errorMessage);
      }

      if (data.user) {
        try {
          await get().ensureProfile(data.user);
        } catch (error) {
          console.error('Error ensuring profile during sign in:', error);
        }
      }

      set({ 
        user: data.user, 
        session: data.session,
        loading: false 
      });

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha no login', 
        loading: false 
      });
      throw error;
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null });
    } catch (error) {
      console.error('Signout failed:', error);
      set({ error: 'Failed to sign out' });
      throw error;
    }
  },
}));