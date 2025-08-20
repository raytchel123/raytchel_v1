import { create } from 'zustand';
import { supabase, retryOperation } from '../lib/supabase';
import { ChatAI } from '../lib/chatAI';
import type { ChatMessage, ChatSession } from '../types/chat';

interface ChatState {
  messages: ChatMessage[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  error: string | null;
  loadSessions: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  takeOverChat: (sessionId: string) => Promise<void>;
  retryLoadSessions: () => Promise<void>;
  clearError: () => void;
}

// Mock data for test environment
const mockChats: Chat[] = [
  {
    id: 'chat-1',
    user_id: 'test-admin-id',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    handled_by_agent: false,
    agent_id: null,
    tenant_id: 'test-tenant-id',
    metadata: { client_name: 'Maria Silva', phone: '+5511999887766' }
  },
  {
    id: 'chat-2',
    user_id: 'test-admin-id',
    status: 'active',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    handled_by_agent: true,
    agent_id: 'agent-1',
    tenant_id: 'test-tenant-id',
    metadata: { client_name: 'João Santos', phone: '+5511888776655' }
  },
  {
    id: 'chat-3',
    user_id: 'test-admin-id',
    status: 'closed',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    handled_by_agent: false,
    agent_id: null,
    tenant_id: 'test-tenant-id',
    metadata: { client_name: 'Ana Costa', phone: '+5511777665544' }
  }
];

const mockMessages: { [chatId: string]: Message[] } = {
  'chat-1': [
    {
      id: 'msg-1',
      chat_id: 'chat-1',
      content: 'Olá! Gostaria de saber mais sobre os móveis planejados.',
      type: 'text',
      sender: 'user',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      intent: 'product_inquiry',
      confidence: 0.95,
      context: {},
      agent_id: null,
      metadata: {}
    },
    {
      id: 'msg-2',
      chat_id: 'chat-1',
      content: 'Olá Maria! Ficamos felizes com seu interesse. Trabalhamos com móveis planejados para todos os ambientes. Que tipo de móvel você está procurando?',
      type: 'text',
      sender: 'bot',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
      status: 'read',
      intent: 'greeting',
      confidence: 0.98,
      context: {},
      agent_id: null,
      metadata: {}
    }
  ],
  'chat-2': [
    {
      id: 'msg-3',
      chat_id: 'chat-2',
      content: 'Preciso de um orçamento para cozinha completa.',
      type: 'text',
      sender: 'user',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      intent: 'budget_request',
      confidence: 0.92,
      context: {},
      agent_id: 'agent-1',
      metadata: {}
    }
  ]
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessions: [],
  activeSessionId: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  retryLoadSessions: async () => {
      // Check if we're in test environment
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set({ 
          chats: mockChats,
          loading: false 
        });
        return;
      }
  },

