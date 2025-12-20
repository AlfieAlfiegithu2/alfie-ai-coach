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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          last_accessed: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          last_accessed?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
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
      affiliate_codes: {
        Row: {
          affiliate_id: string
          code: string
          created_at: string
          currency: string | null
          current_redemptions: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          stripe_coupon_id: string | null
          stripe_promo_code_id: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          code: string
          created_at?: string
          currency?: string | null
          current_redemptions?: number
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          stripe_coupon_id?: string | null
          stripe_promo_code_id?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          code?: string
          created_at?: string
          currency?: string | null
          current_redemptions?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          stripe_coupon_id?: string | null
          stripe_promo_code_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_codes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_code_id: string
          affiliate_id: string
          commission_amount: number
          commission_status: string
          created_at: string
          currency: string
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          plan_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_code_id: string
          affiliate_id: string
          commission_amount: number
          commission_status?: string
          created_at?: string
          currency?: string
          discount_amount?: number
          final_amount: number
          id?: string
          original_amount: number
          plan_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_code_id?: string
          affiliate_id?: string
          commission_amount?: number
          commission_status?: string
          created_at?: string
          currency?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          plan_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          commission_percent: number
          contact_person: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          contact_person?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          contact_person?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          type?: string
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
      audio_analytics: {
        Row: {
          action_type: string
          created_at: string | null
          file_size_bytes: number | null
          id: string
          question_id: string
          storage_path: string | null
          user_id: string | null
          voice: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          question_id: string
          storage_path?: string | null
          user_id?: string | null
          voice: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          question_id?: string
          storage_path?: string | null
          user_id?: string | null
          voice?: string
        }
        Relationships: []
      }
      audio_cache: {
        Row: {
          audio_url: string
          created_at: string
          file_size_bytes: number | null
          id: string
          play_count: number | null
          question_id: string
          storage_path: string | null
          text_hash: string
          updated_at: string
          voice: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          play_count?: number | null
          question_id: string
          storage_path?: string | null
          text_hash: string
          updated_at?: string
          voice?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          play_count?: number | null
          question_id?: string
          storage_path?: string | null
          text_hash?: string
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      blog_auto_schedule: {
        Row: {
          auto_publish: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          languages: string[] | null
          last_run_at: string | null
          posts_generated_today: number | null
          posts_per_day: number | null
          subjects: string[] | null
          updated_at: string | null
        }
        Insert: {
          auto_publish?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          languages?: string[] | null
          last_run_at?: string | null
          posts_generated_today?: number | null
          posts_per_day?: number | null
          subjects?: string[] | null
          updated_at?: string | null
        }
        Update: {
          auto_publish?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          languages?: string[] | null
          last_run_at?: string | null
          posts_generated_today?: number | null
          posts_per_day?: number | null
          subjects?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string | null
          id: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          slug?: string
        }
        Relationships: []
      }
      blog_category_translations: {
        Row: {
          category_id: string
          description: string | null
          id: string
          language_code: string
          name: string
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          language_code: string
          name: string
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_generation_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          keyword: string | null
          languages_generated: number | null
          post_id: string | null
          question: string
          source: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword?: string | null
          languages_generated?: number | null
          post_id?: string | null
          question: string
          source?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword?: string | null
          languages_generated?: number | null
          post_id?: string | null
          question?: string
          source?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_generation_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_keyword_log: {
        Row: {
          blog_post_id: string | null
          created_at: string | null
          id: string
          keyword: string
          status: string | null
          subject: string
        }
        Insert: {
          blog_post_id?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          status?: string | null
          subject: string
        }
        Update: {
          blog_post_id?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_keyword_log_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_categories: {
        Row: {
          blog_post_id: string
          category_id: string
        }
        Insert: {
          blog_post_id: string
          category_id: string
        }
        Update: {
          blog_post_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_translations: {
        Row: {
          blog_post_id: string
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          language_code: string
          meta_description: string | null
          meta_keywords: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          blog_post_id: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          language_code: string
          meta_description?: string | null
          meta_keywords?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          blog_post_id?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          language_code?: string
          meta_description?: string | null
          meta_keywords?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_translations_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          created_at: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          book_id: string
          chapter_number: number
          chapter_title: string | null
          created_at: string | null
          error_message: string | null
          id: string
          original_content: string
          processed_content: string | null
          processing_model: string | null
          status: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          book_id: string
          chapter_number: number
          chapter_title?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          original_content: string
          processed_content?: string | null
          processing_model?: string | null
          status?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          book_id?: string
          chapter_number?: number
          chapter_title?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          original_content?: string
          processed_content?: string | null
          processing_model?: string | null
          status?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_processing_jobs: {
        Row: {
          book_id: string
          completed_at: string | null
          created_at: string | null
          current_chunk: number | null
          error_message: string | null
          id: string
          processed_chunks: number
          processing_model: string
          started_at: string | null
          status: string
          total_chunks: number
          updated_at: string | null
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          created_at?: string | null
          current_chunk?: number | null
          error_message?: string | null
          id?: string
          processed_chunks?: number
          processing_model: string
          started_at?: string | null
          status?: string
          total_chunks?: number
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_chunk?: number | null
          error_message?: string | null
          id?: string
          processed_chunks?: number
          processing_model?: string
          started_at?: string | null
          status?: string
          total_chunks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_processing_jobs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          company: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          original_author: string | null
          original_company: string | null
          processing_model: string | null
          published_at: string | null
          status: string
          title: string
          total_chapters: number | null
          updated_at: string | null
        }
        Insert: {
          author: string
          company?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          original_author?: string | null
          original_company?: string | null
          processing_model?: string | null
          published_at?: string | null
          status?: string
          title: string
          total_chapters?: number | null
          updated_at?: string | null
        }
        Update: {
          author?: string
          company?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          original_author?: string | null
          original_company?: string | null
          processing_model?: string | null
          published_at?: string | null
          status?: string
          title?: string
          total_chapters?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          created_at: string | null
          id: string
          industry: string | null
          occupation: string
          target_role: string | null
          updated_at: string | null
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry?: string | null
          occupation: string
          target_role?: string | null
          updated_at?: string | null
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string | null
          occupation?: string
          target_role?: string | null
          updated_at?: string | null
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      chat_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string | null
          hit_count: number | null
          id: string
          metadata: Json | null
          response: string
          task_context: string | null
          updated_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          metadata?: Json | null
          response: string
          task_context?: string | null
          updated_at?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          metadata?: Json | null
          response?: string
          task_context?: string | null
          updated_at?: string
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
      cover_letters: {
        Row: {
          company_name: string | null
          content: string
          created_at: string | null
          id: string
          job_post: string | null
          job_title: string | null
          recipient_name: string | null
          resume_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name?: string | null
          content: string
          created_at?: string | null
          id?: string
          job_post?: string | null
          job_title?: string | null
          recipient_name?: string | null
          resume_id?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string | null
          content?: string
          created_at?: string | null
          id?: string
          job_post?: string | null
          job_title?: string | null
          recipient_name?: string | null
          resume_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
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
      earthworm_user_progress: {
        Row: {
          accuracy_percentage: number | null
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string
          score: number | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      earthworm_user_stats: {
        Row: {
          average_score: number | null
          created_at: string | null
          current_streak_days: number | null
          id: string
          last_activity_date: string | null
          longest_streak_days: number | null
          total_lessons_completed: number | null
          total_time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak_days?: number | null
          total_lessons_completed?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak_days?: number | null
          total_lessons_completed?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_practice_sessions: {
        Row: {
          context_body: string
          context_from: string
          context_instructions: string | null
          context_subject: string
          created_at: string | null
          difficulty_level: string
          feedback: Json | null
          id: string
          improved_version: string | null
          overall_score: number | null
          response_submitted_at: string | null
          scenario_category: string
          scenario_type: string
          student_response: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_body: string
          context_from: string
          context_instructions?: string | null
          context_subject: string
          created_at?: string | null
          difficulty_level?: string
          feedback?: Json | null
          id?: string
          improved_version?: string | null
          overall_score?: number | null
          response_submitted_at?: string | null
          scenario_category: string
          scenario_type: string
          student_response?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_body?: string
          context_from?: string
          context_instructions?: string | null
          context_subject?: string
          created_at?: string | null
          difficulty_level?: string
          feedback?: Json | null
          id?: string
          improved_version?: string | null
          overall_score?: number | null
          response_submitted_at?: string | null
          scenario_category?: string
          scenario_type?: string
          student_response?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_scenario_templates: {
        Row: {
          body_template: string
          created_at: string | null
          difficulty_level: string
          from_template: string
          id: string
          instructions: string | null
          is_active: boolean | null
          scenario_category: string
          scenario_type: string
          subject_template: string
          target_occupations: string[] | null
        }
        Insert: {
          body_template: string
          created_at?: string | null
          difficulty_level?: string
          from_template: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          scenario_category: string
          scenario_type: string
          subject_template: string
          target_occupations?: string[] | null
        }
        Update: {
          body_template?: string
          created_at?: string | null
          difficulty_level?: string
          from_template?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          scenario_category?: string
          scenario_type?: string
          subject_template?: string
          target_occupations?: string[] | null
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
      grammar_exercise_translations: {
        Row: {
          correct_answer: string
          created_at: string | null
          exercise_id: string
          explanation: string | null
          hint: string | null
          id: string
          incorrect_answers: Json | null
          incorrect_sentence: string | null
          instruction: string | null
          language_code: string
          original_sentence: string | null
          question: string
          sentence_with_blank: string | null
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          exercise_id: string
          explanation?: string | null
          hint?: string | null
          id?: string
          incorrect_answers?: Json | null
          incorrect_sentence?: string | null
          instruction?: string | null
          language_code: string
          original_sentence?: string | null
          question: string
          sentence_with_blank?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          exercise_id?: string
          explanation?: string | null
          hint?: string | null
          id?: string
          incorrect_answers?: Json | null
          incorrect_sentence?: string | null
          instruction?: string | null
          language_code?: string
          original_sentence?: string | null
          question?: string
          sentence_with_blank?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_exercise_translations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "grammar_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_exercises: {
        Row: {
          correct_order: Json | null
          created_at: string | null
          difficulty: number | null
          exercise_order: number
          exercise_type: string
          id: string
          topic_id: string
          transformation_type: string | null
          updated_at: string | null
        }
        Insert: {
          correct_order?: Json | null
          created_at?: string | null
          difficulty?: number | null
          exercise_order?: number
          exercise_type: string
          id?: string
          topic_id: string
          transformation_type?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_order?: Json | null
          created_at?: string | null
          difficulty?: number | null
          exercise_order?: number
          exercise_type?: string
          id?: string
          topic_id?: string
          transformation_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_exercises_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "grammar_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_lesson_translations: {
        Row: {
          created_at: string | null
          examples: Json | null
          id: string
          language_code: string
          lesson_id: string
          localized_tips: string | null
          rules: Json | null
          theory_common_mistakes: string | null
          theory_definition: string | null
          theory_formation: string | null
          theory_title: string | null
          theory_usage: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          examples?: Json | null
          id?: string
          language_code: string
          lesson_id: string
          localized_tips?: string | null
          rules?: Json | null
          theory_common_mistakes?: string | null
          theory_definition?: string | null
          theory_formation?: string | null
          theory_title?: string | null
          theory_usage?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          examples?: Json | null
          id?: string
          language_code?: string
          lesson_id?: string
          localized_tips?: string | null
          rules?: Json | null
          theory_common_mistakes?: string | null
          theory_definition?: string | null
          theory_formation?: string | null
          theory_title?: string | null
          theory_usage?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_lesson_translations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "grammar_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_lessons: {
        Row: {
          created_at: string | null
          id: string
          lesson_order: number
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_order?: number
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_order?: number
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "grammar_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_topic_translations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          language_code: string
          title: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          language_code: string
          title: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          language_code?: string
          title?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_topic_translations_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "grammar_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_topics: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          level: string
          slug: string
          topic_order: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          level: string
          slug: string
          topic_order?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          level?: string
          slug?: string
          topic_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          areas_to_improve: Json | null
          completed_at: string | null
          created_at: string | null
          grading_mode: string
          id: string
          industry: string | null
          occupation: string
          overall_english_score: number | null
          overall_quality_score: number | null
          questions: Json
          started_at: string | null
          status: string
          strengths: Json | null
          summary_feedback: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          areas_to_improve?: Json | null
          completed_at?: string | null
          created_at?: string | null
          grading_mode?: string
          id?: string
          industry?: string | null
          occupation: string
          overall_english_score?: number | null
          overall_quality_score?: number | null
          questions?: Json
          started_at?: string | null
          status?: string
          strengths?: Json | null
          summary_feedback?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          areas_to_improve?: Json | null
          completed_at?: string | null
          created_at?: string | null
          grading_mode?: string
          id?: string
          industry?: string | null
          occupation?: string
          overall_english_score?: number | null
          overall_quality_score?: number | null
          questions?: Json
          started_at?: string | null
          status?: string
          strengths?: Json | null
          summary_feedback?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jobs_vocab_seed: {
        Row: {
          completed: number | null
          created_at: string | null
          id: string
          last_error: string | null
          last_term: string | null
          level: number | null
          status: string | null
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_term?: string | null
          level?: number | null
          status?: string | null
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_term?: string | null
          level?: number | null
          status?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string
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
      nclex_questions: {
        Row: {
          correct_answers: Json
          created_at: string | null
          id: string
          is_modified: boolean | null
          options: Json
          original_text: string | null
          question_number: number
          question_text: string
          question_type: string
          rationale: string | null
          test_id: string | null
          updated_at: string | null
        }
        Insert: {
          correct_answers?: Json
          created_at?: string | null
          id?: string
          is_modified?: boolean | null
          options?: Json
          original_text?: string | null
          question_number: number
          question_text: string
          question_type?: string
          rationale?: string | null
          test_id?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_answers?: Json
          created_at?: string | null
          id?: string
          is_modified?: boolean | null
          options?: Json
          original_text?: string | null
          question_number?: number
          question_text?: string
          question_type?: string
          rationale?: string | null
          test_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nclex_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "nclex_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      nclex_test_results: {
        Row: {
          answers_data: Json | null
          completed_at: string | null
          correct_count: number | null
          created_at: string | null
          id: string
          score: number | null
          test_id: string | null
          time_taken_seconds: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          answers_data?: Json | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string | null
          id?: string
          score?: number | null
          test_id?: string | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          answers_data?: Json | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string | null
          id?: string
          score?: number | null
          test_id?: string | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nclex_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "nclex_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      nclex_tests: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          is_published: boolean | null
          question_count: number | null
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_published?: boolean | null
          question_count?: number | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_published?: boolean | null
          question_count?: number | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      page_content_versions: {
        Row: {
          content_hash: string
          created_at: string | null
          id: string
          last_updated: string | null
          page_key: string
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          page_key: string
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          page_key?: string
        }
        Relationships: []
      }
      page_translations: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          language_code: string
          page_key: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          language_code: string
          page_key: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          language_code?: string
          page_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_code: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean | null
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          audio_url: string
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          level: string | null
          play_count: number | null
          title: string
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          level?: string | null
          play_count?: number | null
          title: string
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          level?: string | null
          play_count?: number | null
          title?: string
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_plan_id: string | null
          full_name: string | null
          id: string
          native_language: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_plan_id?: string | null
          full_name?: string | null
          id: string
          native_language?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_plan_id?: string | null
          full_name?: string | null
          id?: string
          native_language?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
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
      pte_items: {
        Row: {
          audio_url: string | null
          blanks: Json | null
          correct_answer: string | null
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          options: Json | null
          paragraphs: Json | null
          passage_text: string | null
          prompt_text: string
          pte_section_type: string
          pte_skill: string
          sample_answer: string | null
          time_limit: number | null
          title: string | null
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          audio_url?: string | null
          blanks?: Json | null
          correct_answer?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          paragraphs?: Json | null
          passage_text?: string | null
          prompt_text: string
          pte_section_type: string
          pte_skill: string
          sample_answer?: string | null
          time_limit?: number | null
          title?: string | null
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          audio_url?: string | null
          blanks?: Json | null
          correct_answer?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          paragraphs?: Json | null
          passage_text?: string | null
          prompt_text?: string
          pte_section_type?: string
          pte_skill?: string
          sample_answer?: string | null
          time_limit?: number | null
          title?: string | null
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: []
      }
      pte_listening_items: {
        Row: {
          audio_end_time: number | null
          audio_start_time: number | null
          blanks: Json | null
          correct_answer: string | null
          created_at: string
          explanation: string | null
          highlight_words: Json | null
          id: string
          image_url: string | null
          listening_test_id: string | null
          options: Json | null
          passage_text: string | null
          prompt_text: string | null
          pte_section_type: string
          question_number: number | null
        }
        Insert: {
          audio_end_time?: number | null
          audio_start_time?: number | null
          blanks?: Json | null
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          highlight_words?: Json | null
          id?: string
          image_url?: string | null
          listening_test_id?: string | null
          options?: Json | null
          passage_text?: string | null
          prompt_text?: string | null
          pte_section_type: string
          question_number?: number | null
        }
        Update: {
          audio_end_time?: number | null
          audio_start_time?: number | null
          blanks?: Json | null
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          highlight_words?: Json | null
          id?: string
          image_url?: string | null
          listening_test_id?: string | null
          options?: Json | null
          passage_text?: string | null
          prompt_text?: string | null
          pte_section_type?: string
          question_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pte_listening_items_listening_test_id_fkey"
            columns: ["listening_test_id"]
            isOneToOne: false
            referencedRelation: "pte_listening_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      pte_listening_tests: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          test_name: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          test_name: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          test_name?: string
          transcript?: string | null
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
      pte_user_progress: {
        Row: {
          completed: boolean | null
          created_at: string
          feedback: Json | null
          id: string
          item_id: string | null
          listening_test_id: string | null
          pte_section_type: string
          pte_skill: string
          response_audio_url: string | null
          response_text: string | null
          score: number | null
          time_taken: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          feedback?: Json | null
          id?: string
          item_id?: string | null
          listening_test_id?: string | null
          pte_section_type: string
          pte_skill: string
          response_audio_url?: string | null
          response_text?: string | null
          score?: number | null
          time_taken?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          feedback?: Json | null
          id?: string
          item_id?: string | null
          listening_test_id?: string | null
          pte_section_type?: string
          pte_skill?: string
          response_audio_url?: string | null
          response_text?: string | null
          score?: number | null
          time_taken?: number | null
          user_id?: string
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
          ai_explanation: string | null
          answer_image_url: string | null
          audio_url: string | null
          choices: string | null
          correct_answer: string
          created_at: string
          explanation: string | null
          explanation_generated_at: string | null
          id: string
          image_url: string | null
          part_number: number
          passage_context: string | null
          passage_text: string | null
          question_number_in_part: number
          question_subtype: string | null
          question_text: string
          question_type: string
          related_passage_id: string | null
          structure_data: Json | null
          test_id: string
          toeic_part: number | null
          transcript_json: Json | null
          transcription: string | null
        }
        Insert: {
          ai_explanation?: string | null
          answer_image_url?: string | null
          audio_url?: string | null
          choices?: string | null
          correct_answer: string
          created_at?: string
          explanation?: string | null
          explanation_generated_at?: string | null
          id?: string
          image_url?: string | null
          part_number: number
          passage_context?: string | null
          passage_text?: string | null
          question_number_in_part: number
          question_subtype?: string | null
          question_text: string
          question_type: string
          related_passage_id?: string | null
          structure_data?: Json | null
          test_id: string
          toeic_part?: number | null
          transcript_json?: Json | null
          transcription?: string | null
        }
        Update: {
          ai_explanation?: string | null
          answer_image_url?: string | null
          audio_url?: string | null
          choices?: string | null
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          explanation_generated_at?: string | null
          id?: string
          image_url?: string | null
          part_number?: number
          passage_context?: string | null
          passage_text?: string | null
          question_number_in_part?: number
          question_subtype?: string | null
          question_text?: string
          question_type?: string
          related_passage_id?: string | null
          structure_data?: Json | null
          test_id?: string
          toeic_part?: number | null
          transcript_json?: Json | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_related_passage_id_fkey"
            columns: ["related_passage_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
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
      resumes: {
        Row: {
          ats_score: number | null
          ats_suggestions: Json | null
          certifications: Json | null
          created_at: string | null
          education: Json | null
          email: string | null
          experience: Json | null
          extracted_keywords: Json | null
          full_name: string | null
          id: string
          is_primary: boolean | null
          languages: Json | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          projects: Json | null
          skills: Json | null
          summary: string | null
          target_job_post: string | null
          template_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          ats_suggestions?: Json | null
          certifications?: Json | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          extracted_keywords?: Json | null
          full_name?: string | null
          id?: string
          is_primary?: boolean | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          projects?: Json | null
          skills?: Json | null
          summary?: string | null
          target_job_post?: string | null
          template_id?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ats_score?: number | null
          ats_suggestions?: Json | null
          certifications?: Json | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          extracted_keywords?: Json | null
          full_name?: string | null
          id?: string
          is_primary?: boolean | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          projects?: Json | null
          skills?: Json | null
          summary?: string | null
          target_job_post?: string | null
          template_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      signup_otps: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_code: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean | null
        }
        Relationships: []
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
          test_id: string | null
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
          test_id?: string | null
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
          test_id?: string | null
          test_number?: number | null
          time_limit?: number | null
          title?: string
          transcription?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_prompts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
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
      study_plans: {
        Row: {
          created_at: string
          id: string
          plan: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          is_published: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_published?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_published?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
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
          audio_url: string | null
          created_at: string
          id: string
          instructions: string | null
          module: string
          part_configs: Json | null
          pte_section_type: string | null
          pte_skill: string | null
          skill_category: string | null
          test_category: string | null
          test_name: string
          test_subtype: string | null
          test_type: string
          total_parts: number | null
          transcript_json: Json | null
          transcript_text: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          module: string
          part_configs?: Json | null
          pte_section_type?: string | null
          pte_skill?: string | null
          skill_category?: string | null
          test_category?: string | null
          test_name: string
          test_subtype?: string | null
          test_type: string
          total_parts?: number | null
          transcript_json?: Json | null
          transcript_text?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          module?: string
          part_configs?: Json | null
          pte_section_type?: string | null
          pte_skill?: string | null
          skill_category?: string | null
          test_category?: string | null
          test_name?: string
          test_subtype?: string | null
          test_type?: string
          total_parts?: number | null
          transcript_json?: Json | null
          transcript_text?: string | null
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
      toeic_passages: {
        Row: {
          created_at: string | null
          id: string
          part_number: number
          passage_content: string
          passage_image_url: string | null
          passage_title: string | null
          passage_type: string
          question_range_end: number | null
          question_range_start: number | null
          test_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          part_number: number
          passage_content: string
          passage_image_url?: string | null
          passage_title?: string | null
          passage_type: string
          question_range_end?: number | null
          question_range_start?: number | null
          test_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          part_number?: number
          passage_content?: string
          passage_image_url?: string | null
          passage_title?: string | null
          passage_type?: string
          question_range_end?: number | null
          question_range_start?: number | null
          test_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toeic_passages_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_cache: {
        Row: {
          created_at: string
          expires_at: string | null
          hit_count: number | null
          id: string
          source_lang: string
          target_lang: string
          translation: string
          updated_at: string
          user_id: string | null
          word: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          source_lang?: string
          target_lang: string
          translation: string
          updated_at?: string
          user_id?: string | null
          word: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          source_lang?: string
          target_lang?: string
          translation?: string
          updated_at?: string
          user_id?: string | null
          word?: string
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
      user_assessments: {
        Row: {
          assessment_data: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_data: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_data?: Json
          created_at?: string
          id?: string
          updated_at?: string
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
      user_grammar_exercise_attempts: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          is_correct: boolean
          next_review_at: string | null
          review_count: number | null
          time_spent_seconds: number | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          is_correct: boolean
          next_review_at?: string | null
          review_count?: number | null
          time_spent_seconds?: number | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          is_correct?: boolean
          next_review_at?: string | null
          review_count?: number | null
          time_spent_seconds?: number | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_grammar_exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "grammar_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_grammar_progress: {
        Row: {
          attempts: number | null
          best_score: number | null
          created_at: string | null
          exercises_completed: number | null
          id: string
          last_practiced_at: string | null
          mastery_level: number | null
          theory_completed: boolean | null
          topic_id: string
          total_exercises: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          best_score?: number | null
          created_at?: string | null
          exercises_completed?: number | null
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number | null
          theory_completed?: boolean | null
          topic_id: string
          total_exercises?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          best_score?: number | null
          created_at?: string | null
          exercises_completed?: number | null
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number | null
          theory_completed?: boolean | null
          topic_id?: string
          total_exercises?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_grammar_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "grammar_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          dashboard_theme: string | null
          id: string
          native_language: string | null
          preferred_feedback_language: string | null
          preferred_name: string | null
          target_deadline: string | null
          target_score: number | null
          target_scores: Json | null
          target_test_type: string | null
          updated_at: string
          user_id: string
          word_translation_language: string | null
        }
        Insert: {
          created_at?: string
          dashboard_theme?: string | null
          id?: string
          native_language?: string | null
          preferred_feedback_language?: string | null
          preferred_name?: string | null
          target_deadline?: string | null
          target_score?: number | null
          target_scores?: Json | null
          target_test_type?: string | null
          updated_at?: string
          user_id: string
          word_translation_language?: string | null
        }
        Update: {
          created_at?: string
          dashboard_theme?: string | null
          id?: string
          native_language?: string | null
          preferred_feedback_language?: string | null
          preferred_name?: string | null
          target_deadline?: string | null
          target_score?: number | null
          target_scores?: Json | null
          target_test_type?: string | null
          updated_at?: string
          user_id?: string
          word_translation_language?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
          vocabulary_word_id: string | null
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          part_of_speech?: string | null
          translations?: string[] | null
          user_id: string
          vocabulary_word_id?: string | null
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          part_of_speech?: string | null
          translations?: string[] | null
          user_id?: string
          vocabulary_word_id?: string | null
          word?: string
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
      vocab_cards: {
        Row: {
          audio_url: string | null
          conjugation: Json | null
          context_sentence: string | null
          created_at: string | null
          deck_id: string | null
          examples_json: string[] | null
          frequency_rank: number | null
          id: string
          ipa: string | null
          is_public: boolean | null
          language: string | null
          level: number | null
          pos: string | null
          suspended: boolean | null
          synonyms: string[] | null
          synonyms_json: Json | null
          term: string
          translation: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          conjugation?: Json | null
          context_sentence?: string | null
          created_at?: string | null
          deck_id?: string | null
          examples_json?: string[] | null
          frequency_rank?: number | null
          id?: string
          ipa?: string | null
          is_public?: boolean | null
          language?: string | null
          level?: number | null
          pos?: string | null
          suspended?: boolean | null
          synonyms?: string[] | null
          synonyms_json?: Json | null
          term: string
          translation: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          conjugation?: Json | null
          context_sentence?: string | null
          created_at?: string | null
          deck_id?: string | null
          examples_json?: string[] | null
          frequency_rank?: number | null
          id?: string
          ipa?: string | null
          is_public?: boolean | null
          language?: string | null
          level?: number | null
          pos?: string | null
          suspended?: boolean | null
          synonyms?: string[] | null
          synonyms_json?: Json | null
          term?: string
          translation?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "vocab_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_decks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          level: number | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          level?: number | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          level?: number | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vocab_examples: {
        Row: {
          card_id: string | null
          cefr: string | null
          created_at: string | null
          id: string
          lang: string | null
          quality: number | null
          sentence: string
          source: string | null
          translation: string | null
          user_id: string
        }
        Insert: {
          card_id?: string | null
          cefr?: string | null
          created_at?: string | null
          id?: string
          lang?: string | null
          quality?: number | null
          sentence: string
          source?: string | null
          translation?: string | null
          user_id: string
        }
        Update: {
          card_id?: string | null
          cefr?: string | null
          created_at?: string | null
          id?: string
          lang?: string | null
          quality?: number | null
          sentence?: string
          source?: string | null
          translation?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_examples_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_frequency: {
        Row: {
          created_at: string | null
          id: string
          language: string
          lemma: string
          rank: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          language: string
          lemma: string
          rank: number
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string
          lemma?: string
          rank?: number
        }
        Relationships: []
      }
      vocab_images: {
        Row: {
          card_id: string | null
          created_at: string | null
          format: string | null
          height: number | null
          id: string
          prompt: string | null
          provider: string | null
          style: string | null
          url: string
          user_id: string
          width: number | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          format?: string | null
          height?: number | null
          id?: string
          prompt?: string | null
          provider?: string | null
          style?: string | null
          url: string
          user_id: string
          width?: number | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          format?: string | null
          height?: number | null
          id?: string
          prompt?: string | null
          provider?: string | null
          style?: string | null
          url?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_images_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_pronunciations: {
        Row: {
          accent: string | null
          card_id: string | null
          created_at: string | null
          duration_ms: number | null
          format: string | null
          gender: string | null
          id: string
          provider: string | null
          url: string
          user_id: string
          voice_id: string | null
        }
        Insert: {
          accent?: string | null
          card_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          format?: string | null
          gender?: string | null
          id?: string
          provider?: string | null
          url: string
          user_id: string
          voice_id?: string | null
        }
        Update: {
          accent?: string | null
          card_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          format?: string | null
          gender?: string | null
          id?: string
          provider?: string | null
          url?: string
          user_id?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_pronunciations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_reviews: {
        Row: {
          card_id: string
          created_at: string | null
          ease_after: number | null
          ease_before: number | null
          id: string
          interval_days_after: number | null
          interval_days_before: number | null
          next_due_at_after: string | null
          next_due_at_before: string | null
          rating: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          ease_after?: number | null
          ease_before?: number | null
          id?: string
          interval_days_after?: number | null
          interval_days_before?: number | null
          next_due_at_after?: string | null
          next_due_at_before?: string | null
          rating: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          ease_after?: number | null
          ease_before?: number | null
          id?: string
          interval_days_after?: number | null
          interval_days_before?: number | null
          next_due_at_after?: string | null
          next_due_at_before?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_srs_state: {
        Row: {
          card_id: string
          created_at: string | null
          difficulty: number | null
          ease: number | null
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          next_due_at: string | null
          stability: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          difficulty?: number | null
          ease?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_due_at?: string | null
          stability?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          difficulty?: number | null
          ease?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_due_at?: string | null
          stability?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_srs_state_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_translation_enrichments: {
        Row: {
          card_id: string
          conjugation: Json | null
          context: string | null
          created_at: string
          examples_json: Json | null
          id: string
          ipa: string | null
          lang: string
          pos: string | null
          provider: string | null
          quality: number | null
          synonyms_json: Json | null
          translation: string | null
          updated_at: string
        }
        Insert: {
          card_id: string
          conjugation?: Json | null
          context?: string | null
          created_at?: string
          examples_json?: Json | null
          id?: string
          ipa?: string | null
          lang: string
          pos?: string | null
          provider?: string | null
          quality?: number | null
          synonyms_json?: Json | null
          translation?: string | null
          updated_at?: string
        }
        Update: {
          card_id?: string
          conjugation?: Json | null
          context?: string | null
          created_at?: string
          examples_json?: Json | null
          id?: string
          ipa?: string | null
          lang?: string
          pos?: string | null
          provider?: string | null
          quality?: number | null
          synonyms_json?: Json | null
          translation?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vocab_translation_queue: {
        Row: {
          card_id: string
          created_at: string
          error_message: string | null
          id: string
          retry_count: number | null
          status: string
          target_lang: string
          term: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          target_lang: string
          term: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          target_lang?: string
          term?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocab_translations: {
        Row: {
          card_id: string | null
          created_at: string | null
          id: string
          is_system: boolean | null
          lang: string
          provider: string | null
          quality: number | null
          translations: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          lang: string
          provider?: string | null
          quality?: number | null
          translations?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          lang?: string
          provider?: string | null
          quality?: number | null
          translations?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_translations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
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
          usage_count: number
          verified: boolean
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          translation: string
          updated_at?: string
          usage_count?: number
          verified?: boolean
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          translation?: string
          updated_at?: string
          usage_count?: number
          verified?: boolean
          word?: string
        }
        Relationships: []
      }
      writing_analysis_cache: {
        Row: {
          access_count: number | null
          analysis_result: Json
          content_hash: string
          created_at: string | null
          id: string
          last_accessed: string | null
          question_prompt: string | null
          user_id: string | null
          user_submission: string
        }
        Insert: {
          access_count?: number | null
          analysis_result: Json
          content_hash: string
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          question_prompt?: string | null
          user_id?: string | null
          user_submission: string
        }
        Update: {
          access_count?: number | null
          analysis_result?: Json
          content_hash?: string
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          question_prompt?: string | null
          user_id?: string | null
          user_submission?: string
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
      cleanup_expired_admin_sessions: { Args: never; Returns: undefined }
      cleanup_expired_audio: { Args: never; Returns: undefined }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_translation_queue: { Args: never; Returns: undefined }
      cleanup_writing_analysis_cache: { Args: never; Returns: undefined }
      get_audio_analytics_summary: {
        Args: { days_back?: number }
        Returns: {
          avg_file_size: number
          cache_hit_rate: number
          cache_hits: number
          total_egress_bytes: number
          total_generations: number
          total_plays: number
          unique_questions: number
        }[]
      }
      get_cards_needing_translation: {
        Args: { p_languages: string[]; p_limit: number; p_offset: number }
        Returns: {
          context_sentence: string
          id: string
          term: string
        }[]
      }
      get_cards_needing_translation_v2: {
        Args: {
          card_limit?: number
          continue_from_id?: string
          target_count?: number
        }
        Returns: {
          id: string
          term: string
        }[]
      }
      get_storage_stats: {
        Args: never
        Returns: {
          avg_bytes: number
          bucket_id: string
          file_count: number
          total_bytes: number
        }[]
      }
      get_translation_stats: {
        Args: never
        Returns: {
          last_translation: string
          total_translations: number
          unique_cards: number
        }[]
      }
      grant_admin_role: { Args: { user_email: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_translations_on_content_change: {
        Args: never
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      reset_daily_blog_counter: { Args: never; Returns: undefined }
      set_user_as_admin: { Args: { user_email: string }; Returns: undefined }
      update_question_numbering: { Args: never; Returns: undefined }
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
      app_role: "admin" | "premium" | "user"
      pte_section_type:
      | "read_aloud"
      | "repeat_sentence"
      | "describe_image"
      | "retell_lecture"
      | "answer_short_question"
      | "summarize_group_discussion"
      | "respond_to_situation"
      | "summarize_written_text"
      | "write_essay"
      | "fill_blanks_dropdown"
      | "mcq_multiple_answers"
      | "reorder_paragraph"
      | "fill_blanks_drag_drop"
      | "mcq_single_answer"
      | "summarize_spoken_text"
      | "listening_mcq_multiple"
      | "fill_blanks_type_in"
      | "highlight_correct_summary"
      | "listening_mcq_single"
      | "select_missing_word"
      | "highlight_incorrect_words"
      | "write_from_dictation"
      pte_skill: "speaking_writing" | "reading" | "listening"
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
    Enums: {
      app_role: ["admin", "premium", "user"],
      pte_section_type: [
        "read_aloud",
        "repeat_sentence",
        "describe_image",
        "retell_lecture",
        "answer_short_question",
        "summarize_group_discussion",
        "respond_to_situation",
        "summarize_written_text",
        "write_essay",
        "fill_blanks_dropdown",
        "mcq_multiple_answers",
        "reorder_paragraph",
        "fill_blanks_drag_drop",
        "mcq_single_answer",
        "summarize_spoken_text",
        "listening_mcq_multiple",
        "fill_blanks_type_in",
        "highlight_correct_summary",
        "listening_mcq_single",
        "select_missing_word",
        "highlight_incorrect_words",
        "write_from_dictation",
      ],
      pte_skill: ["speaking_writing", "reading", "listening"],
    },
  },
} as const
