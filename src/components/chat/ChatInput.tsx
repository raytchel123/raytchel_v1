import React, { useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  onAudioMessage: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, onAudioMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sending && !disabled) {
      try {
        setSending(true);
        await onSend(message);
        setMessage('');
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
      <div className="flex items-center space-x-2">
        <AudioRecorder onAudioMessage={onAudioMessage} />
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!message.trim() || sending || disabled}
          className="p-2 text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}