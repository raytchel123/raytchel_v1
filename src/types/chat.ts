export interface ChatMessage {
  id: string;
  content: string;
  sender: 'bot' | 'user' | 'agent';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  intent?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  status: 'active' | 'closed';
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  handledByAgent: boolean;
  metadata?: {
    source?: string;
    priority?: 'low' | 'medium' | 'high';
    category?: string;
  };
}