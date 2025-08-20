import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AITraining } from '../lib/aiTraining';
import type { ChatMessage } from '../types/chat';

interface FeedbackState {
  submitFeedback: (message: ChatMessage, feedback: {
    wasHelpful: boolean;
    category?: string;
    notes?: string;
  }) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>(() => ({
  submitFeedback: async (message, feedback) => {
    try {
      // Update message with feedback
      const { error: messageError } = await supabase
        .from('messages')
        .update({
          feedback: {
            wasHelpful: feedback.wasHelpful,
            category: feedback.category,
            notes: feedback.notes,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', message.id);

      if (messageError) throw messageError;

      // Process feedback for AI training
      const aiTraining = AITraining.getInstance();
      await aiTraining.processMessageFeedback(message, feedback);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }
}));