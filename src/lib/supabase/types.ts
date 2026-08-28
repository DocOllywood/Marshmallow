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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback: {
        Row: {
          comment: string | null
          context: string
          created_at: string
          id: string
          marshmallow_id: string | null
          rating: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          context: string
          created_at?: string
          id?: string
          marshmallow_id?: string | null
          rating: string
          user_id: string
        }
        Update: {
          comment?: string | null
          context?: string
          created_at?: string
          id?: string
          marshmallow_id?: string | null
          rating?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          archetype: Database["public"]["Enums"]["question_archetype"]
          choices: Json
          created_at: string
          created_by: string | null
          entity_label: string | null
          freshness: Database["public"]["Enums"]["content_freshness"]
          id: string
          minimum_result_sample: number | null
          name: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          spoiler_context: string | null
          topic_id: string | null
        }
        Insert: {
          archetype?: Database["public"]["Enums"]["question_archetype"]
          choices?: Json
          created_at?: string
          created_by?: string | null
          entity_label?: string | null
          freshness?: Database["public"]["Enums"]["content_freshness"]
          id?: string
          minimum_result_sample?: number | null
          name: string
          play_mode?: Database["public"]["Enums"]["play_mode"]
          question: string
          spoiler_context?: string | null
          topic_id?: string | null
        }
        Update: {
          archetype?: Database["public"]["Enums"]["question_archetype"]
          choices?: Json
          created_at?: string
          created_by?: string | null
          entity_label?: string | null
          freshness?: Database["public"]["Enums"]["content_freshness"]
          id?: string
          minimum_result_sample?: number | null
          name?: string
          play_mode?: Database["public"]["Enums"]["play_mode"]
          question?: string
          spoiler_context?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_templates_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      crowdsense_ratings: {
        Row: {
          accuracy_sum: number
          adjusted_accuracy: number
          category_id: string | null
          qualified: boolean
          rating: number | null
          rebuilt_at: string
          scored_count: number
          user_id: string
        }
        Insert: {
          accuracy_sum: number
          adjusted_accuracy: number
          category_id?: string | null
          qualified: boolean
          rating?: number | null
          rebuilt_at?: string
          scored_count: number
          user_id: string
        }
        Update: {
          accuracy_sum?: number
          adjusted_accuracy?: number
          category_id?: string | null
          qualified?: boolean
          rating?: number | null
          rebuilt_at?: string
          scored_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crowdsense_ratings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crowdsense_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crowdsense_weekly: {
        Row: {
          accuracy_sum: number
          adjusted_accuracy: number
          qualified: boolean
          rating: number | null
          rebuilt_at: string
          scored_count: number
          user_id: string
          week_start: string
        }
        Insert: {
          accuracy_sum: number
          adjusted_accuracy: number
          qualified: boolean
          rating?: number | null
          rebuilt_at?: string
          scored_count: number
          user_id: string
          week_start: string
        }
        Update: {
          accuracy_sum?: number
          adjusted_accuracy?: number
          qualified?: boolean
          rating?: number | null
          rebuilt_at?: string
          scored_count?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "crowdsense_weekly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          marshmallow_id: string | null
          notification_id: string | null
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          template: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          marshmallow_id?: string | null
          notification_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          marshmallow_id?: string | null
          notification_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          created_at: string
          draft_updated_at: string
          id: string
          idempotency_key: string | null
          marshmallow_id: string
          own_choice_id: string | null
          sealed_at: string | null
          switch_original_choice_id: string | null
          switch_stayed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_updated_at?: string
          id?: string
          idempotency_key?: string | null
          marshmallow_id: string
          own_choice_id?: string | null
          sealed_at?: string | null
          switch_original_choice_id?: string | null
          switch_stayed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_updated_at?: string
          id?: string
          idempotency_key?: string | null
          marshmallow_id?: string
          own_choice_id?: string | null
          sealed_at?: string | null
          switch_original_choice_id?: string | null
          switch_stayed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_own_choice_id_fkey"
            columns: ["own_choice_id"]
            isOneToOne: false
            referencedRelation: "marshmallow_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_allocations: {
        Row: {
          choice_id: string
          entry_id: string
          predicted_pct: number
        }
        Insert: {
          choice_id: string
          entry_id: string
          predicted_pct: number
        }
        Update: {
          choice_id?: string
          entry_id?: string
          predicted_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "entry_allocations_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "marshmallow_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_allocations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_runs: {
        Row: {
          actor_id: string | null
          closed_count: number
          details: Json
          error_count: number
          id: string
          opened_count: number
          ran_at: string
          revealed_count: number
          source: string
        }
        Insert: {
          actor_id?: string | null
          closed_count?: number
          details?: Json
          error_count?: number
          id?: string
          opened_count?: number
          ran_at?: string
          revealed_count?: number
          source: string
        }
        Update: {
          actor_id?: string | null
          closed_count?: number
          details?: Json
          error_count?: number
          id?: string
          opened_count?: number
          ran_at?: string
          revealed_count?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_runs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marshmallow_choices: {
        Row: {
          created_at: string
          id: string
          label: string
          marshmallow_id: string
          metadata: Json
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          marshmallow_id: string
          metadata?: Json
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          marshmallow_id?: string
          metadata?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "marshmallow_choices_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
        ]
      }
      marshmallow_editorial: {
        Row: {
          archetype: Database["public"]["Enums"]["question_archetype"]
          checklist: Json
          content_set_id: string | null
          freshness: Database["public"]["Enums"]["content_freshness"]
          marshmallow_id: string
          set_position: number
        }
        Insert: {
          archetype?: Database["public"]["Enums"]["question_archetype"]
          checklist?: Json
          content_set_id?: string | null
          freshness?: Database["public"]["Enums"]["content_freshness"]
          marshmallow_id: string
          set_position?: number
        }
        Update: {
          archetype?: Database["public"]["Enums"]["question_archetype"]
          checklist?: Json
          content_set_id?: string | null
          freshness?: Database["public"]["Enums"]["content_freshness"]
          marshmallow_id?: string
          set_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "marshmallow_editorial_content_set_id_fkey"
            columns: ["content_set_id"]
            isOneToOne: false
            referencedRelation: "content_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marshmallow_editorial_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: true
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
        ]
      }
      marshmallow_result_choices: {
        Row: {
          choice_id: string
          marshmallow_id: string
          vote_count: number
          vote_pct: number
        }
        Insert: {
          choice_id: string
          marshmallow_id: string
          vote_count: number
          vote_pct: number
        }
        Update: {
          choice_id?: string
          marshmallow_id?: string
          vote_count?: number
          vote_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "marshmallow_result_choices_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "marshmallow_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marshmallow_result_choices_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallow_results"
            referencedColumns: ["marshmallow_id"]
          },
        ]
      }
      marshmallow_results: {
        Row: {
          computed_at: string
          marshmallow_id: string
          total_sealed_votes: number
        }
        Insert: {
          computed_at?: string
          marshmallow_id: string
          total_sealed_votes: number
        }
        Update: {
          computed_at?: string
          marshmallow_id?: string
          total_sealed_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "marshmallow_results_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: true
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rounds: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          principle_id: string | null
          round_date: string
          status: Database["public"]["Enums"]["marshmallow_status"]
          subtitle: string | null
          tension_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          principle_id?: string | null
          round_date: string
          status?: Database["public"]["Enums"]["marshmallow_status"]
          subtitle?: string | null
          tension_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          principle_id?: string | null
          round_date?: string
          status?: Database["public"]["Enums"]["marshmallow_status"]
          subtitle?: string | null
          tension_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_rounds_principle_id_fkey"
            columns: ["principle_id"]
            isOneToOne: false
            referencedRelation: "belief_principles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rounds_tension_id_fkey"
            columns: ["tension_id"]
            isOneToOne: false
            referencedRelation: "human_tensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rounds_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      belief_principles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      human_tensions: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_label: string
          id: string
          left_label: string
          right_label: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_label: string
          id?: string
          left_label: string
          right_label: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_label?: string
          id?: string
          left_label?: string
          right_label?: string
          slug?: string
        }
        Relationships: []
      }
      marshmallows: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          daily_round_id: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          round_position: number | null
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          switch_prompt: string | null
          is_line: boolean
          metadata: Json
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          closes_at: string
          created_at?: string
          created_by?: string | null
          daily_on?: string | null
          daily_round_id?: string | null
          entity_label?: string | null
          expires_at?: string | null
          hard_reveals_at: string
          id?: string
          image_url?: string | null
          is_daily?: boolean
          minimum_result_sample?: number
          opens_at: string
          play_mode?: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority?: number | null
          result_available_at?: string | null
          reveals_at: string
          round_position?: number | null
          spoiler_context?: string | null
          status?: Database["public"]["Enums"]["marshmallow_status"]
          switch_prompt?: string | null
          is_line?: boolean
          metadata?: Json
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          closes_at?: string
          created_at?: string
          created_by?: string | null
          daily_on?: string | null
          daily_round_id?: string | null
          entity_label?: string | null
          expires_at?: string | null
          hard_reveals_at?: string
          id?: string
          image_url?: string | null
          is_daily?: boolean
          is_line?: boolean
          minimum_result_sample?: number
          opens_at?: string
          play_mode?: Database["public"]["Enums"]["play_mode"]
          question?: string
          quick_priority?: number | null
          result_available_at?: string | null
          reveals_at?: string
          round_position?: number | null
          spoiler_context?: string | null
          status?: Database["public"]["Enums"]["marshmallow_status"]
          switch_prompt?: string | null
          metadata?: Json
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marshmallows_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marshmallows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marshmallows_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          email_daily: boolean
          email_reveal_ready: boolean
          email_streak: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_daily?: boolean
          email_reveal_ready?: boolean
          email_streak?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_daily?: boolean
          email_reveal_ready?: boolean
          email_streak?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          marshmallow_id: string | null
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marshmallow_id?: string | null
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marshmallow_id?: string | null
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          marshmallow_id: string | null
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          marshmallow_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          marshmallow_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_events_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          onboarding_completed_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          onboarding_completed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          marshmallow_id: string | null
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          marshmallow_id?: string | null
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          marshmallow_id?: string | null
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_usernames: {
        Row: {
          username: string
        }
        Insert: {
          username: string
        }
        Update: {
          username?: string
        }
        Relationships: []
      }
      reveal_opens: {
        Row: {
          base_points: number
          id: string
          marshmallow_id: string
          opened_at: string
          reveal_bonus_earned: boolean
          reveal_bonus_points: number
          reveal_streak_qualified: boolean
          user_id: string
        }
        Insert: {
          base_points: number
          id?: string
          marshmallow_id: string
          opened_at?: string
          reveal_bonus_earned?: boolean
          reveal_bonus_points?: number
          reveal_streak_qualified?: boolean
          user_id: string
        }
        Update: {
          base_points?: number
          id?: string
          marshmallow_id?: string
          opened_at?: string
          reveal_bonus_earned?: boolean
          reveal_bonus_points?: number
          reveal_streak_qualified?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reveal_opens_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reveal_opens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          accuracy: number
          base_points: number
          calculated_at: string
          marshmallow_id: string
          user_id: string
        }
        Insert: {
          accuracy: number
          base_points: number
          calculated_at?: string
          marshmallow_id: string
          user_id: string
        }
        Update: {
          accuracy?: number
          base_points?: number
          calculated_at?: string
          marshmallow_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_cards: {
        Row: {
          created_at: string
          id: string
          marshmallow_id: string
          public_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marshmallow_id: string
          public_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marshmallow_id?: string
          public_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_cards_marshmallow_id_fkey"
            columns: ["marshmallow_id"]
            isOneToOne: false
            referencedRelation: "marshmallows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_visits: {
        Row: {
          created_at: string
          id: string
          play_clicked_at: string | null
          public_id: string
          signup_user_id: string | null
          visitor_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          play_clicked_at?: string | null
          public_id: string
          signup_user_id?: string | null
          visitor_token: string
        }
        Update: {
          created_at?: string
          id?: string
          play_clicked_at?: string | null
          public_id?: string
          signup_user_id?: string | null
          visitor_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_visits_public_id_fkey"
            columns: ["public_id"]
            isOneToOne: false
            referencedRelation: "share_cards"
            referencedColumns: ["public_id"]
          },
          {
            foreignKeyName: "share_visits_signup_user_id_fkey"
            columns: ["signup_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          play_current: number
          play_last_qualifying_on: string | null
          play_longest: number
          reveal_current: number
          reveal_last_qualifying_on: string | null
          reveal_longest: number
          updated_at: string
          user_id: string
        }
        Insert: {
          play_current?: number
          play_last_qualifying_on?: string | null
          play_longest?: number
          reveal_current?: number
          reveal_last_qualifying_on?: string | null
          reveal_longest?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          play_current?: number
          play_last_qualifying_on?: string | null
          play_longest?: number
          reveal_current?: number
          reveal_last_qualifying_on?: string | null
          reveal_longest?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["topic_kind"]
          metadata: Json
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          kind: Database["public"]["Enums"]["topic_kind"]
          metadata?: Json
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["topic_kind"]
          metadata?: Json
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_prefs: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_prefs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_archive_marshmallow: {
        Args: { p_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_batch_create_quick: {
        Args: {
          p_archetype?: Database["public"]["Enums"]["question_archetype"]
          p_choice_a?: string
          p_choice_b?: string
          p_questions: string[]
          p_set_id?: string
          p_topic_id?: string
        }
        Returns: Json
      }
      admin_bulk_schedule_set: {
        Args: { p_base_opens_at: string; p_set_id: string }
        Returns: Json
      }
      admin_create_content_set: {
        Args: { p_name: string; p_notes?: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "content_sets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_create_from_template: {
        Args: { p_template_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_duplicate_marshmallow: {
        Args: { p_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_emergency_close: {
        Args: { p_id: string; p_reason: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_promote_next_quick: {
        Args: never
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_rebuild_crowdsense: { Args: never; Returns: undefined }
      admin_save_editorial: {
        Args: {
          p_archetype?: Database["public"]["Enums"]["question_archetype"]
          p_checklist?: Json
          p_content_set_id?: string
          p_entity_label?: string
          p_expires_at?: string
          p_freshness?: Database["public"]["Enums"]["content_freshness"]
          p_image_url?: string
          p_marshmallow_id: string
          p_set_position?: number
          p_spoiler_context?: string
        }
        Returns: undefined
      }
      admin_save_template: {
        Args: { p_marshmallow_id: string; p_name?: string }
        Returns: {
          archetype: Database["public"]["Enums"]["question_archetype"]
          choices: Json
          created_at: string
          created_by: string | null
          entity_label: string | null
          freshness: Database["public"]["Enums"]["content_freshness"]
          id: string
          minimum_result_sample: number | null
          name: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          spoiler_context: string | null
          topic_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "content_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_schedule_marshmallow: {
        Args: { p_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_quick_priority: {
        Args: { p_id: string; p_priority: number }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_marshmallow: {
        Args: {
          p_choices: Json
          p_closes_at: string
          p_hard_reveals_at?: string
          p_id?: string
          p_is_daily?: boolean
          p_minimum_result_sample?: number
          p_opens_at: string
          p_play_mode?: Database["public"]["Enums"]["play_mode"]
          p_question: string
          p_reveals_at: string
          p_topic_id?: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          closes_at: string
          created_at: string
          created_by: string | null
          daily_on: string | null
          entity_label: string | null
          expires_at: string | null
          hard_reveals_at: string
          id: string
          image_url: string | null
          is_daily: boolean
          minimum_result_sample: number
          opens_at: string
          play_mode: Database["public"]["Enums"]["play_mode"]
          question: string
          quick_priority: number | null
          result_available_at: string | null
          reveals_at: string
          spoiler_context: string | null
          status: Database["public"]["Enums"]["marshmallow_status"]
          topic_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marshmallows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      allocate_fallback_username: {
        Args: { p_user_id: string }
        Returns: string
      }
      apply_daily_play_streak: {
        Args: { p_daily_on: string; p_user_id: string }
        Returns: undefined
      }
      apply_daily_reveal_streak: {
        Args: { p_daily_on: string; p_user_id: string }
        Returns: undefined
      }
      assert_admin: { Args: never; Returns: string }
      attribute_share_signup: {
        Args: { p_public_id: string; p_visitor_token: string }
        Returns: undefined
      }
      claim_email_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          marshmallow_id: string | null
          notification_id: string | null
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          template: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_onboarding: {
        Args: { p_display_name?: string; p_topic_ids: string[] }
        Returns: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          onboarding_completed_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_share_card: {
        Args: { p_marshmallow_id: string }
        Returns: {
          created_at: string
          id: string
          marshmallow_id: string
          public_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "share_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crowdsense_adjusted: {
        Args: { p_count: number; p_sum: number; p_weight: number }
        Returns: number
      }
      crowdsense_map_rating: { Args: { p_adjusted: number }; Returns: number }
      crowdsense_utc_week_start: { Args: { p_at?: string }; Returns: string }
      crowdsense_world_id: { Args: { p_topic_id: string }; Returns: string }
      current_profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      enqueue_reveal_ready_notifications: {
        Args: { p_marshmallow_id: string }
        Returns: number
      }
      finalize_marshmallow: {
        Args: { p_marshmallow_id: string }
        Returns: undefined
      }
      get_accuracy_calibration: { Args: never; Returns: Json }
      get_beta_cohorts: { Args: never; Returns: Json }
      get_beta_health: { Args: never; Returns: Json }
      get_content_calendar: { Args: never; Returns: Json }
      get_content_health: { Args: never; Returns: Json }
      get_content_inventory: { Args: never; Returns: Json }
      get_editorial_comparisons: { Args: never; Returns: Json }
      get_growth_metrics: { Args: never; Returns: Json }
      get_leaderboard: { Args: { p_board: string }; Returns: Json }
      get_marshmallow_results: {
        Args: { p_marshmallow_id: string }
        Returns: {
          choice_id: string
          computed_at: string
          marshmallow_id: string
          total_sealed_votes: number
          vote_count: number
          vote_pct: number
        }[]
      }
      get_mode_payoff_metrics: { Args: never; Returns: Json }
      get_public_player: { Args: { p_username: string }; Returns: Json }
      get_public_share: { Args: { p_public_id: string }; Returns: Json }
      get_quick_sample_health: { Args: never; Returns: Json }
      get_quick_test_session: { Args: never; Returns: Json }
      get_reveal_return_metrics: { Args: never; Returns: Json }
      get_reveal_return_metrics_by_mode: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_revealed: { Args: { p_marshmallow_id: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_valid_username: { Args: { p_username: string }; Returns: boolean }
      list_beta_feedback: { Args: never; Returns: Json }
      mark_share_play: {
        Args: { p_public_id: string; p_visitor_token: string }
        Returns: undefined
      }
      new_share_public_id: { Args: never; Returns: string }
      open_reveal: {
        Args: { p_marshmallow_id: string }
        Returns: {
          base_points: number
          id: string
          marshmallow_id: string
          opened_at: string
          reveal_bonus_earned: boolean
          reveal_bonus_points: number
          reveal_streak_qualified: boolean
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reveal_opens"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ready_to_finalize: {
        Args: { p_marshmallow_id: string }
        Returns: boolean
      }
      rebuild_crowdsense: { Args: { p_user_id?: string }; Returns: undefined }
      record_product_event: {
        Args: {
          p_event_type: string
          p_marshmallow_id: string
          p_payload?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      record_share_visit: {
        Args: { p_public_id: string; p_visitor_token: string }
        Returns: undefined
      }
      refill_promoted_quicks: { Args: never; Returns: number }
      reveal_bonus_points: { Args: { p_base_points: number }; Returns: number }
      run_due_lifecycle: {
        Args: { p_source?: string }
        Returns: {
          actor_id: string | null
          closed_count: number
          details: Json
          error_count: number
          id: string
          opened_count: number
          ran_at: string
          revealed_count: number
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "lifecycle_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seal_line_entry: {
        Args: {
          p_idempotency_key?: string
          p_marshmallow_id: string
          p_own_choice_id: string
        }
        Returns: {
          created_at: string
          draft_updated_at: string
          id: string
          idempotency_key: string | null
          marshmallow_id: string
          own_choice_id: string | null
          sealed_at: string | null
          switch_original_choice_id: string | null
          switch_stayed: boolean | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_switch_response: {
        Args: {
          p_marshmallow_id: string
          p_switch_stayed: boolean
        }
        Returns: {
          created_at: string
          draft_updated_at: string
          id: string
          idempotency_key: string | null
          marshmallow_id: string
          own_choice_id: string | null
          sealed_at: string | null
          switch_original_choice_id: string | null
          switch_stayed: boolean | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_entry_draft: {
        Args: {
          p_allocations?: Json
          p_marshmallow_id: string
          p_own_choice_id: string
        }
        Returns: {
          created_at: string
          draft_updated_at: string
          id: string
          idempotency_key: string | null
          marshmallow_id: string
          own_choice_id: string | null
          sealed_at: string | null
          switch_original_choice_id: string | null
          switch_stayed: boolean | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seal_entry: {
        Args: {
          p_allocations: Json
          p_idempotency_key?: string
          p_marshmallow_id: string
          p_own_choice_id: string
        }
        Returns: {
          created_at: string
          draft_updated_at: string
          id: string
          idempotency_key: string | null
          marshmallow_id: string
          own_choice_id: string | null
          sealed_at: string | null
          switch_original_choice_id: string | null
          switch_stayed: boolean | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_beta_feedback: {
        Args: {
          p_comment?: string
          p_context: string
          p_marshmallow_id?: string
          p_rating: string
        }
        Returns: undefined
      }
      track_product_event: {
        Args: {
          p_event_type: string
          p_marshmallow_id?: string
          p_payload?: Json
        }
        Returns: undefined
      }
      write_admin_audit: {
        Args: { p_action: string; p_entity_id: string; p_metadata?: Json }
        Returns: undefined
      }
    }
    Enums: {
      content_freshness: "evergreen" | "timely" | "event_specific"
      marshmallow_status:
        | "draft"
        | "scheduled"
        | "open"
        | "closed"
        | "revealed"
        | "archived"
        | "cancelled"
      play_mode: "quick" | "live" | "daily"
      question_archetype:
        | "who_won"
        | "who_lost"
        | "pick_one"
        | "will_it_happen"
        | "who_will"
        | "agree_disagree"
        | "lasting_power"
        | "side_with"
        | "better_moment"
        | "freeform"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      topic_kind: "category" | "fandom" | "show" | "celebrity" | "event"
      user_role: "user" | "moderator" | "admin"
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
      content_freshness: ["evergreen", "timely", "event_specific"],
      marshmallow_status: [
        "draft",
        "scheduled",
        "open",
        "closed",
        "revealed",
        "archived",
        "cancelled",
      ],
      play_mode: ["quick", "live", "daily"],
      question_archetype: [
        "who_won",
        "who_lost",
        "pick_one",
        "will_it_happen",
        "who_will",
        "agree_disagree",
        "lasting_power",
        "side_with",
        "better_moment",
        "freeform",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      topic_kind: ["category", "fandom", "show", "celebrity", "event"],
      user_role: ["user", "moderator", "admin"],
    },
  },
} as const
