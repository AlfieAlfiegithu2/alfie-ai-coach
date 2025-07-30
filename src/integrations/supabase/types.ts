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
      general_listening_questions: {
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
          question_number?: number
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
            foreignKeyName: "general_listening_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "general_listening_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      general_listening_sections: {
        Row: {
          audio_url: string | null
          created_at: string
          general_book: string | null
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
          created_at?: string
          general_book?: string | null
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
          created_at?: string
          general_book?: string | null
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
      general_passages: {
        Row: {
          book_number: number | null
          content: string
          created_at: string
          general_book: string | null
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
          content: string
          created_at?: string
          general_book?: string | null
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
          content?: string
          created_at?: string
          general_book?: string | null
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
      general_questions: {
        Row: {
          band_impact: number | null
          correct_answer: string
          created_at: string
          explanation: string
          general_book: string | null
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
          correct_answer: string
          created_at?: string
          explanation: string
          general_book?: string | null
          id?: string
          options?: Json | null
          part_number?: number | null
          passage_id?: string | null
          question_number?: number
          question_text: string
          question_type?: string | null
          section_number?: number | null
        }
        Update: {
          band_impact?: number | null
          correct_answer?: string
          created_at?: string
          explanation?: string
          general_book?: string | null
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
            foreignKeyName: "general_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "general_passages"
            referencedColumns: ["id"]
          },
        ]
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
      ielts_reading_tests: {
        Row: {
          created_at: string | null
          id: string
          parts_completed: number | null
          status: string | null
          test_name: string
          test_number: number
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          parts_completed?: number | null
          status?: string | null
          test_name: string
          test_number: number
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          parts_completed?: number | null
          status?: string | null
          test_name?: string
          test_number?: number
          total_questions?: number | null
          updated_at?: string | null
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
          native_language: string | null
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
          native_language?: string | null
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
          native_language?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pte_listening_questions: {
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
          question_number?: number
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
            foreignKeyName: "pte_listening_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "pte_listening_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      pte_listening_sections: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          instructions: string | null
          part_number: number | null
          photo_url: string | null
          pte_book: string | null
          section_number: number | null
          test_number: number | null
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          part_number?: number | null
          photo_url?: string | null
          pte_book?: string | null
          section_number?: number | null
          test_number?: number | null
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          part_number?: number | null
          photo_url?: string | null
          pte_book?: string | null
          section_number?: number | null
          test_number?: number | null
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pte_passages: {
        Row: {
          book_number: number | null
          content: string
          created_at: string
          id: string
          part_number: number | null
          passage_type: string | null
          pte_book: string | null
          section_number: number | null
          test_number: number | null
          title: string
          updated_at: string
        }
        Insert: {
          book_number?: number | null
          content: string
          created_at?: string
          id?: string
          part_number?: number | null
          passage_type?: string | null
          pte_book?: string | null
          section_number?: number | null
          test_number?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          book_number?: number | null
          content?: string
          created_at?: string
          id?: string
          part_number?: number | null
          passage_type?: string | null
          pte_book?: string | null
          section_number?: number | null
          test_number?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pte_questions: {
        Row: {
          band_impact: number | null
          correct_answer: string
          created_at: string
          explanation: string
          id: string
          options: Json | null
          part_number: number | null
          passage_id: string | null
          pte_book: string | null
          question_number: number
          question_text: string
          question_type: string | null
          section_number: number | null
        }
        Insert: {
          band_impact?: number | null
          correct_answer: string
          created_at?: string
          explanation: string
          id?: string
          options?: Json | null
          part_number?: number | null
          passage_id?: string | null
          pte_book?: string | null
          question_number?: number
          question_text: string
          question_type?: string | null
          section_number?: number | null
        }
        Update: {
          band_impact?: number | null
          correct_answer?: string
          created_at?: string
          explanation?: string
          id?: string
          options?: Json | null
          part_number?: number | null
          passage_id?: string | null
          pte_book?: string | null
          question_number?: number
          question_text?: string
          question_type?: string | null
          section_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pte_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "pte_passages"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          choices?: string | null
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          part_number?: number
          passage_text?: string | null
          question_number_in_part: number
          question_text: string
          question_type: string
          test_id: string
          updated_at?: string
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
          updated_at?: string
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
          parts_completed: number | null
          status: string
          test_name: string
          test_number: number
          test_type: string
          total_questions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module?: string
          parts_completed?: number | null
          status?: string
          test_name: string
          test_number?: number
          test_type?: string
          total_questions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          parts_completed?: number | null
          status?: string
          test_name?: string
          test_number?: number
          test_type?: string
          total_questions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      toefl_listening_questions: {
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
          question_number?: number
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
            foreignKeyName: "toefl_listening_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "toefl_listening_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      toefl_listening_sections: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          instructions: string | null
          part_number: number | null
          photo_url: string | null
          section_number: number | null
          test_number: number | null
          title: string
          toefl_book: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          part_number?: number | null
          photo_url?: string | null
          section_number?: number | null
          test_number?: number | null
          title: string
          toefl_book?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          part_number?: number | null
          photo_url?: string | null
          section_number?: number | null
          test_number?: number | null
          title?: string
          toefl_book?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      toefl_passages: {
        Row: {
          book_number: number | null
          content: string
          created_at: string
          id: string
          part_number: number | null
          passage_type: string | null
          section_number: number | null
          test_number: number | null
          title: string
          toefl_book: string | null
          updated_at: string
        }
        Insert: {
          book_number?: number | null
          content: string
          created_at?: string
          id?: string
          part_number?: number | null
          passage_type?: string | null
          section_number?: number | null
          test_number?: number | null
          title: string
          toefl_book?: string | null
          updated_at?: string
        }
        Update: {
          book_number?: number | null
          content?: string
          created_at?: string
          id?: string
          part_number?: number | null
          passage_type?: string | null
          section_number?: number | null
          test_number?: number | null
          title?: string
          toefl_book?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      toefl_questions: {
        Row: {
          band_impact: number | null
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
          toefl_book: string | null
        }
        Insert: {
          band_impact?: number | null
          correct_answer: string
          created_at?: string
          explanation: string
          id?: string
          options?: Json | null
          part_number?: number | null
          passage_id?: string | null
          question_number?: number
          question_text: string
          question_type?: string | null
          section_number?: number | null
          toefl_book?: string | null
        }
        Update: {
          band_impact?: number | null
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
          toefl_book?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toefl_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "toefl_passages"
            referencedColumns: ["id"]
          },
        ]
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
          anon_user_id: string
          created_at: string
          details: Json | null
          id: string
          question_id: string | null
          timestamp: string
        }
        Insert: {
          action_type: string
          anon_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          question_id?: string | null
          timestamp?: string
        }
        Update: {
          action_type?: string
          anon_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          question_id?: string | null
          timestamp?: string
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
