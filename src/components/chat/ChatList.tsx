import React from 'react';
import { useChatStore } from '../../stores/chatStore';
import { formatDistanceToNow } from '../../utils/dateFormat';

interface ChatListProps {
  onSelectChat?: (chatId: string) => Promise<void>;
}

export function ChatList({ onSelectChat }: ChatListProps) {
  const { sessions, loadSessions } = useChatStore();

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleChatSelect = async (chatId: string) => {
    if (onSelectChat) {
      await onSelectChat(chatId);
    }
  };

  return (
    <div className="h-full bg-white border-r">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Conversas</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-10rem)]">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => handleChatSelect(session.id)}
            className="w-full p-4 border-b hover:bg-gray-50 text-left"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Cliente #{session.id.slice(0, 8)}</p>
                {session.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {session.lastMessage.content}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(session.updatedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}