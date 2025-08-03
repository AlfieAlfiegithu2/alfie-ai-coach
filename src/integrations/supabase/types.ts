export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password_hash: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audio_cache: {
        Row: {
          audio_url: string
          created_at: string
          id: string
          question_id: string
          text_hash: string
          updated_at: string
          voice: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          id?: string
          question_id: string
          text_hash: string
          updated_at?: string
          voice?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          id?: string
          question_id?: string
          text_hash?: string
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number | null
          post_id: string
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          post_id: string
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          post_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          comments_count: number | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          category?: string
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          category?: string
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          active_date: string
          bonus_fact: string | null
          challenge_type: string
          content: Json
          created_at: string
          description: string
          difficulty: string
          id: string
          is_active: boolean
          tips: string[] | null
          title: string
        }
        Insert: {
          active_date?: string
          bonus_fact?: string | null
          challenge_type: string
          content: Json
          created_at?: string
          description: string
          difficulty?: string
          id?: string
          is_active?: boolean
          tips?: string[] | null
          title: string
        }
        Update: {
          active_date?: string
          bonus_fact?: string | null
          challenge_type?: string
          content?: Json
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          tips?: string[] | null
          title?: string
        }
        Relationships: []
      }
      general_speaking_prompts: {
        Row: {
          band_criteria: Json | null
          created_at: string
          follow_up_questions: Json | null
          general_book: string | null
          id: string
          part_number: number | null
          prompt_text: string
          sample_answer: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          band_criteria?: Json | null
          created_at?: string
          follow_up_questions?: Json | null
          general_book?: string | null
          id?: string
          part_number?: number | null
          prompt_text: string
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          band_criteria?: Json | null
          created_at?: string
          follow_up_questions?: Json | null
          general_book?: string | null
          id?: string
          part_number?: number | null
          prompt_text?: string
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      general_writing_prompts: {
        Row: {
          band_criteria: Json | null
          created_at: string
          general_book: string | null
          id: string
          image_url: string | null
          prompt_text: string
          sample_answer: string | null
          task_number: number | null
          task_type: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          band_criteria?: Json | null
          created_at?: string
          general_book?: string | null
          id?: string
          image_url?: string | null
          prompt_text: string
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          band_criteria?: Json | null
          created_at?: string
          general_book?: string | null
          id?: string
          image_url?: string | null
          prompt_text?: string
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          native_language: string | null
          role: string | null
          subscription_status: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          native_language?: string | null
          role?: string | null
          subscription_status?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          native_language?: string | null
          role?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      pte_speaking_prompts: {
        Row: {
          band_criteria: Json | null
          created_at: string
          follow_up_questions: Json | null
          id: string
          part_number: number | null
          prompt_text: string
          pte_book: string | null
          sample_answer: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          band_criteria?: Json | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          part_number?: number | null
          prompt_text: string
          pte_book?: string | null
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          band_criteria?: Json | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          part_number?: number | null
          prompt_text?: string
          pte_book?: string | null
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pte_writing_prompts: {
        Row: {
          band_criteria: Json | null
          created_at: string
          id: string
          image_url: string | null
          prompt_text: string
          pte_book: string | null
          sample_answer: string | null
          task_number: number | null
          task_type: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          band_criteria?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt_text: string
          pte_book?: string | null
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          band_criteria?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt_text?: string
          pte_book?: string | null
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          audio_url: string | null
          choices: string | null
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          image_url: string | null
          part_number: number
          passage_text: string | null
          question_number_in_part: number
          question_text: string
          question_type: string
          test_id: string
          transcription: string | null
        }
        Insert: {
          audio_url?: string | null
          choices?: string | null
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          part_number: number
          passage_text?: string | null
          question_number_in_part: number
          question_text: string
          question_type: string
          test_id: string
          transcription?: string | null
        }
        Update: {
          audio_url?: string | null
          choices?: string | null
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          part_number?: number
          passage_text?: string | null
          question_number_in_part?: number
          question_text?: string
          question_type?: string
          test_id?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_prompts: {
        Row: {
          audio_url: string | null
          band_criteria: Json | null
          cambridge_book: string | null
          created_at: string
          follow_up_questions: Json | null
          id: string
          is_locked: boolean | null
          part_number: number | null
          prompt_text: string
          sample_answer: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          transcription: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          band_criteria?: Json | null
          cambridge_book?: string | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          is_locked?: boolean | null
          part_number?: number | null
          prompt_text: string
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          transcription?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          band_criteria?: Json | null
          cambridge_book?: string | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          is_locked?: boolean | null
          part_number?: number | null
          prompt_text?: string
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          transcription?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          cambridge_book: string | null
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          id: string
          score_percentage: number | null
          section_number: number | null
          test_data: Json | null
          test_type: string
          time_taken: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          cambridge_book?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          score_percentage?: number | null
          section_number?: number | null
          test_data?: Json | null
          test_type: string
          time_taken?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          cambridge_book?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          score_percentage?: number | null
          section_number?: number | null
          test_data?: Json | null
          test_type?: string
          time_taken?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          created_at: string
          id: string
          module: string
          test_name: string
          test_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          test_name: string
          test_type: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          test_name?: string
          test_type?: string
        }
        Relationships: []
      }
      toefl_speaking_prompts: {
        Row: {
          band_criteria: Json | null
          created_at: string
          follow_up_questions: Json | null
          id: string
          part_number: number | null
          prompt_text: string
          sample_answer: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          toefl_book: string | null
          updated_at: string
        }
        Insert: {
          band_criteria?: Json | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          part_number?: number | null
          prompt_text: string
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          toefl_book?: string | null
          updated_at?: string
        }
        Update: {
          band_criteria?: Json | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          part_number?: number | null
          prompt_text?: string
          sample_answer?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          toefl_book?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      toefl_writing_prompts: {
        Row: {
          band_criteria: Json | null
          created_at: string
          id: string
          image_url: string | null
          prompt_text: string
          sample_answer: string | null
          task_number: number | null
          task_type: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          toefl_book: string | null
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          band_criteria?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt_text: string
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          toefl_book?: string | null
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          band_criteria?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt_text?: string
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          toefl_book?: string | null
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          answers: Json | null
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          score: number | null
          streak_count: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          streak_count?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          streak_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preferred_name: string | null
          target_deadline: string | null
          target_score: number | null
          target_test_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_name?: string | null
          target_deadline?: string | null
          target_score?: number | null
          target_test_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_name?: string | null
          target_deadline?: string | null
          target_score?: number | null
          target_test_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_vocabulary: {
        Row: {
          context: string | null
          id: string
          saved_at: string
          user_id: string
          vocabulary_word_id: string
        }
        Insert: {
          context?: string | null
          id?: string
          saved_at?: string
          user_id: string
          vocabulary_word_id: string
        }
        Update: {
          context?: string | null
          id?: string
          saved_at?: string
          user_id?: string
          vocabulary_word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vocabulary_vocabulary_word_id_fkey"
            columns: ["vocabulary_word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_words: {
        Row: {
          created_at: string
          id: string
          language_code: string
          translation: string
          updated_at: string
          usage_count: number | null
          verified: boolean | null
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          translation: string
          updated_at?: string
          usage_count?: number | null
          verified?: boolean | null
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          translation?: string
          updated_at?: string
          usage_count?: number | null
          verified?: boolean | null
          word?: string
        }
        Relationships: []
      }
      writing_prompts: {
        Row: {
          band_criteria: Json | null
          cambridge_book: string | null
          created_at: string
          id: string
          image_url: string | null
          prompt_text: string
          sample_answer: string | null
          task_number: number | null
          task_type: string | null
          test_number: number | null
          time_limit: number | null
          title: string
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          band_criteria?: Json | null
          cambridge_book?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt_text: string
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          band_criteria?: Json | null
          cambridge_book?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt_text?: string
          sample_answer?: string | null
          task_number?: number | null
          task_type?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_question_numbering: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
