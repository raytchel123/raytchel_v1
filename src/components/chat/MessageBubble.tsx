import React from 'react';
import { Check, CheckCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { ChatMessage } from '../../types/chat';
import { MessageFeedback } from './MessageFeedback';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isBot = message.sender === 'bot';
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className="flex flex-col">
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isBot ? 'bg-white' : 'bg-indigo-600 text-white'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <div className="flex items-center justify-end mt-1 space-x-1">
            <span className="text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {!isBot && message.status && (
              <span className="text-xs">
                {message.status === 'read' ? (
                  <CheckCheck className="w-4 h-4" />
                ) : message.status === 'delivered' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4 opacity-50" />
                )}
              </span>
            )}
          </div>
        </div>
        {isBot && <MessageFeedback message={message} />}
        {isBot && message.intent && (
          <div className="mt-1 flex items-center">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {message.intent}
            </span>
            {message.confidence && (
              <span className="text-xs text-gray-500 ml-2">
                {(message.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}