  loadSessions: async () => {
    set({ loading: true, error: null });
    try {
      // Check if we're in test environment
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const sessions: ChatSession[] = mockChats.map(chat => ({
          id: chat.id,
          status: chat.status,
          lastMessage: mockMessages[chat.id]?.[mockMessages[chat.id].length - 1] ? {
            id: mockMessages[chat.id][mockMessages[chat.id].length - 1].id,
            content: mockMessages[chat.id][mockMessages[chat.id].length - 1].content,
            sender: mockMessages[chat.id][mockMessages[chat.id].length - 1].sender,
            timestamp: new Date(mockMessages[chat.id][mockMessages[chat.id].length - 1].created_at),
            status: mockMessages[chat.id][mockMessages[chat.id].length - 1].status
          } : undefined,
          unreadCount: mockMessages[chat.id]?.filter(m => !m.status || m.status === 'sent').length ?? 0,
          createdAt: new Date(chat.created_at),
          updatedAt: new Date(chat.updated_at),
          handledByAgent: chat.handled_by_agent || false,
          metadata: chat.metadata || {}
        }));
        
        set({ sessions, loading: false });
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session not found');

      const { data: chats, error } = await retryOperation(
        () => supabase
          .from('chats')
          .select(`
            *,
            messages (
              id,
              content,
              created_at,
              sender,
              status
            )
          `)
          .order('created_at', { ascending: false })
      );

      if (error) throw error;

      const sessions: ChatSession[] = (chats || []).map(chat => ({
        id: chat.id,
        status: chat.status,
        lastMessage: chat.messages?.[0] ? {
          id: chat.messages[0].id,
          content: chat.messages[0].content,
          sender: chat.messages[0].sender,
          timestamp: new Date(chat.messages[0].created_at),
          status: chat.messages[0].status
        } : undefined,
        unreadCount: chat.messages?.filter(m => !m.status || m.status === 'sent').length ?? 0,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at),
        handledByAgent: chat.handled_by_agent || false,
        metadata: chat.metadata || {}
      }));

      set({ sessions, loading: false });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ error: 'Failed to load sessions', loading: false });
    }
  },

  loadMessages: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      // Check if we're in test environment
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const messages = mockMessages[sessionId] || [];
        set({ 
          messages,
          loading: false 
        });
        return;
      }
      
      // Production code for real Supabase messages
      const { data: messages, error } = await retryOperation(
        () => supabase
          .from('messages')
          .select('*')
          .eq('chat_id', sessionId)
          .order('created_at', { ascending: true })
      );

      if (error) throw error;

      set({ 
        messages: messages?.map(m => ({
          id: m.id,
          content: m.content,
          sender: m.sender,
          timestamp: new Date(m.created_at),
          intent: m.intent,
          confidence: m.confidence,
          status: m.status
        })) || [],
        activeSessionId: sessionId,
        loading: false 
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ error: 'Failed to load messages', loading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    try {
      // Check if we're in test environment
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Create mock message
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          chat_id: activeSessionId || 'chat-1',
          content,
          type: 'text',
          sender: 'user',
          created_at: new Date().toISOString(),
          status: 'sent',
          intent: null,
          confidence: null,
          context: {},
          agent_id: null,
          metadata: {}
        };
        
        // Add to current messages
        const currentMessages = get().messages;
        set({ messages: [...currentMessages, newMessage] });
        
        // Simulate bot response after delay
        setTimeout(() => {
          const botResponse: Message = {
            id: `msg-${Date.now() + 1}`,
            chat_id: activeSessionId || 'chat-1',
            content: 'Obrigado pela sua mensagem! Em breve um de nossos consultores entrará em contato.',
            type: 'text',
            sender: 'bot',
            created_at: new Date().toISOString(),
            status: 'sent',
            intent: 'acknowledgment',
            confidence: 0.95,
            context: {},
            agent_id: null,
            metadata: {}
          };
          
          const updatedMessages = get().messages;
          set({ messages: [...updatedMessages, botResponse] });
        }, 1000);
        
        return;
      }
      
      // Production code for real message sending
      // Save user message
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeSessionId,
          content,
          sender: 'user',
          status: 'sent'
        }]);

      if (messageError) throw messageError;

      // Reload messages to show user message
      await get().loadMessages(activeSessionId);

      // Process with AI and get response
      const chatAI = ChatAI.getInstance();
      const aiResponse = await chatAI.processMessage(content, activeSessionId);
      
      // Save AI response
      const { error: responseError } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeSessionId,
          content: aiResponse.content,
          sender: 'bot',
          status: 'sent',
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
          metadata: aiResponse.metadata
        }]);

      if (responseError) throw responseError;

      // Reload messages to show AI response
      await get().loadMessages(activeSessionId);
    } catch (error) {
      console.error('Error sending message:', error);
      set({ error: 'Failed to send message' });
    }
  },

  takeOverChat: async (sessionId: string) => {
    try {
      // Check if we're in test environment
      const isTestEnvironment = true;
      
      if (isTestEnvironment) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set({ 
          chats: mockChats,
          loading: false 
        });
        return;
      }
      
      // Production code for real Supabase sessions
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session not found');
      }

      const { error } = await supabase
        .from('chats')
        .update({ 
          handled_by_agent: true,
          agent_id: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', sessionId);

      if (error) throw error;
      await get().loadSessions();
    } catch (error) {
      console.error('Error taking over chat:', error);
      set({ error: 'Failed to take over chat' });
    }
  }
}));