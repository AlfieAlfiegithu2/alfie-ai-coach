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
      listening_questions: {
        Row: {
          band_impact: number | null
          correct_answer: string
          created_at: string
          explanation: string
          id: string
          options: Json | null
          part_number: number | null
          question_number: number
          question_text: string
          question_type: string | null
          section_id: string | null
        }
        Insert: {
          band_impact?: number | null
          correct_answer: string
          created_at?: string
          explanation: string
          id?: string
          options?: Json | null
          part_number?: number | null
          question_number: number
          question_text: string
          question_type?: string | null
          section_id?: string | null
        }
        Update: {
          band_impact?: number | null
          correct_answer?: string
          created_at?: string
          explanation?: string
          id?: string
          options?: Json | null
          part_number?: number | null
          question_number?: number
          question_text?: string
          question_type?: string | null
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listening_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "listening_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_sections: {
        Row: {
          audio_url: string | null
          cambridge_book: string | null
          created_at: string
          id: string
          instructions: string | null
          part_number: number | null
          photo_url: string | null
          section_number: number | null
          test_number: number | null
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          cambridge_book?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          part_number?: number | null
          photo_url?: string | null
          section_number?: number | null
          test_number?: number | null
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          cambridge_book?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          part_number?: number | null
          photo_url?: string | null
          section_number?: number | null
          test_number?: number | null
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          subscription_expires_at: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reading_passages: {
        Row: {
          book_number: number | null
          cambridge_book: string | null
          content: string
          created_at: string
          id: string
          part_number: number | null
          passage_type: string | null
          section_number: number | null
          test_number: number | null
          title: string
          updated_at: string
        }
        Insert: {
          book_number?: number | null
          cambridge_book?: string | null
          content: string
          created_at?: string
          id?: string
          part_number?: number | null
          passage_type?: string | null
          section_number?: number | null
          test_number?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          book_number?: number | null
          cambridge_book?: string | null
          content?: string
          created_at?: string
          id?: string
          part_number?: number | null
          passage_type?: string | null
          section_number?: number | null
          test_number?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_questions: {
        Row: {
          band_impact: number | null
          cambridge_book: string | null
          correct_answer: string
          created_at: string
          explanation: string
          id: string
          options: Json | null
          part_number: number | null
          passage_id: string | null
          question_number: number
          question_text: string
          question_type: string | null
          section_number: number | null
        }
        Insert: {
          band_impact?: number | null
          cambridge_book?: string | null
          correct_answer: string
          created_at?: string
          explanation: string
          id?: string
          options?: Json | null
          part_number?: number | null
          passage_id?: string | null
          question_number: number
          question_text: string
          question_type?: string | null
          section_number?: number | null
        }
        Update: {
          band_impact?: number | null
          cambridge_book?: string | null
          correct_answer?: string
          created_at?: string
          explanation?: string
          id?: string
          options?: Json | null
          part_number?: number | null
          passage_id?: string | null
          question_number?: number
          question_text?: string
          question_type?: string | null
          section_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_prompts: {
        Row: {
          band_criteria: Json | null
          cambridge_book: string | null
          created_at: string
          follow_up_questions: Json | null
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
          cambridge_book?: string | null
          created_at?: string
          follow_up_questions?: Json | null
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
          cambridge_book?: string | null
          created_at?: string
          follow_up_questions?: Json | null
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
      test_results: {
        Row: {
          cambridge_book: string | null
          completed_at: string | null
          correct_answers: number | null
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
