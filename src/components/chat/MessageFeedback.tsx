import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import type { ChatMessage } from '../../types/chat';

interface MessageFeedbackProps {
  message: ChatMessage;
}

export function MessageFeedback({ message }: MessageFeedbackProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [notes, setNotes] = useState('');
  const submitFeedback = useFeedbackStore((state) => state.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (wasHelpful: boolean) => {
    try {
      setIsSubmitting(true);
      await submitFeedback(message, {
        wasHelpful,
        notes: notes.trim(),
        category: message.intent
      });
      setShowFeedback(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (message.feedback) {
    return null;
  }

  return (
    <div className="mt-2">
      {!showFeedback ? (
        <button
          onClick={() => setShowFeedback(true)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          A resposta foi útil?
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => handleFeedback(true)}
              disabled={isSubmitting}
              className="p-1 hover:bg-green-50 rounded-full text-green-600 disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={isSubmitting}
              className="p-1 hover:bg-red-50 rounded-full text-red-600 disabled:opacity-50"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comentários adicionais (opcional)"
            className="w-full text-sm p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            rows={2}
            disabled={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}