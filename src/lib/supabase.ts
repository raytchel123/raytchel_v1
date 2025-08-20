import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('- VITE_SUPABASE_URL is missing');
  if (!supabaseKey) console.error('- VITE_SUPABASE_ANON_KEY is missing');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'raytchel@1.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enhanced retry mechanism with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        
        // Notify about retry if callback provided
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError;
};

// Connection health check
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('chats').select('count').limit(1).single();
    return !error;
  } catch {
    return false;
  }
};

// Reconnection handler
export const handleReconnection = async (
  onReconnecting?: () => void,
  onReconnected?: () => void,
  maxAttempts = 5
): Promise<boolean> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    if (onReconnecting) {
      onReconnecting();
    }
    
    const isConnected = await checkConnection();
    if (isConnected) {
      if (onReconnected) {
        onReconnected();
      }
      return true;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
  }
  
  return false;
};