import { supabase } from '@/integrations/supabase/client';

// Generate anonymous user ID for analytics (using localStorage)
const getAnonymousUserId = (): string => {
  let anonId = localStorage.getItem('anon_user_id');
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('anon_user_id', anonId);
  }
  return anonId;
};

// Log user action for analytics
export const logUserAction = async (
  actionType: string,
  questionId?: string,
  details?: Record<string, any>
) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Skip analytics for non-authenticated users
      return;
    }
    
    await supabase
      .from('user_analytics')
      .insert({
        user_id: user.id,
        action_type: actionType,
        details: {
          question_id: questionId || null,
          ...details
        }
      });
  } catch (error) {
    // Silent fail for analytics - don't break user experience
    console.log('Analytics logging failed:', error);
  }
};

// Specific helper functions for common actions
export const logQuestionAnswered = (questionId: string, isCorrect: boolean, questionType: string) => {
  logUserAction('question_answered', questionId, {
    correct: isCorrect,
    type: questionType
  });
};

export const logChatInteraction = (message: string, topic: string) => {
  logUserAction('chat_interaction', undefined, {
    message_length: message.length,
    topic: topic
  });
};

export const logPageVisit = (pageName: string) => {
  logUserAction('page_visit', undefined, {
    page: pageName,
    timestamp: new Date().toISOString()
  });
};

export const logSearchQuery = (query: string, results_count?: number) => {
  logUserAction('search_query', undefined, {
    query: query,
    results_count: results_count || 0
  });
};