export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          last_accessed: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_accessed?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_accessed?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
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
      listening_test_results: {
        Row: {
          audio_url: string | null
          created_at: string | null
          detailed_feedback: string | null
          id: string
          questions_data: Json
          section_number: number
          section_score: number
          section_title: string
          section_total: number
          test_result_id: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          questions_data: Json
          section_number: number
          section_score: number
          section_title: string
          section_total: number
          test_result_id?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          questions_data?: Json
          section_number?: number
          section_score?: number
          section_title?: string
          section_total?: number
          test_result_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_test_results_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          native_language: string | null
          role: string | null
          subscription_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          native_language?: string | null
          role?: string | null
          subscription_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          native_language?: string | null
          role?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      pronunciation_items: {
        Row: {
          audio_url: string
          created_at: string
          id: string
          order_index: number
          reference_text: string
          test_id: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          id?: string
          order_index?: number
          reference_text: string
          test_id: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          id?: string
          order_index?: number
          reference_text?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pronunciation_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "pronunciation_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      pronunciation_results: {
        Row: {
          analysis_json: Json | null
          audio_url: string | null
          created_at: string
          id: string
          item_id: string | null
          overall_score: number | null
          test_id: string | null
          user_id: string
        }
        Insert: {
          analysis_json?: Json | null
          audio_url?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          overall_score?: number | null
          test_id?: string | null
          user_id: string
        }
        Update: {
          analysis_json?: Json | null
          audio_url?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          overall_score?: number | null
          test_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pronunciation_tests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
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
      question_bookmarks: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          notes: string | null
          options: Json | null
          passage_text: string | null
          passage_title: string | null
          question_id: string
          question_text: string
          question_type: string | null
          test_result_id: string | null
          updated_at: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          notes?: string | null
          options?: Json | null
          passage_text?: string | null
          passage_title?: string | null
          question_id: string
          question_text: string
          question_type?: string | null
          test_result_id?: string | null
          updated_at?: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          notes?: string | null
          options?: Json | null
          passage_text?: string | null
          passage_title?: string | null
          question_id?: string
          question_text?: string
          question_type?: string | null
          test_result_id?: string | null
          updated_at?: string
          user_answer?: string | null
          user_id?: string
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
      reading_test_results: {
        Row: {
          comprehension_score: number | null
          created_at: string | null
          detailed_feedback: string | null
          id: string
          passage_text: string
          passage_title: string
          question_type_performance: Json | null
          questions_data: Json
          reading_time_seconds: number | null
          test_result_id: string | null
          user_id: string
        }
        Insert: {
          comprehension_score?: number | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          passage_text: string
          passage_title: string
          question_type_performance?: Json | null
          questions_data: Json
          reading_time_seconds?: number | null
          test_result_id?: string | null
          user_id: string
        }
        Update: {
          comprehension_score?: number | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          passage_text?: string
          passage_title?: string
          question_type_performance?: Json | null
          questions_data?: Json
          reading_time_seconds?: number | null
          test_result_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_test_results_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_practice_questions: {
        Row: {
          audio_url: string | null
          content: string
          correct_answer: string | null
          created_at: string
          created_by: string
          explanation: string | null
          id: string
          incorrect_answers: string[] | null
          original_sentence: string | null
          question_format: string | null
          skill_test_id: string | null
          skill_type: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          correct_answer?: string | null
          created_at?: string
          created_by?: string
          explanation?: string | null
          id?: string
          incorrect_answers?: string[] | null
          original_sentence?: string | null
          question_format?: string | null
          skill_test_id?: string | null
          skill_type: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          correct_answer?: string | null
          created_at?: string
          created_by?: string
          explanation?: string | null
          id?: string
          incorrect_answers?: string[] | null
          original_sentence?: string | null
          question_format?: string | null
          skill_test_id?: string | null
          skill_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_practice_questions_skill_test_id_fkey"
            columns: ["skill_test_id"]
            isOneToOne: false
            referencedRelation: "skill_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_tests: {
        Row: {
          created_at: string
          created_by: string
          id: string
          skill_slug: string
          test_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          skill_slug: string
          test_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          skill_slug?: string
          test_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      speaking_test_results: {
        Row: {
          audio_expires_at: string | null
          audio_url: string | null
          band_scores: Json | null
          created_at: string | null
          detailed_feedback: string | null
          duration_seconds: number | null
          id: string
          part_number: number
          question_text: string
          test_result_id: string | null
          transcription: string | null
          user_id: string
        }
        Insert: {
          audio_expires_at?: string | null
          audio_url?: string | null
          band_scores?: Json | null
          created_at?: string | null
          detailed_feedback?: string | null
          duration_seconds?: number | null
          id?: string
          part_number: number
          question_text: string
          test_result_id?: string | null
          transcription?: string | null
          user_id: string
        }
        Update: {
          audio_expires_at?: string | null
          audio_url?: string | null
          band_scores?: Json | null
          created_at?: string | null
          detailed_feedback?: string | null
          duration_seconds?: number | null
          id?: string
          part_number?: number
          question_text?: string
          test_result_id?: string | null
          transcription?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_test_results_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          audio_retention_expires_at: string | null
          audio_urls: string[] | null
          cambridge_book: string | null
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          detailed_feedback: Json | null
          id: string
          performance_metrics: Json | null
          question_analysis: Json | null
          score_percentage: number | null
          section_number: number | null
          skill_breakdown: Json | null
          test_data: Json | null
          test_type: string
          time_taken: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          audio_retention_expires_at?: string | null
          audio_urls?: string[] | null
          cambridge_book?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          detailed_feedback?: Json | null
          id?: string
          performance_metrics?: Json | null
          question_analysis?: Json | null
          score_percentage?: number | null
          section_number?: number | null
          skill_breakdown?: Json | null
          test_data?: Json | null
          test_type: string
          time_taken?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          audio_retention_expires_at?: string | null
          audio_urls?: string[] | null
          cambridge_book?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          detailed_feedback?: Json | null
          id?: string
          performance_metrics?: Json | null
          question_analysis?: Json | null
          score_percentage?: number | null
          section_number?: number | null
          skill_breakdown?: Json | null
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
          target_scores: Json | null
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
          target_scores?: Json | null
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
          target_scores?: Json | null
          target_test_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_skill_progress: {
        Row: {
          created_at: string
          id: string
          max_unlocked_level: number
          skill_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_unlocked_level?: number
          skill_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_unlocked_level?: number
          skill_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_test_progress: {
        Row: {
          completed_score: number | null
          created_at: string
          id: string
          status: string
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_score?: number | null
          created_at?: string
          id?: string
          status?: string
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_score?: number | null
          created_at?: string
          id?: string
          status?: string
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_test_progress_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "skill_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vocabulary: {
        Row: {
          created_at: string
          id: string
          part_of_speech: string | null
          translations: string[] | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          part_of_speech?: string | null
          translations?: string[] | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          part_of_speech?: string | null
          translations?: string[] | null
          user_id?: string
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
      writing_test_results: {
        Row: {
          band_scores: Json | null
          created_at: string | null
          detailed_feedback: string | null
          id: string
          improvement_suggestions: string[] | null
          prompt_text: string
          task_number: number
          test_result_id: string | null
          time_taken_seconds: number | null
          user_id: string
          user_response: string
          word_count: number
        }
        Insert: {
          band_scores?: Json | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          improvement_suggestions?: string[] | null
          prompt_text: string
          task_number: number
          test_result_id?: string | null
          time_taken_seconds?: number | null
          user_id: string
          user_response: string
          word_count: number
        }
        Update: {
          band_scores?: Json | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          improvement_suggestions?: string[] | null
          prompt_text?: string
          task_number?: number
          test_result_id?: string | null
          time_taken_seconds?: number | null
          user_id?: string
          user_response?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_test_results_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_admin_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_audio: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_question_numbering: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_admin_session: {
        Args: { session_token: string }
        Returns: {
          admin_id: string
          email: string
          name: string
        }[]
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
