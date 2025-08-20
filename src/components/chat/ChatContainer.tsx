import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatQueue } from './ChatQueue';
import { ChatWindow } from './ChatWindow';
import { ChatList } from './ChatList';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase, checkConnection, handleReconnection, retryOperation } from '../../lib/supabase';
import { ProductRecommendations } from '../../lib/productRecommendations';
import { BudgetCalculator } from '../../lib/budgetCalculator';
import { WhatsAppIntegration } from '../../lib/whatsapp';
import { Bot, AlertCircle, MessageSquare, Users, Clock, BarChart2, Inbox, UserCheck } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';

interface ChatMetrics {
  activeLeads: number;
  activeChats: number;
  avgResponseTime: string;
  conversionRate: number;
}

export function ChatContainer() {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('leads');
  const { user } = useAuthStore();
  const { messages, sessions: chats, loadSessions, sendMessage } = useChatStore();
  const navigate = useNavigate();

  // Initialize metrics state with proper typing
  const [metrics, setMetrics] = useState<ChatMetrics>({
    activeLeads: 24,
    activeChats: 8,
    avgResponseTime: '1.2min',
    conversionRate: 32
  });

  // Add new integrations
  const productRecommendations = ProductRecommendations.getInstance();
  const budgetCalculator = BudgetCalculator.getInstance();
  const whatsapp = WhatsAppIntegration.getInstance();

  const [leads] = useState([
    {
      id: '1',
      name: 'Maria Silva',
      email: 'maria@email.com',
      status: 'new',
      lastContact: new Date()
    }
  ]);

  const [activeChats] = useState([
    {
      id: '1',
      customerName: 'João Santos',
      startedAt: new Date()
    }
  ]);

  const [customers] = useState([
    {
      id: '1',
      name: 'Ana Oliveira',
      email: 'ana@email.com',
      lastPurchase: new Date()
    }
  ]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleMessage = async (content: string) => {
    if (sending || !content.trim()) return;
    
    try {
      setSending(true);
      
      // Process message with enhanced context
      const response = await retryOperation(
        async () => {
          // Get product recommendations if needed
          const productContext = await productRecommendations.analyzeMessage(content);
          
          // Calculate budget if needed
          const budgetContext = await budgetCalculator.analyzeMessage(content);
          
          // Send message with enhanced context
          return await sendMessage(content, {
            products: productContext,
            budget: budgetContext
          });
        },
        3,
        1000
      );

      // Handle WhatsApp integration if needed
      if (response.shouldSendToWhatsApp) {
        await whatsapp.sendMessage(response.phoneNumber, {
          type: 'text',
          content: response.whatsappContent
        });
      }

    } catch (err) {
      console.error('Error processing message:', err);
      setError('Não foi possível processar sua mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full bg-gray-50">
      <PageHeader
        title="Central de Atendimento"
        subtitle="Gerencie conversas e leads em tempo real"
        icon={<MessageSquare className="w-6 h-6 text-indigo-600" />}
        actions={
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Online
            </span>
          </div>
        }
      />

      <div className="bg-white border-b px-8 py-4">
        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Active Leads"
            value={metrics.activeLeads}
            icon={<Users className="w-5 h-5 text-indigo-600" />}
          />
          <MetricCard
            title="Active Chats"
            value={metrics.activeChats}
            icon={<MessageSquare className="w-5 h-5 text-green-600" />}
          />
          <MetricCard
            title="Response Time"
            value={metrics.avgResponseTime}
            icon={<Clock className="w-5 h-5 text-yellow-600" />}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            icon={<BarChart2 className="w-5 h-5 text-blue-600" />}
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 mt-4">
          <TabButton 
            active={activeTab === 'leads'} 
            onClick={() => setActiveTab('leads')}
            icon={<Inbox className="w-4 h-4" />}
            label="Leads"
            count={leads.length}
          />
          <TabButton 
            active={activeTab === 'chats'} 
            onClick={() => setActiveTab('chats')}
            icon={<MessageSquare className="w-4 h-4" />}
            label="Active Chats"
            count={activeChats.length}
          />
          <TabButton 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')}
            icon={<UserCheck className="w-4 h-4" />}
            label="My Customers"
            count={customers.length}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'leads' ? (
          <LeadsList leads={leads} />
        ) : activeTab === 'chats' ? (
          <ActiveChats chats={activeChats} />
        ) : (
          <CustomersList customers={customers} />
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-semibold mt-1">{value}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        active 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs ${
        active ? 'bg-indigo-100' : 'bg-gray-100'
      }`}>
        {count}
      </span>
    </button>
  );
}

function LeadsList({ leads }) {
  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <div key={lead.id} className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{lead.name}</h3>
              <p className="text-sm text-gray-600">{lead.email}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              lead.status === 'new' ? 'bg-green-100 text-green-800' :
              lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {lead.status}
            </span>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Last contact: {new Date(lead.lastContact).toLocaleDateString()}
            </div>
            <button className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg">
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveChats({ chats }) {
  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <div key={chat.id} className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{chat.customerName}</h3>
              <p className="text-sm text-gray-600">
                Started {new Date(chat.startedAt).toLocaleTimeString()}
              </p>
            </div>
            <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Resume Chat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomersList({ customers }) {
  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <div key={customer.id} className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{customer.name}</h3>
              <p className="text-sm text-gray-600">{customer.email}</p>
            </div>
            <div className="text-sm text-gray-500">
              Last purchase: {new Date(customer.lastPurchase).toLocaleDateString()}
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg">
              View Profile
            </button>
            <button className="px-3 py-1 text-green-600 hover:bg-green-50 rounded-lg">
              Start Chat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}