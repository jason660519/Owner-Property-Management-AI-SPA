export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_authorizations: {
        Row: {
          agent_id: string
          authorization_level: string
          created_at: string
          created_by: string | null
          id: string
          landlord_id: string
          notes: string | null
          permissions: Json | null
          property_ids: string[] | null
          property_type: string | null
          status: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          agent_id: string
          authorization_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          landlord_id: string
          notes?: string | null
          permissions?: Json | null
          property_ids?: string[] | null
          property_type?: string | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          agent_id?: string
          authorization_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          landlord_id?: string
          notes?: string | null
          permissions?: Json | null
          property_ids?: string[] | null
          property_type?: string | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_authorizations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_authorizations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_authorizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_authorizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_authorizations_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_authorizations_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_directory: {
        Row: {
          agent_name: string
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          landlord_id: string
          license_number: string | null
          notes: string | null
          phone_number: string
          rating: number | null
          specialization: string[] | null
          updated_at: string
        }
        Insert: {
          agent_name: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          landlord_id: string
          license_number?: string | null
          notes?: string | null
          phone_number: string
          rating?: number | null
          specialization?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_name?: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          landlord_id?: string
          license_number?: string | null
          notes?: string | null
          phone_number?: string
          rating?: number | null
          specialization?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_directory_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_directory_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      adapter_evaluation_runs: {
        Row: {
          adapter_id: string
          adapter_option_label: string
          channel: string
          created_at: string
          effective_model: string
          error_type: string | null
          evaluation_level: string
          evaluation_message: string
          http_status: number | null
          id: string
          model_source: string
          provider: string
          raw_output: string | null
          rendered_output: string | null
          requested_model: string
          result_summary: string
          tokens_per_sec: number | null
          ttft_ms: number | null
          e2e_ms: number | null
          user_id: string
        }
        Insert: {
          adapter_id: string
          adapter_option_label: string
          channel: string
          created_at?: string
          effective_model?: string
          error_type?: string | null
          evaluation_level: string
          evaluation_message?: string
          http_status?: number | null
          id?: string
          model_source?: string
          provider: string
          raw_output?: string | null
          rendered_output?: string | null
          requested_model?: string
          result_summary?: string
          tokens_per_sec?: number | null
          ttft_ms?: number | null
          e2e_ms?: number | null
          user_id: string
        }
        Update: {
          adapter_id?: string
          adapter_option_label?: string
          channel?: string
          created_at?: string
          effective_model?: string
          error_type?: string | null
          evaluation_level?: string
          evaluation_message?: string
          http_status?: number | null
          id?: string
          model_source?: string
          provider?: string
          raw_output?: string | null
          rendered_output?: string | null
          requested_model?: string
          result_summary?: string
          tokens_per_sec?: number | null
          ttft_ms?: number | null
          e2e_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adapter_evaluation_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_model_assignments: {
        Row: {
          agent_key: string
          created_at: string
          fallbacks: Json
          guardrails: Json
          id: string
          is_enabled: boolean
          notes: string | null
          primary_config: Json
          primary_model_id: string
          primary_provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_key: string
          created_at?: string
          fallbacks?: Json
          guardrails?: Json
          id?: string
          is_enabled?: boolean
          notes?: string | null
          primary_config?: Json
          primary_model_id: string
          primary_provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_key?: string
          created_at?: string
          fallbacks?: Json
          guardrails?: Json
          id?: string
          is_enabled?: boolean
          notes?: string | null
          primary_config?: Json
          primary_model_id?: string
          primary_provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_model_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_api_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          is_valid: boolean | null
          iv: string
          last_validated_at: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_valid?: boolean | null
          iv: string
          last_validated_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_valid?: boolean | null
          iv?: string
          last_validated_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_rate_limits: {
        Row: {
          called_at: string
          endpoint_key: string
          id: number
          user_id: string
        }
        Insert: {
          called_at?: string
          endpoint_key: string
          id?: number
          user_id: string
        }
        Update: {
          called_at?: string
          endpoint_key?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_logs: {
        Row: {
          content: Json
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          id: string
          model_id: string | null
          provider: string | null
          session_id: string | null
          started_at: string | null
          tokens_input: number
          tokens_output: number
          tokens_total: number | null
          user_id: string
        }
        Insert: {
          content?: Json
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          model_id?: string | null
          provider?: string | null
          session_id?: string | null
          started_at?: string | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number | null
          user_id: string
        }
        Update: {
          content?: Json
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          model_id?: string | null
          provider?: string | null
          session_id?: string | null
          started_at?: string | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          ai_model: string
          context: Json | null
          conversation_type: string
          created_at: string
          ended_at: string | null
          entities_extracted: Json | null
          id: string
          intent_detected: string | null
          messages: Json
          sentiment_analysis: Json | null
          session_id: string
          started_at: string
          total_cost: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          ai_model: string
          context?: Json | null
          conversation_type: string
          created_at?: string
          ended_at?: string | null
          entities_extracted?: Json | null
          id?: string
          intent_detected?: string | null
          messages?: Json
          sentiment_analysis?: Json | null
          session_id: string
          started_at?: string
          total_cost?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          ai_model?: string
          context?: Json | null
          conversation_type?: string
          created_at?: string
          ended_at?: string | null
          entities_extracted?: Json | null
          id?: string
          intent_detected?: string | null
          messages?: Json
          sentiment_analysis?: Json | null
          session_id?: string
          started_at?: string
          total_cost?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_key_validation_cache: {
        Row: {
          available_models: string[]
          key_id: string
          provider: string
          user_id: string
          validated_at: string
        }
        Insert: {
          available_models?: string[]
          key_id: string
          provider: string
          user_id: string
          validated_at?: string
        }
        Update: {
          available_models?: string[]
          key_id?: string
          provider?: string
          user_id?: string
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_key_validation_cache_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "ai_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_key_validation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_evaluations: {
        Row: {
          created_at: string
          display_status_override: string | null
          id: string
          is_candidate: boolean
          is_working: boolean
          last_tested_at: string | null
          model_id: string
          model_name: string
          notes: string | null
          provider: string
          specialties: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_status_override?: string | null
          id?: string
          is_candidate?: boolean
          is_working?: boolean
          last_tested_at?: string | null
          model_id: string
          model_name: string
          notes?: string | null
          provider: string
          specialties?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_status_override?: string | null
          id?: string
          is_candidate?: boolean
          is_working?: boolean
          last_tested_at?: string | null
          model_id?: string
          model_name?: string
          notes?: string | null
          provider?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_research_reports: {
        Row: {
          capabilities: Json
          company_name: string | null
          context_window: number | null
          created_at: string
          generated_at: string
          generation_error: string | null
          generation_status: string
          generator_model: string
          generator_provider: string
          id: string
          input_price_per_1m: number | null
          knowledge_cutoff: string | null
          model_id: string
          model_name: string
          output_price_per_1m: number | null
          provider: string
          report_markdown: string
          source_urls: string[]
          updated_at: string
          user_id: string
          version_label: string | null
        }
        Insert: {
          capabilities?: Json
          company_name?: string | null
          context_window?: number | null
          created_at?: string
          generated_at?: string
          generation_error?: string | null
          generation_status?: string
          generator_model: string
          generator_provider: string
          id?: string
          input_price_per_1m?: number | null
          knowledge_cutoff?: string | null
          model_id: string
          model_name: string
          output_price_per_1m?: number | null
          provider: string
          report_markdown?: string
          source_urls?: string[]
          updated_at?: string
          user_id: string
          version_label?: string | null
        }
        Update: {
          capabilities?: Json
          company_name?: string | null
          context_window?: number | null
          created_at?: string
          generated_at?: string
          generation_error?: string | null
          generation_status?: string
          generator_model?: string
          generator_provider?: string
          id?: string
          input_price_per_1m?: number | null
          knowledge_cutoff?: string | null
          model_id?: string
          model_name?: string
          output_price_per_1m?: number | null
          provider?: string
          report_markdown?: string
          source_urls?: string[]
          updated_at?: string
          user_id?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_research_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_role_assignments: {
        Row: {
          classified_at: string
          classified_by: string
          confidence: number
          id: string
          model_id: string
          provider: string
          source: string
          tag_key: string
          user_id: string
        }
        Insert: {
          classified_at?: string
          classified_by?: string
          confidence?: number
          id?: string
          model_id: string
          provider: string
          source?: string
          tag_key: string
          user_id: string
        }
        Update: {
          classified_at?: string
          classified_by?: string
          confidence?: number
          id?: string
          model_id?: string
          provider?: string
          source?: string
          tag_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_role_assignments_tag_key_fkey"
            columns: ["tag_key"]
            isOneToOne: false
            referencedRelation: "ai_model_role_tags"
            referencedColumns: ["tag_key"]
          },
          {
            foreignKeyName: "ai_model_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_role_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          sort_order: number
          tag_key: string
          tag_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          sort_order?: number
          tag_key: string
          tag_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          sort_order?: number
          tag_key?: string
          tag_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_model_selections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          model_id: string
          model_name: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          model_id: string
          model_name: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          model_id?: string
          model_name?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_modules_assigned_function: {
        Row: {
          assigned_function: string
          assigned_model: string | null
          assigned_models: Json
          assigned_provider: string | null
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_function: string
          assigned_model?: string | null
          assigned_models?: Json
          assigned_provider?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_function?: string
          assigned_model?: string | null
          assigned_models?: Json
          assigned_provider?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_performance_metrics: {
        Row: {
          completion_tokens: number | null
          created_at: string
          id: string
          latency_ms: number | null
          model_id: string | null
          prompt_tokens: number | null
          request_id: string | null
          total_cost: number | null
          user_feedback_score: number | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          model_id?: string | null
          prompt_tokens?: number | null
          request_id?: string | null
          total_cost?: number | null
          user_feedback_score?: number | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          model_id?: string | null
          prompt_tokens?: number | null
          request_id?: string | null
          total_cost?: number | null
          user_feedback_score?: number | null
        }
        Relationships: []
      }
      ai_prompt_audit_logs: {
        Row: {
          agent_key: string | null
          ai_system_prompt_id: string | null
          created_at: string
          error_message: string | null
          id: string
          injection_flags: string[]
          input_tokens: number | null
          latency_ms: number | null
          model_id: string
          module_key: string
          output_tokens: number | null
          prompt_source: string | null
          provider: string
          saved_prompt_id: string | null
          status: string
          user_id: string | null
          user_input_length: number | null
          user_input_sha256: string | null
        }
        Insert: {
          agent_key?: string | null
          ai_system_prompt_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          injection_flags?: string[]
          input_tokens?: number | null
          latency_ms?: number | null
          model_id: string
          module_key: string
          output_tokens?: number | null
          prompt_source?: string | null
          provider: string
          saved_prompt_id?: string | null
          status: string
          user_id?: string | null
          user_input_length?: number | null
          user_input_sha256?: string | null
        }
        Update: {
          agent_key?: string | null
          ai_system_prompt_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          injection_flags?: string[]
          input_tokens?: number | null
          latency_ms?: number | null
          model_id?: string
          module_key?: string
          output_tokens?: number | null
          prompt_source?: string | null
          provider?: string
          saved_prompt_id?: string | null
          status?: string
          user_id?: string | null
          user_input_length?: number | null
          user_input_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_audit_logs_ai_system_prompt_id_fkey"
            columns: ["ai_system_prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_system_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_audit_logs_saved_prompt_id_fkey"
            columns: ["saved_prompt_id"]
            isOneToOne: false
            referencedRelation: "saved_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings_validation_summary: {
        Row: {
          total_models: number
          updated_at: string
          user_id: string
          validated_count: number
        }
        Insert: {
          total_models?: number
          updated_at?: string
          user_id: string
          validated_count?: number
        }
        Update: {
          total_models?: number
          updated_at?: string
          user_id?: string
          validated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_validation_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_system_prompts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          module_key: string
          prompt_content: string
          prompt_name: string
          provider: string
          source_saved_prompt_id: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          module_key: string
          prompt_content?: string
          prompt_name?: string
          provider: string
          source_saved_prompt_id?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          module_key?: string
          prompt_content?: string
          prompt_name?: string
          provider?: string
          source_saved_prompt_id?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_system_prompts_source_saved_prompt_id_fkey"
            columns: ["source_saved_prompt_id"]
            isOneToOne: false
            referencedRelation: "saved_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_system_prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          final_prompt_hash: string | null
          id: string
          model_id: string
          module_key: string | null
          prompt_module_key: string | null
          prompt_name: string | null
          prompt_source: string | null
          prompt_version: number | null
          provider: string
          request_path: string | null
          response_status: number | null
          status: string | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          final_prompt_hash?: string | null
          id?: string
          model_id: string
          module_key?: string | null
          prompt_module_key?: string | null
          prompt_name?: string | null
          prompt_source?: string | null
          prompt_version?: number | null
          provider: string
          request_path?: string | null
          response_status?: number | null
          status?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          final_prompt_hash?: string | null
          id?: string
          model_id?: string
          module_key?: string | null
          prompt_module_key?: string | null
          prompt_name?: string | null
          prompt_source?: string | null
          prompt_version?: number | null
          provider?: string
          request_path?: string | null
          response_status?: number | null
          status?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      anthropic_credit_guard: {
        Row: {
          alert_threshold_usd: number
          circuit_breaker_active: boolean
          circuit_breaker_restored_at: string | null
          circuit_breaker_threshold_usd: number
          circuit_breaker_tripped_at: string | null
          created_at: string
          id: string
          last_alert_fired_at: string | null
          last_balance_check_at: string | null
          total_credits_usd: number
          tracking_start_at: string
          updated_at: string
        }
        Insert: {
          alert_threshold_usd?: number
          circuit_breaker_active?: boolean
          circuit_breaker_restored_at?: string | null
          circuit_breaker_threshold_usd?: number
          circuit_breaker_tripped_at?: string | null
          created_at?: string
          id?: string
          last_alert_fired_at?: string | null
          last_balance_check_at?: string | null
          total_credits_usd?: number
          tracking_start_at?: string
          updated_at?: string
        }
        Update: {
          alert_threshold_usd?: number
          circuit_breaker_active?: boolean
          circuit_breaker_restored_at?: string | null
          circuit_breaker_threshold_usd?: number
          circuit_breaker_tripped_at?: string | null
          created_at?: string
          id?: string
          last_alert_fired_at?: string | null
          last_balance_check_at?: string | null
          total_credits_usd?: number
          tracking_start_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_call_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          method: string
          request_payload: Json | null
          response_error: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          method: string
          request_payload?: Json | null
          response_error?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          method?: string
          request_payload?: Json | null
          response_error?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_table: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      avialable_ai_models_and_version: {
        Row: {
          context_window_tokens: number | null
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          model_id: string
          model_name: string | null
          provider: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          context_window_tokens?: number | null
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          model_id?: string
          model_name?: string | null
          provider?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          context_window_tokens?: number | null
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          model_id?: string
          model_name?: string | null
          provider?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      backup_restore_logs: {
        Row: {
          backup_type: string
          created_at: string
          file_path: string
          file_size_bytes: number | null
          id: string
          status: string
        }
        Insert: {
          backup_type: string
          created_at?: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          status: string
        }
        Update: {
          backup_type?: string
          created_at?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      backup_run_logs: {
        Row: {
          backup_id: string | null
          cloud_result: Json | null
          created_at: string
          destinations: Json
          duration_ms: number | null
          error_message: string | null
          filename: string | null
          id: string
          stats: Json | null
          success: boolean
          trigger: string
        }
        Insert: {
          backup_id?: string | null
          cloud_result?: Json | null
          created_at?: string
          destinations?: Json
          duration_ms?: number | null
          error_message?: string | null
          filename?: string | null
          id?: string
          stats?: Json | null
          success: boolean
          trigger: string
        }
        Update: {
          backup_id?: string | null
          cloud_result?: Json | null
          created_at?: string
          destinations?: Json
          duration_ms?: number | null
          error_message?: string | null
          filename?: string | null
          id?: string
          stats?: Json | null
          success?: boolean
          trigger?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string | null
          bank_name: string
          branch_name: string | null
          created_at: string
          currency_code: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          landlord_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          branch_name?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          landlord_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          landlord_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown
          is_anomaly: boolean | null
          metadata: Json | null
          page_path: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_anomaly?: boolean | null
          metadata?: Json | null
          page_path: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_anomaly?: boolean | null
          metadata?: Json | null
          page_path?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_analytics: {
        Row: {
          avg_time_on_page: number | null
          blog_post_id: string
          bounce_rate: number | null
          comments_count: number | null
          created_at: string
          id: string
          metric_date: string
          shares: Json | null
          unique_visitors: number | null
          views: number | null
        }
        Insert: {
          avg_time_on_page?: number | null
          blog_post_id: string
          bounce_rate?: number | null
          comments_count?: number | null
          created_at?: string
          id?: string
          metric_date: string
          shares?: Json | null
          unique_visitors?: number | null
          views?: number | null
        }
        Update: {
          avg_time_on_page?: number | null
          blog_post_id?: string
          bounce_rate?: number | null
          comments_count?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          shares?: Json | null
          unique_visitors?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_analytics_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_platform_posts: {
        Row: {
          blog_post_id: string
          external_id: string
          external_url: string | null
          id: string
          platform: string
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          blog_post_id: string
          external_id: string
          external_url?: string | null
          id?: string
          platform: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          blog_post_id?: string
          external_id?: string
          external_url?: string | null
          id?: string
          platform?: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_platform_posts_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          blog_style_preset: string | null
          blog_target_platform: string | null
          category: string | null
          content: string
          content_html: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          generation_context: Json
          id: string
          like_count: number | null
          property_id: string | null
          published_at: string | null
          reference_url: string | null
          reference_url_normalized: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          blog_style_preset?: string | null
          blog_target_platform?: string | null
          category?: string | null
          content: string
          content_html?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_context?: Json
          id?: string
          like_count?: number | null
          property_id?: string | null
          published_at?: string | null
          reference_url?: string | null
          reference_url_normalized?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          blog_style_preset?: string | null
          blog_target_platform?: string | null
          category?: string | null
          content?: string
          content_html?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_context?: Json
          id?: string
          like_count?: number | null
          property_id?: string | null
          published_at?: string | null
          reference_url?: string | null
          reference_url_normalized?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      building_title_records: {
        Row: {
          auxiliary_area: number | null
          building_address: string
          building_area_sqm: number | null
          building_community_id: string | null
          common_area: number | null
          construction_type: string | null
          created_at: string
          document_file_path: string | null
          encumbrances: Json | null
          floor_number: string | null
          id: string
          land_lot_number: string | null
          main_building_area: number | null
          ocr_extracted: boolean | null
          ocr_parsing_log_id: string | null
          owner_id_number: string | null
          owner_name: string
          property_id: string | null
          purpose_of_use: string | null
          registration_date: string | null
          share_ratio: string | null
          title_number: string
          updated_at: string
        }
        Insert: {
          auxiliary_area?: number | null
          building_address: string
          building_area_sqm?: number | null
          building_community_id?: string | null
          common_area?: number | null
          construction_type?: string | null
          created_at?: string
          document_file_path?: string | null
          encumbrances?: Json | null
          floor_number?: string | null
          id?: string
          land_lot_number?: string | null
          main_building_area?: number | null
          ocr_extracted?: boolean | null
          ocr_parsing_log_id?: string | null
          owner_id_number?: string | null
          owner_name: string
          property_id?: string | null
          purpose_of_use?: string | null
          registration_date?: string | null
          share_ratio?: string | null
          title_number: string
          updated_at?: string
        }
        Update: {
          auxiliary_area?: number | null
          building_address?: string
          building_area_sqm?: number | null
          building_community_id?: string | null
          common_area?: number | null
          construction_type?: string | null
          created_at?: string
          document_file_path?: string | null
          encumbrances?: Json | null
          floor_number?: string | null
          id?: string
          land_lot_number?: string | null
          main_building_area?: number | null
          ocr_extracted?: boolean | null
          ocr_parsing_log_id?: string | null
          owner_id_number?: string | null
          owner_name?: string
          property_id?: string | null
          purpose_of_use?: string | null
          registration_date?: string | null
          share_ratio?: string | null
          title_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_title_records_building_community_id_fkey"
            columns: ["building_community_id"]
            isOneToOne: false
            referencedRelation: "buildings_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings_communities: {
        Row: {
          address: string
          amenities: string[] | null
          building_type: string | null
          city: string
          created_at: string
          district: string | null
          id: string
          management_company: string | null
          name: string
          postal_code: string | null
          rules_regulations: Json | null
          total_floors: number | null
          total_units: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          building_type?: string | null
          city: string
          created_at?: string
          district?: string | null
          id?: string
          management_company?: string | null
          name: string
          postal_code?: string | null
          rules_regulations?: Json | null
          total_floors?: number | null
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          building_type?: string | null
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          management_company?: string | null
          name?: string
          postal_code?: string | null
          rules_regulations?: Json | null
          total_floors?: number | null
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      buyer_inquiries: {
        Row: {
          created_at: string
          id: string
          inquirer_email: string | null
          inquirer_name: string
          inquirer_phone: string | null
          inquiry_type: string | null
          landlord_id: string | null
          message: string
          property_id: string
          replied_at: string | null
          replied_by: string | null
          reply_message: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inquirer_email?: string | null
          inquirer_name: string
          inquirer_phone?: string | null
          inquiry_type?: string | null
          landlord_id?: string | null
          message: string
          property_id: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inquirer_email?: string | null
          inquirer_name?: string
          inquirer_phone?: string | null
          inquiry_type?: string | null
          landlord_id?: string | null
          message?: string
          property_id?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_inquiries_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_inquiries_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_inquiries_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_inquiries_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_intentions: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          message: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendees: string[] | null
          created_at: string
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          recurrence_rule: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reminder_minutes: number | null
          start_time: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_minutes?: number | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_minutes?: number | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_status: string
          caller_id_name: string | null
          cost: number | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          from_number: string
          id: string
          metadata: Json | null
          recording_url: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          started_at: string
          to_number: string
          transcription_text: string | null
          user_id: string | null
          virtual_number_id: string | null
        }
        Insert: {
          call_status: string
          caller_id_name?: string | null
          cost?: number | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number: string
          id?: string
          metadata?: Json | null
          recording_url?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          started_at: string
          to_number: string
          transcription_text?: string | null
          user_id?: string | null
          virtual_number_id?: string | null
        }
        Update: {
          call_status?: string
          caller_id_name?: string | null
          cost?: number | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string
          id?: string
          metadata?: Json | null
          recording_url?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          started_at?: string
          to_number?: string
          transcription_text?: string | null
          user_id?: string | null
          virtual_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_virtual_number_id_fkey"
            columns: ["virtual_number_id"]
            isOneToOne: false
            referencedRelation: "virtual_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_resources_monitoring: {
        Row: {
          id: string
          metric_name: string
          recorded_at: string
          resource_type: string
          value: number
        }
        Insert: {
          id?: string
          metric_name: string
          recorded_at?: string
          resource_type: string
          value: number
        }
        Update: {
          id?: string
          metric_name?: string
          recorded_at?: string
          resource_type?: string
          value?: number
        }
        Relationships: []
      }
      comfyui_styles: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          style_type: string
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
          workflow_json: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          style_type: string
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          workflow_json: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          style_type?: string
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          workflow_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "comfyui_styles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comfyui_styles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lead_notes: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          lead_id: string
          note_type: string
        }
        Insert: {
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          lead_id: string
          note_type?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          email: string
          id: string
          inquiry_type: string
          message: string
          name: string
          phone: string | null
          source_context: Json
          source_path: string | null
          status: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          email: string
          id?: string
          inquiry_type: string
          message: string
          name: string
          phone?: string | null
          source_context?: Json
          source_path?: string | null
          status?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: string
          message?: string
          name?: string
          phone?: string | null
          source_context?: Json
          source_path?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contracted_buyers: {
        Row: {
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string | null
          closing_date: string | null
          created_at: string
          down_payment: number | null
          financing_type: string | null
          id: string
          landlord_id: string
          property_id: string
          purchase_price: number
          sales_agreement_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name: string
          buyer_phone?: string | null
          closing_date?: string | null
          created_at?: string
          down_payment?: number | null
          financing_type?: string | null
          id?: string
          landlord_id: string
          property_id: string
          purchase_price: number
          sales_agreement_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          closing_date?: string | null
          created_at?: string
          down_payment?: number | null
          financing_type?: string | null
          id?: string
          landlord_id?: string
          property_id?: string
          purchase_price?: number
          sales_agreement_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracted_buyers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracted_buyers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracted_buyers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracted_buyers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      contracted_tenants: {
        Row: {
          created_at: string
          deposit_amount: number | null
          emergency_contact: Json | null
          id: string
          landlord_id: string
          lease_agreement_id: string | null
          lease_end_date: string
          monthly_rent: number
          move_in_date: string
          notes: string | null
          payment_status: string | null
          property_id: string
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          emergency_contact?: Json | null
          id?: string
          landlord_id: string
          lease_agreement_id?: string | null
          lease_end_date: string
          monthly_rent: number
          move_in_date: string
          notes?: string | null
          payment_status?: string | null
          property_id: string
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          emergency_contact?: Json | null
          id?: string
          landlord_id?: string
          lease_agreement_id?: string | null
          lease_end_date?: string
          monthly_rent?: number
          move_in_date?: string
          notes?: string | null
          payment_status?: string | null
          property_id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracted_tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracted_tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracted_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracted_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          is_active: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          code: string
          is_active?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          code?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      deposit_receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          landlord_id: string
          lease_agreement_id: string | null
          payment_date: string
          payment_method: string | null
          receipt_file_path: string | null
          receipt_number: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          landlord_id: string
          lease_agreement_id?: string | null
          payment_date: string
          payment_method?: string | null
          receipt_file_path?: string | null
          receipt_number: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          landlord_id?: string
          lease_agreement_id?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_file_path?: string | null
          receipt_number?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_receipts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_receipts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_receipts_lease_agreement_id_fkey"
            columns: ["lease_agreement_id"]
            isOneToOne: false
            referencedRelation: "lease_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_tasks: {
        Row: {
          agent_id: string | null
          created_at: string
          feature_name: string
          id: string
          ide: string
          logs: string[]
          metadata: Json
          prompt: string
          result_summary: Json | null
          row_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          feature_name: string
          id?: string
          ide: string
          logs?: string[]
          metadata?: Json
          prompt: string
          result_summary?: Json | null
          row_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          feature_name?: string
          id?: string
          ide?: string
          logs?: string[]
          metadata?: Json
          prompt?: string
          result_summary?: Json | null
          row_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          document_id: string
          document_type: string
          id: string
          ip_address: unknown
          is_verified: boolean | null
          signature_data: string
          signed_at: string
          signer_id: string
          verification_method: string | null
        }
        Insert: {
          document_id: string
          document_type: string
          id?: string
          ip_address?: unknown
          is_verified?: boolean | null
          signature_data: string
          signed_at?: string
          signer_id: string
          verification_method?: string | null
        }
        Update: {
          document_id?: string
          document_type?: string
          id?: string
          ip_address?: unknown
          is_verified?: boolean | null
          signature_data?: string
          signed_at?: string
          signer_id?: string
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      document_uploads: {
        Row: {
          created_at: string
          document_type: string
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          mime_type: string
          original_file_name: string
          related_entity_id: string | null
          related_entity_type: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          mime_type: string
          original_file_name: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          mime_type?: string
          original_file_name?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_autosave: {
        Row: {
          content: Json
          created_at: string
          draft_key: string
          draft_type: string
          id: string
          last_saved_at: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          draft_key: string
          draft_type: string
          id?: string
          last_saved_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          draft_key?: string
          draft_type?: string
          id?: string
          last_saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_autosave_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_autosave_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      earnest_money_receipts: {
        Row: {
          amount: number
          buyer_name: string
          created_at: string
          id: string
          payment_date: string
          payment_method: string | null
          property_id: string
          receipt_file_path: string | null
          receipt_number: string
          status: string | null
        }
        Insert: {
          amount: number
          buyer_name: string
          created_at?: string
          id?: string
          payment_date: string
          payment_method?: string | null
          property_id: string
          receipt_file_path?: string | null
          receipt_number: string
          status?: string | null
        }
        Update: {
          amount?: number
          buyer_name?: string
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          property_id?: string
          receipt_file_path?: string | null
          receipt_number?: string
          status?: string | null
        }
        Relationships: []
      }
      elasticsearch_indices: {
        Row: {
          aliases: string[] | null
          created_at: string
          document_count: number | null
          id: string
          index_name: string
          index_type: string
          is_active: boolean | null
          last_indexed_at: string | null
          mapping_schema: Json
          settings: Json | null
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string
          document_count?: number | null
          id?: string
          index_name: string
          index_type: string
          is_active?: boolean | null
          last_indexed_at?: string | null
          mapping_schema: Json
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          created_at?: string
          document_count?: number | null
          id?: string
          index_name?: string
          index_type?: string
          is_active?: boolean | null
          last_indexed_at?: string | null
          mapping_schema?: Json
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean | null
          labels: string[] | null
          last_message_at: string
          message_count: number | null
          participants: string[]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean | null
          labels?: string[] | null
          last_message_at: string
          message_count?: number | null
          participants: string[]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean | null
          labels?: string[] | null
          last_message_at?: string
          message_count?: number | null
          participants?: string[]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          attempts: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: unknown
          last_attempt_at: string | null
          max_attempts: number | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          verification_code: string | null
          verification_method: string
          verification_source: string | null
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_attempt_at?: string | null
          max_attempts?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          verification_code?: string | null
          verification_method?: string
          verification_source?: string | null
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_attempt_at?: string | null
          max_attempts?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          verification_code?: string | null
          verification_method?: string
          verification_source?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      engineer_profiles: {
        Row: {
          created_at: string
          default_role: string | null
          display_name: string
          id: string
          is_active: boolean
          preferred_ide: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_role?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          preferred_ide?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_role?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          preferred_ide?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          source: string
          stack_trace: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          source: string
          stack_trace?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          source?: string
          stack_trace?: string | null
        }
        Relationships: []
      }
      escrow_legal_services: {
        Row: {
          contact_info: Json | null
          id: string
          name: string
        }
        Insert: {
          contact_info?: Json | null
          id?: string
          name: string
        }
        Update: {
          contact_info?: Json | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          from_currency: string | null
          id: string
          rate: number
          to_currency: string | null
          updated_at: string
        }
        Insert: {
          from_currency?: string | null
          id?: string
          rate: number
          to_currency?: string | null
          updated_at?: string
        }
        Update: {
          from_currency?: string | null
          id?: string
          rate?: number
          to_currency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      form_drafts: {
        Row: {
          created_at: string
          data: Json
          form_key: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          form_key: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_key?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_drafts_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_drafts_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_terms: {
        Row: {
          description: string | null
          id: number
          term_en: string
          term_zh: string
        }
        Insert: {
          description?: string | null
          id?: number
          term_en: string
          term_zh: string
        }
        Update: {
          description?: string | null
          id?: number
          term_en?: string
          term_zh?: string
        }
        Relationships: []
      }
      i18n_glossary: {
        Row: {
          id: string
          key: string
          lang_code: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          lang_code: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          lang_code?: string
          value?: string
        }
        Relationships: []
      }
      iam_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iam_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "iam_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      iam_group_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          group_id: string
          id: string
          role_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id: string
          id?: string
          role_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iam_group_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "iam_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_group_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "iam_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      iam_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_managed: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_managed?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_managed?: boolean | null
          name?: string
        }
        Relationships: []
      }
      iam_role_permissions: {
        Row: {
          actions: string[]
          created_at: string | null
          id: string
          resource: string
          role_id: string
          scope: string
          updated_at: string | null
        }
        Insert: {
          actions?: string[]
          created_at?: string | null
          id?: string
          resource: string
          role_id: string
          scope?: string
          updated_at?: string | null
        }
        Update: {
          actions?: string[]
          created_at?: string | null
          id?: string
          resource?: string
          role_id?: string
          scope?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iam_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "iam_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      iam_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_role_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_role_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iam_roles_parent_role_id_fkey"
            columns: ["parent_role_id"]
            isOneToOne: false
            referencedRelation: "iam_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      iam_user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iam_user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "iam_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verification_records: {
        Row: {
          address: string | null
          admin_notes: string | null
          ai_flags: Json | null
          ai_risk_score: number | null
          approved_at: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          device_info: Json | null
          district: string | null
          document_back_path: string | null
          document_front_path: string | null
          expires_at: string | null
          face_match_score: number | null
          full_name: string
          id: string
          id_number_encrypted: string | null
          ip_address: unknown
          nationality: string | null
          ocr_confidence_score: number | null
          ocr_extracted_data: Json | null
          postal_code: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verification_source: string | null
          verification_type: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          ai_flags?: Json | null
          ai_risk_score?: number | null
          approved_at?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          device_info?: Json | null
          district?: string | null
          document_back_path?: string | null
          document_front_path?: string | null
          expires_at?: string | null
          face_match_score?: number | null
          full_name: string
          id?: string
          id_number_encrypted?: string | null
          ip_address?: unknown
          nationality?: string | null
          ocr_confidence_score?: number | null
          ocr_extracted_data?: Json | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          verification_source?: string | null
          verification_type: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          ai_flags?: Json | null
          ai_risk_score?: number | null
          approved_at?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          device_info?: Json | null
          district?: string | null
          document_back_path?: string | null
          document_front_path?: string | null
          expires_at?: string | null
          face_match_score?: number | null
          full_name?: string
          id?: string
          id_number_encrypted?: string | null
          ip_address?: unknown
          nationality?: string | null
          ocr_confidence_score?: number | null
          ocr_extracted_data?: Json | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          verification_source?: string | null
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verification_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verification_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verification_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verification_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string | null
          data_source: string
          description: string | null
          error_message: string | null
          id: string
          imported_by: string
          label: string
          processed_records: number | null
          skipped_records: number | null
          status: string | null
          total_records: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source: string
          description?: string | null
          error_message?: string | null
          id?: string
          imported_by: string
          label: string
          processed_records?: number | null
          skipped_records?: number | null
          status?: string | null
          total_records?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string
          description?: string | null
          error_message?: string | null
          id?: string
          imported_by?: string
          label?: string
          processed_records?: number | null
          skipped_records?: number | null
          status?: string | null
          total_records?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          coverage_amount: number
          coverage_type: string
          created_at: string
          deductible: number | null
          id: string
          insurance_company: string
          is_active: boolean | null
          plan_name: string
          premium_monthly: number
          terms_and_conditions: string | null
        }
        Insert: {
          coverage_amount: number
          coverage_type: string
          created_at?: string
          deductible?: number | null
          id?: string
          insurance_company: string
          is_active?: boolean | null
          plan_name: string
          premium_monthly: number
          terms_and_conditions?: string | null
        }
        Update: {
          coverage_amount?: number
          coverage_type?: string
          created_at?: string
          deductible?: number | null
          id?: string
          insurance_company?: string
          is_active?: boolean | null
          plan_name?: string
          premium_monthly?: number
          terms_and_conditions?: string | null
        }
        Relationships: []
      }
      interior_designers: {
        Row: {
          contact_info: Json | null
          id: string
          name: string
        }
        Insert: {
          contact_info?: Json | null
          id?: string
          name: string
        }
        Update: {
          contact_info?: Json | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      invoice_records: {
        Row: {
          buyer_address: string | null
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          buyer_tax_id: string | null
          created_at: string
          currency_code: string
          due_date: string | null
          e_invoice_carrier: string | null
          e_invoice_number: string | null
          e_invoice_random_code: string | null
          e_invoice_upload_at: string | null
          e_invoice_upload_status: string | null
          id: string
          internal_memo: string | null
          invoice_number: string
          invoice_type: string
          is_paid: boolean | null
          issue_date: string
          issued_by: string | null
          landlord_id: string
          line_items: Json
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_terms: string | null
          payment_transaction_id: string | null
          pdf_path: string | null
          property_id: string | null
          seller_address: string | null
          seller_name: string
          seller_phone: string | null
          seller_tax_id: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
          xml_path: string | null
        }
        Insert: {
          buyer_address?: string | null
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          buyer_tax_id?: string | null
          created_at?: string
          currency_code?: string
          due_date?: string | null
          e_invoice_carrier?: string | null
          e_invoice_number?: string | null
          e_invoice_random_code?: string | null
          e_invoice_upload_at?: string | null
          e_invoice_upload_status?: string | null
          id?: string
          internal_memo?: string | null
          invoice_number: string
          invoice_type: string
          is_paid?: boolean | null
          issue_date?: string
          issued_by?: string | null
          landlord_id: string
          line_items?: Json
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          payment_transaction_id?: string | null
          pdf_path?: string | null
          property_id?: string | null
          seller_address?: string | null
          seller_name: string
          seller_phone?: string | null
          seller_tax_id: string
          status?: string
          subtotal: number
          tax_amount: number
          tax_rate?: number | null
          tenant_id?: string | null
          total_amount: number
          updated_at?: string
          xml_path?: string | null
        }
        Update: {
          buyer_address?: string | null
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          buyer_tax_id?: string | null
          created_at?: string
          currency_code?: string
          due_date?: string | null
          e_invoice_carrier?: string | null
          e_invoice_number?: string | null
          e_invoice_random_code?: string | null
          e_invoice_upload_at?: string | null
          e_invoice_upload_status?: string | null
          id?: string
          internal_memo?: string | null
          invoice_number?: string
          invoice_type?: string
          is_paid?: boolean | null
          issue_date?: string
          issued_by?: string | null
          landlord_id?: string
          line_items?: Json
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          payment_transaction_id?: string | null
          pdf_path?: string | null
          property_id?: string | null
          seller_address?: string | null
          seller_name?: string
          seller_phone?: string | null
          seller_tax_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_records_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_records_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_records_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_records_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_records_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_call_preferences: {
        Row: {
          auto_respond: boolean | null
          auto_response_message: string | null
          available_days: string[]
          available_time_from: string
          available_time_to: string
          created_at: string
          do_not_disturb_mode: boolean | null
          forward_to_number: string | null
          id: string
          landlord_id: string
          preferred_language: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          auto_respond?: boolean | null
          auto_response_message?: string | null
          available_days: string[]
          available_time_from: string
          available_time_to: string
          created_at?: string
          do_not_disturb_mode?: boolean | null
          forward_to_number?: string | null
          id?: string
          landlord_id: string
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          auto_respond?: boolean | null
          auto_response_message?: string | null
          available_days?: string[]
          available_time_from?: string
          available_time_to?: string
          created_at?: string
          do_not_disturb_mode?: boolean | null
          forward_to_number?: string | null
          id?: string
          landlord_id?: string
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_call_preferences_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: true
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landlord_call_preferences_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: true
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_customers: {
        Row: {
          created_at: string
          email: string
          emergency_contact: string | null
          id: string
          landlord_id: string
          name: string
          notes: string | null
          phone: string
          priority: number
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          emergency_contact?: string | null
          id?: string
          landlord_id: string
          name: string
          notes?: string | null
          phone: string
          priority?: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          emergency_contact?: string | null
          id?: string
          landlord_id?: string
          name?: string
          notes?: string | null
          phone?: string
          priority?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_customers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landlord_customers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_buyers: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          email: string | null
          financing_preapproved: boolean | null
          id: string
          interested_property_id: string | null
          landlord_id: string
          lead_source: string | null
          lead_status: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_areas: string[] | null
          property_requirements: Json | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string | null
          financing_preapproved?: boolean | null
          id?: string
          interested_property_id?: string | null
          landlord_id: string
          lead_source?: string | null
          lead_status?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          property_requirements?: Json | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string | null
          financing_preapproved?: boolean | null
          id?: string
          interested_property_id?: string | null
          landlord_id?: string
          lead_source?: string | null
          lead_status?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          property_requirements?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_buyers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_buyers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_tenants: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          email: string | null
          employment_status: string | null
          has_pets: boolean | null
          id: string
          interested_property_id: string | null
          landlord_id: string
          lead_source: string | null
          lead_status: string | null
          move_in_date_preference: string | null
          name: string
          notes: string | null
          occupants_count: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string | null
          employment_status?: string | null
          has_pets?: boolean | null
          id?: string
          interested_property_id?: string | null
          landlord_id: string
          lead_source?: string | null
          lead_status?: string | null
          move_in_date_preference?: string | null
          name: string
          notes?: string | null
          occupants_count?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string | null
          employment_status?: string | null
          has_pets?: boolean | null
          id?: string
          interested_property_id?: string | null
          landlord_id?: string
          lead_source?: string | null
          lead_status?: string | null
          move_in_date_preference?: string | null
          name?: string
          notes?: string | null
          occupants_count?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_agreements: {
        Row: {
          contract_file_path: string | null
          contract_number: string
          created_at: string
          deposit_amount: number
          end_date: string
          id: string
          landlord_id: string
          landlord_signature_path: string | null
          monthly_rent: number
          payment_due_day: number
          property_id: string
          signed_by_landlord: boolean | null
          signed_by_tenant: boolean | null
          special_clauses: string | null
          start_date: string
          status: string | null
          tenant_id: string
          tenant_signature_path: string | null
          terms_and_conditions: string
          updated_at: string
        }
        Insert: {
          contract_file_path?: string | null
          contract_number: string
          created_at?: string
          deposit_amount: number
          end_date: string
          id?: string
          landlord_id: string
          landlord_signature_path?: string | null
          monthly_rent: number
          payment_due_day: number
          property_id: string
          signed_by_landlord?: boolean | null
          signed_by_tenant?: boolean | null
          special_clauses?: string | null
          start_date: string
          status?: string | null
          tenant_id: string
          tenant_signature_path?: string | null
          terms_and_conditions: string
          updated_at?: string
        }
        Update: {
          contract_file_path?: string | null
          contract_number?: string
          created_at?: string
          deposit_amount?: number
          end_date?: string
          id?: string
          landlord_id?: string
          landlord_signature_path?: string | null
          monthly_rent?: number
          payment_due_day?: number
          property_id?: string
          signed_by_landlord?: boolean | null
          signed_by_tenant?: boolean | null
          special_clauses?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string
          tenant_signature_path?: string | null
          terms_and_conditions?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_agreements_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_configs: {
        Row: {
          api_key_enc: string | null
          created_at: string
          id: string
          is_active: boolean | null
          model_name: string
          parameters: Json | null
          provider: string
        }
        Insert: {
          api_key_enc?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_name: string
          parameters?: Json | null
          provider: string
        }
        Update: {
          api_key_enc?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_name?: string
          parameters?: Json | null
          provider?: string
        }
        Relationships: []
      }
      local_ocr_parse_results: {
        Row: {
          created_at: string
          id: string
          parsed: Json | null
          property_document_id: string
          raw_stderr: string | null
          raw_stdout: string | null
          transcript_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parsed?: Json | null
          property_document_id: string
          raw_stderr?: string | null
          raw_stdout?: string | null
          transcript_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parsed?: Json | null
          property_document_id?: string
          raw_stderr?: string | null
          raw_stdout?: string | null
          transcript_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_ocr_parse_results_property_document_id_fkey"
            columns: ["property_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string
          id: number
          level: string
          message: string
          metadata: Json | null
          service: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          level: string
          message: string
          metadata?: Json | null
          service?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: number
          level?: string
          message?: string
          metadata?: Json | null
          service?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lvr_land_transactions: {
        Row: {
          address_snippet: string
          building_area_sqm: number | null
          building_type: string | null
          city: string
          created_at: string | null
          district: string
          floor: string | null
          id: string
          land_section_tokens: string[] | null
          latitude: number | null
          longitude: number | null
          total_price_twd: number
          transaction_date: string
          unit_price_per_sqm: number | null
          village: string | null
        }
        Insert: {
          address_snippet: string
          building_area_sqm?: number | null
          building_type?: string | null
          city: string
          created_at?: string | null
          district: string
          floor?: string | null
          id?: string
          land_section_tokens?: string[] | null
          latitude?: number | null
          longitude?: number | null
          total_price_twd: number
          transaction_date: string
          unit_price_per_sqm?: number | null
          village?: string | null
        }
        Update: {
          address_snippet?: string
          building_area_sqm?: number | null
          building_type?: string | null
          city?: string
          created_at?: string | null
          district?: string
          floor?: string | null
          id?: string
          land_section_tokens?: string[] | null
          latitude?: number | null
          longitude?: number | null
          total_price_twd?: number
          transaction_date?: string
          unit_price_per_sqm?: number | null
          village?: string | null
        }
        Relationships: []
      }
      maintenance_quotes: {
        Row: {
          created_at: string
          estimated_duration_hours: number | null
          id: string
          maintenance_request_id: string
          quote_amount: number
          quote_details: string
          status: string | null
          valid_until: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_duration_hours?: number | null
          id?: string
          maintenance_request_id: string
          quote_amount: number
          quote_details: string
          status?: string | null
          valid_until?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_duration_hours?: number | null
          id?: string
          maintenance_request_id?: string
          quote_amount?: number
          quote_details?: string
          status?: string | null
          valid_until?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          category: string
          completed_date: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          priority: string
          property_id: string
          requested_by: string
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          category: string
          completed_date?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          priority?: string
          property_id: string
          requested_by: string
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          priority?: string
          property_id?: string
          requested_by?: string
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_vendors: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          phone: string
          rating: number | null
          response_time_hours: number | null
          service_areas: string[] | null
          specialties: string[] | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          phone: string
          rating?: number | null
          response_time_hours?: number | null
          service_areas?: string[] | null
          specialties?: string[] | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          phone?: string
          rating?: number | null
          response_time_hours?: number | null
          service_areas?: string[] | null
          specialties?: string[] | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: []
      }
      media_gallery: {
        Row: {
          alt_text: string | null
          caption: string | null
          display_order: number | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string
          id: string
          is_public: boolean | null
          mime_type: string
          owner_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          tags: string[] | null
          thumbnail_path: string | null
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          display_order?: number | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type: string
          id?: string
          is_public?: boolean | null
          mime_type: string
          owner_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          display_order?: number | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          is_public?: boolean | null
          mime_type?: string
          owner_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_gallery_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_gallery_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      media_processing_queue: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          output_file_path: string | null
          priority: number | null
          processing_options: Json | null
          processing_status: string | null
          processing_time_ms: number | null
          processing_type: string
          progress_percentage: number | null
          queued_at: string
          source_file_path: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          output_file_path?: string | null
          priority?: number | null
          processing_options?: Json | null
          processing_status?: string | null
          processing_time_ms?: number | null
          processing_type: string
          progress_percentage?: number | null
          queued_at?: string
          source_file_path: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          output_file_path?: string | null
          priority?: number | null
          processing_options?: Json | null
          processing_status?: string | null
          processing_time_ms?: number | null
          processing_type?: string
          progress_percentage?: number | null
          queued_at?: string
          source_file_path?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_processing_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_processing_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_urls: string[] | null
          content: string
          created_at: string
          from_user_id: string
          id: string
          is_deleted_by_receiver: boolean | null
          is_deleted_by_sender: boolean | null
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          subject: string | null
          thread_id: string | null
          to_user_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content: string
          created_at?: string
          from_user_id: string
          id?: string
          is_deleted_by_receiver?: boolean | null
          is_deleted_by_sender?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          subject?: string | null
          thread_id?: string | null
          to_user_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string
          created_at?: string
          from_user_id?: string
          id?: string
          is_deleted_by_receiver?: boolean | null
          is_deleted_by_sender?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          subject?: string | null
          thread_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      nearby_facilities: {
        Row: {
          address: string | null
          building_community_id: string | null
          created_at: string
          distance_meters: number
          facility_type: string
          id: string
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          property_id: string | null
          rating: number | null
          walking_time_minutes: number | null
        }
        Insert: {
          address?: string | null
          building_community_id?: string | null
          created_at?: string
          distance_meters: number
          facility_type: string
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          property_id?: string | null
          rating?: number | null
          walking_time_minutes?: number | null
        }
        Update: {
          address?: string | null
          building_community_id?: string | null
          created_at?: string
          distance_meters?: number
          facility_type?: string
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          property_id?: string | null
          rating?: number | null
          walking_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nearby_facilities_building_community_id_fkey"
            columns: ["building_community_id"]
            isOneToOne: false
            referencedRelation: "buildings_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          notify_document_uploaded: boolean | null
          notify_maintenance_request: boolean | null
          notify_new_message: boolean | null
          notify_payment_due: boolean | null
          notify_property_inquiry: boolean | null
          notify_system_updates: boolean | null
          push_notifications: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_notifications: boolean | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          notify_document_uploaded?: boolean | null
          notify_maintenance_request?: boolean | null
          notify_new_message?: boolean | null
          notify_payment_due?: boolean | null
          notify_property_inquiry?: boolean | null
          notify_system_updates?: boolean | null
          push_notifications?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          notify_document_uploaded?: boolean | null
          notify_maintenance_request?: boolean | null
          notify_new_message?: boolean | null
          notify_payment_due?: boolean | null
          notify_property_inquiry?: boolean | null
          notify_system_updates?: boolean | null
          push_notifications?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          max_retries: number | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          read_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_content: string
          channel: string
          code: string
          id: string
          is_active: boolean | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          body_content: string
          channel: string
          code: string
          id?: string
          is_active?: boolean | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body_content?: string
          channel?: string
          code?: string
          id?: string
          is_active?: boolean | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ocr_parse_results: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          model_id: string
          parse_duration_ms: number | null
          property_document_id: string
          provider: string
          raw_output: Json | null
          role: string
          token_usage: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          model_id: string
          parse_duration_ms?: number | null
          property_document_id: string
          provider: string
          raw_output?: Json | null
          role?: string
          token_usage?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          model_id?: string
          parse_duration_ms?: number | null
          property_document_id?: string
          provider?: string
          raw_output?: Json | null
          role?: string
          token_usage?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_parse_results_property_document_id_fkey"
            columns: ["property_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_parsing_logs: {
        Row: {
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          document_type: string
          error_message: string | null
          extracted_text: string | null
          file_name: string
          file_path: string
          id: string
          ocr_engine: string
          processed_by: string | null
          processing_time_ms: number | null
          status: string
          structured_data: Json | null
        }
        Insert: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          document_type: string
          error_message?: string | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          id?: string
          ocr_engine: string
          processed_by?: string | null
          processing_time_ms?: number | null
          status: string
          structured_data?: Json | null
        }
        Update: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          id?: string
          ocr_engine?: string
          processed_by?: string | null
          processing_time_ms?: number | null
          status?: string
          structured_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_parsing_logs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_parsing_logs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      panorama_images: {
        Row: {
          created_at: string
          display_order: number | null
          file_size_bytes: number | null
          hotspots: Json | null
          id: string
          is_active: boolean | null
          panorama_url: string
          property_id: string
          resolution: string | null
          room_name: string
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          file_size_bytes?: number | null
          hotspots?: Json | null
          id?: string
          is_active?: boolean | null
          panorama_url: string
          property_id: string
          resolution?: string | null
          room_name: string
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          file_size_bytes?: number | null
          hotspots?: Json | null
          id?: string
          is_active?: boolean | null
          panorama_url?: string
          property_id?: string
          resolution?: string | null
          room_name?: string
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "panorama_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panorama_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_id: string | null
          completed_at: string | null
          created_at: string
          currency_code: string
          description: string | null
          external_transaction_id: string | null
          failed_at: string | null
          failure_code: string | null
          failure_reason: string | null
          flagged_reason: string | null
          id: string
          initiated_at: string
          invoice_id: string | null
          is_suspicious: boolean | null
          lease_agreement_id: string | null
          metadata: Json | null
          payee_account_number: string | null
          payee_name: string | null
          payer_email: string | null
          payer_name: string | null
          payment_method: string
          payment_provider: string | null
          property_id: string | null
          receipt_url: string | null
          refunded_at: string | null
          risk_score: number | null
          sales_agreement_id: string | null
          status: string
          transaction_reference: string | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          description?: string | null
          external_transaction_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          flagged_reason?: string | null
          id?: string
          initiated_at?: string
          invoice_id?: string | null
          is_suspicious?: boolean | null
          lease_agreement_id?: string | null
          metadata?: Json | null
          payee_account_number?: string | null
          payee_name?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_method: string
          payment_provider?: string | null
          property_id?: string | null
          receipt_url?: string | null
          refunded_at?: string | null
          risk_score?: number | null
          sales_agreement_id?: string | null
          status?: string
          transaction_reference?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          description?: string | null
          external_transaction_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          flagged_reason?: string | null
          id?: string
          initiated_at?: string
          invoice_id?: string | null
          is_suspicious?: boolean | null
          lease_agreement_id?: string | null
          metadata?: Json | null
          payee_account_number?: string | null
          payee_name?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_method?: string
          payment_provider?: string | null
          property_id?: string | null
          receipt_url?: string | null
          refunded_at?: string | null
          risk_score?: number | null
          sales_agreement_id?: string | null
          status?: string
          transaction_reference?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_lease_agreement_id_fkey"
            columns: ["lease_agreement_id"]
            isOneToOne: false
            referencedRelation: "lease_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_sales_agreement_id_fkey"
            columns: ["sales_agreement_id"]
            isOneToOne: false
            referencedRelation: "sales_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_workflow: {
        Row: {
          id: string
          sale_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          stage?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_workflow_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "property_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      people_duplicates: {
        Row: {
          created_at: string | null
          duplicate_record_id: string
          id: string
          notes: string | null
          primary_record_id: string
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number | null
        }
        Insert: {
          created_at?: string | null
          duplicate_record_id: string
          id?: string
          notes?: string | null
          primary_record_id: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
        }
        Update: {
          created_at?: string | null
          duplicate_record_id?: string
          id?: string
          notes?: string | null
          primary_record_id?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "people_duplicates_duplicate_record_id_fkey"
            columns: ["duplicate_record_id"]
            isOneToOne: false
            referencedRelation: "people_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_duplicates_primary_record_id_fkey"
            columns: ["primary_record_id"]
            isOneToOne: false
            referencedRelation: "people_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_duplicates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      people_records: {
        Row: {
          address: string | null
          created_at: string | null
          data_source: string
          duplicate_flag: string | null
          duplicate_of_id: string | null
          id: string
          id_number: string | null
          import_batch_id: string
          imported_by: string
          name: string
          ocr_confidence: number | null
          organization: string | null
          phone: string | null
          quality_score: number | null
          record_id: string
          source_document_id: string | null
          source_file_path: string | null
          title_position: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          data_source: string
          duplicate_flag?: string | null
          duplicate_of_id?: string | null
          id?: string
          id_number?: string | null
          import_batch_id: string
          imported_by: string
          name: string
          ocr_confidence?: number | null
          organization?: string | null
          phone?: string | null
          quality_score?: number | null
          record_id: string
          source_document_id?: string | null
          source_file_path?: string | null
          title_position?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          data_source?: string
          duplicate_flag?: string | null
          duplicate_of_id?: string | null
          id?: string
          id_number?: string | null
          import_batch_id?: string
          imported_by?: string
          name?: string
          ocr_confidence?: number | null
          organization?: string | null
          phone?: string | null
          quality_score?: number | null
          record_id?: string
          source_document_id?: string | null
          source_file_path?: string | null
          title_position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_records_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "people_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_records_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_records_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_type: string
          recorded_at: string
          tags: Json | null
          unit: string
          value: number
        }
        Insert: {
          id?: string
          metric_name: string
          metric_type: string
          recorded_at?: string
          tags?: Json | null
          unit: string
          value: number
        }
        Update: {
          id?: string
          metric_name?: string
          metric_type?: string
          recorded_at?: string
          tags?: Json | null
          unit?: string
          value?: number
        }
        Relationships: []
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          is_public: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_agent_assignments: {
        Row: {
          agent_code: string | null
          agent_name: string | null
          commission_ratio_pct: number | null
          created_at: string
          department_group_code: string | null
          id: string
          property_id: string
          property_type: string
          slot_number: number
          updated_at: string
        }
        Insert: {
          agent_code?: string | null
          agent_name?: string | null
          commission_ratio_pct?: number | null
          created_at?: string
          department_group_code?: string | null
          id?: string
          property_id: string
          property_type: string
          slot_number: number
          updated_at?: string
        }
        Update: {
          agent_code?: string | null
          agent_name?: string | null
          commission_ratio_pct?: number | null
          created_at?: string
          department_group_code?: string | null
          id?: string
          property_id?: string
          property_type?: string
          slot_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_au_details: {
        Row: {
          au_area_external_sqm: number | null
          au_area_garage_sqm: number | null
          au_area_internal_sqm: number | null
          au_area_land_sqm: number | null
          au_auction_date: string | null
          au_auction_venue: string | null
          au_available_date: string | null
          au_bond_weeks: number | null
          au_building_inspection_available: boolean | null
          au_building_manager_name: string | null
          au_building_manager_phone: string | null
          au_certificate_of_title: string | null
          au_council_area: string | null
          au_council_rates_annual: number | null
          au_council_zone: string | null
          au_dp_number: string | null
          au_is_strata: boolean | null
          au_land_tax_annual: number | null
          au_lease_term_months: number | null
          au_lot_number: string | null
          au_nearby_beach: string | null
          au_nearby_bus_stop: string | null
          au_nearby_ferry_wharf: string | null
          au_nearby_high_school: string | null
          au_nearby_hospital: string | null
          au_nearby_primary_school: string | null
          au_nearby_shopping_centre: string | null
          au_nearby_train_station: string | null
          au_nearby_tram_stop: string | null
          au_pest_inspection_available: boolean | null
          au_pet_bond_allowed: boolean | null
          au_pet_negotiable: boolean | null
          au_postcode: string | null
          au_price_guide: string | null
          au_sale_type: string | null
          au_state: string | null
          au_strata_inspection_available: boolean | null
          au_strata_levy_quarterly: number | null
          au_strata_plan_number: string | null
          au_street_name: string | null
          au_street_number: string | null
          au_suburb: string | null
          au_vendor_statement_ready: boolean | null
          au_water_rates_annual: number | null
          created_at: string
          id: string
          property_id: string
          property_type: string
          updated_at: string
        }
        Insert: {
          au_area_external_sqm?: number | null
          au_area_garage_sqm?: number | null
          au_area_internal_sqm?: number | null
          au_area_land_sqm?: number | null
          au_auction_date?: string | null
          au_auction_venue?: string | null
          au_available_date?: string | null
          au_bond_weeks?: number | null
          au_building_inspection_available?: boolean | null
          au_building_manager_name?: string | null
          au_building_manager_phone?: string | null
          au_certificate_of_title?: string | null
          au_council_area?: string | null
          au_council_rates_annual?: number | null
          au_council_zone?: string | null
          au_dp_number?: string | null
          au_is_strata?: boolean | null
          au_land_tax_annual?: number | null
          au_lease_term_months?: number | null
          au_lot_number?: string | null
          au_nearby_beach?: string | null
          au_nearby_bus_stop?: string | null
          au_nearby_ferry_wharf?: string | null
          au_nearby_high_school?: string | null
          au_nearby_hospital?: string | null
          au_nearby_primary_school?: string | null
          au_nearby_shopping_centre?: string | null
          au_nearby_train_station?: string | null
          au_nearby_tram_stop?: string | null
          au_pest_inspection_available?: boolean | null
          au_pet_bond_allowed?: boolean | null
          au_pet_negotiable?: boolean | null
          au_postcode?: string | null
          au_price_guide?: string | null
          au_sale_type?: string | null
          au_state?: string | null
          au_strata_inspection_available?: boolean | null
          au_strata_levy_quarterly?: number | null
          au_strata_plan_number?: string | null
          au_street_name?: string | null
          au_street_number?: string | null
          au_suburb?: string | null
          au_vendor_statement_ready?: boolean | null
          au_water_rates_annual?: number | null
          created_at?: string
          id?: string
          property_id: string
          property_type: string
          updated_at?: string
        }
        Update: {
          au_area_external_sqm?: number | null
          au_area_garage_sqm?: number | null
          au_area_internal_sqm?: number | null
          au_area_land_sqm?: number | null
          au_auction_date?: string | null
          au_auction_venue?: string | null
          au_available_date?: string | null
          au_bond_weeks?: number | null
          au_building_inspection_available?: boolean | null
          au_building_manager_name?: string | null
          au_building_manager_phone?: string | null
          au_certificate_of_title?: string | null
          au_council_area?: string | null
          au_council_rates_annual?: number | null
          au_council_zone?: string | null
          au_dp_number?: string | null
          au_is_strata?: boolean | null
          au_land_tax_annual?: number | null
          au_lease_term_months?: number | null
          au_lot_number?: string | null
          au_nearby_beach?: string | null
          au_nearby_bus_stop?: string | null
          au_nearby_ferry_wharf?: string | null
          au_nearby_high_school?: string | null
          au_nearby_hospital?: string | null
          au_nearby_primary_school?: string | null
          au_nearby_shopping_centre?: string | null
          au_nearby_train_station?: string | null
          au_nearby_tram_stop?: string | null
          au_pest_inspection_available?: boolean | null
          au_pet_bond_allowed?: boolean | null
          au_pet_negotiable?: boolean | null
          au_postcode?: string | null
          au_price_guide?: string | null
          au_sale_type?: string | null
          au_state?: string | null
          au_strata_inspection_available?: boolean | null
          au_strata_levy_quarterly?: number | null
          au_strata_plan_number?: string | null
          au_street_name?: string | null
          au_street_number?: string | null
          au_suburb?: string | null
          au_vendor_statement_ready?: boolean | null
          au_water_rates_annual?: number | null
          created_at?: string
          id?: string
          property_id?: string
          property_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_comparisons: {
        Row: {
          comparison_data: Json | null
          created_at: string
          id: string
          property_ids: string[]
          user_id: string
        }
        Insert: {
          comparison_data?: Json | null
          created_at?: string
          id?: string
          property_ids: string[]
          user_id: string
        }
        Update: {
          comparison_data?: Json | null
          created_at?: string
          id?: string
          property_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_comparisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_comparisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          confidence_score: number | null
          consensus_metadata: Json | null
          created_at: string
          description: string | null
          document_date: string | null
          document_name: string
          document_type: string
          expiry_date: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          metadata: Json | null
          mime_type: string | null
          ocr_confidence_score: number | null
          ocr_engine: string | null
          ocr_parsing_log_id: string | null
          ocr_processed_at: string | null
          ocr_result_path: string | null
          ocr_status: string
          original_filename: string | null
          owner_id: string
          parse_strategy: string | null
          parsed_at: string | null
          parsed_result: Json | null
          parsing_duration_ms: number | null
          property_id: string | null
          property_type: string | null
          replaces_document_id: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string
          used_user_key: boolean | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number | null
          vlm_model_version: string | null
          vlm_provider: string | null
        }
        Insert: {
          confidence_score?: number | null
          consensus_metadata?: Json | null
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_name: string
          document_type: string
          expiry_date?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          ocr_confidence_score?: number | null
          ocr_engine?: string | null
          ocr_parsing_log_id?: string | null
          ocr_processed_at?: string | null
          ocr_result_path?: string | null
          ocr_status?: string
          original_filename?: string | null
          owner_id: string
          parse_strategy?: string | null
          parsed_at?: string | null
          parsed_result?: Json | null
          parsing_duration_ms?: number | null
          property_id?: string | null
          property_type?: string | null
          replaces_document_id?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
          used_user_key?: boolean | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
          vlm_model_version?: string | null
          vlm_provider?: string | null
        }
        Update: {
          confidence_score?: number | null
          consensus_metadata?: Json | null
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          ocr_confidence_score?: number | null
          ocr_engine?: string | null
          ocr_parsing_log_id?: string | null
          ocr_processed_at?: string | null
          ocr_result_path?: string | null
          ocr_status?: string
          original_filename?: string | null
          owner_id?: string
          parse_strategy?: string | null
          parsed_at?: string | null
          parsed_result?: Json | null
          parsing_duration_ms?: number | null
          property_id?: string | null
          property_type?: string | null
          replaces_document_id?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
          used_user_key?: boolean | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
          vlm_model_version?: string | null
          vlm_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_ocr_parsing_log_id_fkey"
            columns: ["ocr_parsing_log_id"]
            isOneToOne: false
            referencedRelation: "ocr_parsing_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_replaces_document_id_fkey"
            columns: ["replaces_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_environment_conditions: {
        Row: {
          ad_copy_40char: string | null
          announced_land_value: number | null
          area_arcade: number | null
          area_fifth_floor: number | null
          area_first_floor: number | null
          area_fourth_floor: number | null
          area_indoor: number | null
          area_other_floors: number | null
          area_second_floor: number | null
          area_third_floor: number | null
          building_exterior: string | null
          building_interior_wall: string | null
          building_structure: string | null
          bus_stop: string | null
          ceiling_material: string | null
          created_at: string
          depth_meters: number | null
          elevator_count: number | null
          elevator_households: number | null
          extension_location: string | null
          floor_material: string | null
          frontage_meters: number | null
          handover_condition: string | null
          has_ground_building: boolean | null
          has_ground_vegetation: boolean | null
          has_mortgage_setting: boolean | null
          has_natural_gas: boolean | null
          has_security_guard: boolean | null
          highlight_notes: string | null
          id: string
          is_alley_rush: boolean | null
          is_currently_leased: boolean | null
          is_safe_alley: boolean | null
          key_access_method: string | null
          land_use_zone: string | null
          lighting_direction: string | null
          living_circle: string | null
          management_fee_includes_parking: boolean | null
          management_fee_unit: string | null
          mortgage_bank: string | null
          nearby_market: string | null
          parking_entrance: string | null
          parking_management_fee: number | null
          parking_status: string | null
          property_id: string
          property_type: string
          resident_management_fee: number | null
          road_width_meters: number | null
          showing_method: string | null
          showing_notes: string | null
          updated_at: string
        }
        Insert: {
          ad_copy_40char?: string | null
          announced_land_value?: number | null
          area_arcade?: number | null
          area_fifth_floor?: number | null
          area_first_floor?: number | null
          area_fourth_floor?: number | null
          area_indoor?: number | null
          area_other_floors?: number | null
          area_second_floor?: number | null
          area_third_floor?: number | null
          building_exterior?: string | null
          building_interior_wall?: string | null
          building_structure?: string | null
          bus_stop?: string | null
          ceiling_material?: string | null
          created_at?: string
          depth_meters?: number | null
          elevator_count?: number | null
          elevator_households?: number | null
          extension_location?: string | null
          floor_material?: string | null
          frontage_meters?: number | null
          handover_condition?: string | null
          has_ground_building?: boolean | null
          has_ground_vegetation?: boolean | null
          has_mortgage_setting?: boolean | null
          has_natural_gas?: boolean | null
          has_security_guard?: boolean | null
          highlight_notes?: string | null
          id?: string
          is_alley_rush?: boolean | null
          is_currently_leased?: boolean | null
          is_safe_alley?: boolean | null
          key_access_method?: string | null
          land_use_zone?: string | null
          lighting_direction?: string | null
          living_circle?: string | null
          management_fee_includes_parking?: boolean | null
          management_fee_unit?: string | null
          mortgage_bank?: string | null
          nearby_market?: string | null
          parking_entrance?: string | null
          parking_management_fee?: number | null
          parking_status?: string | null
          property_id: string
          property_type: string
          resident_management_fee?: number | null
          road_width_meters?: number | null
          showing_method?: string | null
          showing_notes?: string | null
          updated_at?: string
        }
        Update: {
          ad_copy_40char?: string | null
          announced_land_value?: number | null
          area_arcade?: number | null
          area_fifth_floor?: number | null
          area_first_floor?: number | null
          area_fourth_floor?: number | null
          area_indoor?: number | null
          area_other_floors?: number | null
          area_second_floor?: number | null
          area_third_floor?: number | null
          building_exterior?: string | null
          building_interior_wall?: string | null
          building_structure?: string | null
          bus_stop?: string | null
          ceiling_material?: string | null
          created_at?: string
          depth_meters?: number | null
          elevator_count?: number | null
          elevator_households?: number | null
          extension_location?: string | null
          floor_material?: string | null
          frontage_meters?: number | null
          handover_condition?: string | null
          has_ground_building?: boolean | null
          has_ground_vegetation?: boolean | null
          has_mortgage_setting?: boolean | null
          has_natural_gas?: boolean | null
          has_security_guard?: boolean | null
          highlight_notes?: string | null
          id?: string
          is_alley_rush?: boolean | null
          is_currently_leased?: boolean | null
          is_safe_alley?: boolean | null
          key_access_method?: string | null
          land_use_zone?: string | null
          lighting_direction?: string | null
          living_circle?: string | null
          management_fee_includes_parking?: boolean | null
          management_fee_unit?: string | null
          mortgage_bank?: string | null
          nearby_market?: string | null
          parking_entrance?: string | null
          parking_management_fee?: number | null
          parking_status?: string | null
          property_id?: string
          property_type?: string
          resident_management_fee?: number | null
          road_width_meters?: number | null
          showing_method?: string | null
          showing_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string
          display_order: number | null
          id: string
          is_public: boolean | null
          property_id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by: string
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          property_id: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          property_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_faqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_faqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inventory: {
        Row: {
          brand: string | null
          category: string
          condition: string | null
          created_at: string
          id: string
          item_name: string
          location_in_property: string | null
          model_number: string | null
          notes: string | null
          photo_urls: string[] | null
          property_id: string
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          serial_number: string | null
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          brand?: string | null
          category: string
          condition?: string | null
          created_at?: string
          id?: string
          item_name: string
          location_in_property?: string | null
          model_number?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          property_id: string
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          serial_number?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          id?: string
          item_name?: string
          location_in_property?: string | null
          model_number?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          property_id?: string
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          serial_number?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: []
      }
      property_investigation_reports: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          property_id: string
          property_type: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          property_id: string
          property_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          property_id?: string
          property_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_investigation_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_investigation_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_owners: {
        Row: {
          can_receive_email: boolean | null
          created_at: string
          id: string
          is_active_customer: boolean | null
          is_target_customer: boolean | null
          notes: string | null
          owner_birthday: string | null
          owner_contact_address: string | null
          owner_contact_postal_code: string | null
          owner_email: string | null
          owner_gender: string | null
          owner_id_number_enc: string | null
          owner_mobile: string | null
          owner_name: string
          owner_phone_home: string | null
          owner_phone_office: string | null
          owner_residence_address: string | null
          owner_residence_postal_code: string | null
          property_id: string
          property_type: string
          proxy_birthday: string | null
          proxy_id_number_enc: string | null
          proxy_mobile: string | null
          proxy_name: string | null
          proxy_phone_home: string | null
          proxy_phone_office: string | null
          updated_at: string
        }
        Insert: {
          can_receive_email?: boolean | null
          created_at?: string
          id?: string
          is_active_customer?: boolean | null
          is_target_customer?: boolean | null
          notes?: string | null
          owner_birthday?: string | null
          owner_contact_address?: string | null
          owner_contact_postal_code?: string | null
          owner_email?: string | null
          owner_gender?: string | null
          owner_id_number_enc?: string | null
          owner_mobile?: string | null
          owner_name: string
          owner_phone_home?: string | null
          owner_phone_office?: string | null
          owner_residence_address?: string | null
          owner_residence_postal_code?: string | null
          property_id: string
          property_type: string
          proxy_birthday?: string | null
          proxy_id_number_enc?: string | null
          proxy_mobile?: string | null
          proxy_name?: string | null
          proxy_phone_home?: string | null
          proxy_phone_office?: string | null
          updated_at?: string
        }
        Update: {
          can_receive_email?: boolean | null
          created_at?: string
          id?: string
          is_active_customer?: boolean | null
          is_target_customer?: boolean | null
          notes?: string | null
          owner_birthday?: string | null
          owner_contact_address?: string | null
          owner_contact_postal_code?: string | null
          owner_email?: string | null
          owner_gender?: string | null
          owner_id_number_enc?: string | null
          owner_mobile?: string | null
          owner_name?: string
          owner_phone_home?: string | null
          owner_phone_office?: string | null
          owner_residence_address?: string | null
          owner_residence_postal_code?: string | null
          property_id?: string
          property_type?: string
          proxy_birthday?: string | null
          proxy_id_number_enc?: string | null
          proxy_mobile?: string | null
          proxy_name?: string | null
          proxy_phone_home?: string | null
          proxy_phone_office?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          photo_type: string | null
          property_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          photo_type?: string | null
          property_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          photo_type?: string | null
          property_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      property_rentals: {
        Row: {
          address: string
          address_city: string | null
          address_district: string | null
          address_floor: string | null
          address_number: string | null
          address_street: string | null
          address_unit: string | null
          advantages: string | null
          agent_price: number | null
          area_auxiliary: number | null
          area_basement: number | null
          area_building: number | null
          area_common: number | null
          area_extension: number | null
          area_land: number | null
          area_main_building: number | null
          area_parking: number | null
          area_registered: number | null
          area_shared: number | null
          area_usable: number | null
          basement_floors: number | null
          basement_registration_note: string | null
          branch_code: string | null
          building_age_years: number | null
          building_condition: string | null
          building_purpose: string | null
          building_type: string | null
          business_area_code: string | null
          business_area_name: string | null
          case_count: number | null
          commission_date: string | null
          community_code: string | null
          community_name: string | null
          completion_date_raw: string | null
          confidential_notes: string | null
          construction_company: string | null
          contract_category: string | null
          contract_expiry_date: string | null
          created_at: string
          currency: string
          current_loan_amount: number | null
          current_mortgage_amount: number | null
          custom_number: string | null
          data_source: string | null
          deposit_amount: number | null
          details: Json | null
          disadvantages: string | null
          down_payment: number | null
          extra_rooms: number | null
          filing_date: string | null
          floor_max: number | null
          floor_min: number | null
          has_floor_plan: boolean | null
          has_independent_parking: boolean
          has_parking: boolean | null
          has_property_photos: boolean | null
          has_video: boolean | null
          id: string
          is_corner_unit: boolean | null
          is_data_open: boolean | null
          is_investigation_signed: boolean | null
          is_onsite_exposure: boolean | null
          is_pure_land: boolean
          land_number: string | null
          last_followup_date: string | null
          last_modifier: string | null
          last_registration_date: string | null
          latitude: number | null
          layout_balconies: number | null
          layout_bathrooms: number | null
          layout_living_rooms: number | null
          layout_rooms: number | null
          lease_term: number | null
          legacy_code: string | null
          legacy_key_code: string | null
          longitude: number | null
          main_judgment: string | null
          monthly_rent: number
          nearby_elementary: string | null
          nearby_junior_high: string | null
          nearby_mrt: string | null
          nearby_park: string | null
          notes: string | null
          open_date: string | null
          orientation: string | null
          original_listing_code: string | null
          owner_id: string
          parking_inclusion_note: string | null
          parking_number: string | null
          parking_ownership: string | null
          parking_price: number | null
          parking_type: string | null
          postal_code: string | null
          price_includes_parking: boolean | null
          property_source: string | null
          region: string
          rent_includes_tax: boolean | null
          rental_deposit_months: number | null
          selling_reason: string | null
          status: string
          title: string | null
          total_floors: number | null
          transcript_case_number: string | null
          unit_price_registered: number | null
          unit_price_usable: number | null
          updated_at: string
          vr_720_url: string | null
          workflow_control: string | null
          youtube_code: string | null
        }
        Insert: {
          address: string
          address_city?: string | null
          address_district?: string | null
          address_floor?: string | null
          address_number?: string | null
          address_street?: string | null
          address_unit?: string | null
          advantages?: string | null
          agent_price?: number | null
          area_auxiliary?: number | null
          area_basement?: number | null
          area_building?: number | null
          area_common?: number | null
          area_extension?: number | null
          area_land?: number | null
          area_main_building?: number | null
          area_parking?: number | null
          area_registered?: number | null
          area_shared?: number | null
          area_usable?: number | null
          basement_floors?: number | null
          basement_registration_note?: string | null
          branch_code?: string | null
          building_age_years?: number | null
          building_condition?: string | null
          building_purpose?: string | null
          building_type?: string | null
          business_area_code?: string | null
          business_area_name?: string | null
          case_count?: number | null
          commission_date?: string | null
          community_code?: string | null
          community_name?: string | null
          completion_date_raw?: string | null
          confidential_notes?: string | null
          construction_company?: string | null
          contract_category?: string | null
          contract_expiry_date?: string | null
          created_at?: string
          currency?: string
          current_loan_amount?: number | null
          current_mortgage_amount?: number | null
          custom_number?: string | null
          data_source?: string | null
          deposit_amount?: number | null
          details?: Json | null
          disadvantages?: string | null
          down_payment?: number | null
          extra_rooms?: number | null
          filing_date?: string | null
          floor_max?: number | null
          floor_min?: number | null
          has_floor_plan?: boolean | null
          has_independent_parking?: boolean
          has_parking?: boolean | null
          has_property_photos?: boolean | null
          has_video?: boolean | null
          id?: string
          is_corner_unit?: boolean | null
          is_data_open?: boolean | null
          is_investigation_signed?: boolean | null
          is_onsite_exposure?: boolean | null
          is_pure_land?: boolean
          land_number?: string | null
          last_followup_date?: string | null
          last_modifier?: string | null
          last_registration_date?: string | null
          latitude?: number | null
          layout_balconies?: number | null
          layout_bathrooms?: number | null
          layout_living_rooms?: number | null
          layout_rooms?: number | null
          lease_term?: number | null
          legacy_code?: string | null
          legacy_key_code?: string | null
          longitude?: number | null
          main_judgment?: string | null
          monthly_rent?: number
          nearby_elementary?: string | null
          nearby_junior_high?: string | null
          nearby_mrt?: string | null
          nearby_park?: string | null
          notes?: string | null
          open_date?: string | null
          orientation?: string | null
          original_listing_code?: string | null
          owner_id: string
          parking_inclusion_note?: string | null
          parking_number?: string | null
          parking_ownership?: string | null
          parking_price?: number | null
          parking_type?: string | null
          postal_code?: string | null
          price_includes_parking?: boolean | null
          property_source?: string | null
          region?: string
          rent_includes_tax?: boolean | null
          rental_deposit_months?: number | null
          selling_reason?: string | null
          status?: string
          title?: string | null
          total_floors?: number | null
          transcript_case_number?: string | null
          unit_price_registered?: number | null
          unit_price_usable?: number | null
          updated_at?: string
          vr_720_url?: string | null
          workflow_control?: string | null
          youtube_code?: string | null
        }
        Update: {
          address?: string
          address_city?: string | null
          address_district?: string | null
          address_floor?: string | null
          address_number?: string | null
          address_street?: string | null
          address_unit?: string | null
          advantages?: string | null
          agent_price?: number | null
          area_auxiliary?: number | null
          area_basement?: number | null
          area_building?: number | null
          area_common?: number | null
          area_extension?: number | null
          area_land?: number | null
          area_main_building?: number | null
          area_parking?: number | null
          area_registered?: number | null
          area_shared?: number | null
          area_usable?: number | null
          basement_floors?: number | null
          basement_registration_note?: string | null
          branch_code?: string | null
          building_age_years?: number | null
          building_condition?: string | null
          building_purpose?: string | null
          building_type?: string | null
          business_area_code?: string | null
          business_area_name?: string | null
          case_count?: number | null
          commission_date?: string | null
          community_code?: string | null
          community_name?: string | null
          completion_date_raw?: string | null
          confidential_notes?: string | null
          construction_company?: string | null
          contract_category?: string | null
          contract_expiry_date?: string | null
          created_at?: string
          currency?: string
          current_loan_amount?: number | null
          current_mortgage_amount?: number | null
          custom_number?: string | null
          data_source?: string | null
          deposit_amount?: number | null
          details?: Json | null
          disadvantages?: string | null
          down_payment?: number | null
          extra_rooms?: number | null
          filing_date?: string | null
          floor_max?: number | null
          floor_min?: number | null
          has_floor_plan?: boolean | null
          has_independent_parking?: boolean
          has_parking?: boolean | null
          has_property_photos?: boolean | null
          has_video?: boolean | null
          id?: string
          is_corner_unit?: boolean | null
          is_data_open?: boolean | null
          is_investigation_signed?: boolean | null
          is_onsite_exposure?: boolean | null
          is_pure_land?: boolean
          land_number?: string | null
          last_followup_date?: string | null
          last_modifier?: string | null
          last_registration_date?: string | null
          latitude?: number | null
          layout_balconies?: number | null
          layout_bathrooms?: number | null
          layout_living_rooms?: number | null
          layout_rooms?: number | null
          lease_term?: number | null
          legacy_code?: string | null
          legacy_key_code?: string | null
          longitude?: number | null
          main_judgment?: string | null
          monthly_rent?: number
          nearby_elementary?: string | null
          nearby_junior_high?: string | null
          nearby_mrt?: string | null
          nearby_park?: string | null
          notes?: string | null
          open_date?: string | null
          orientation?: string | null
          original_listing_code?: string | null
          owner_id?: string
          parking_inclusion_note?: string | null
          parking_number?: string | null
          parking_ownership?: string | null
          parking_price?: number | null
          parking_type?: string | null
          postal_code?: string | null
          price_includes_parking?: boolean | null
          property_source?: string | null
          region?: string
          rent_includes_tax?: boolean | null
          rental_deposit_months?: number | null
          selling_reason?: string | null
          status?: string
          title?: string | null
          total_floors?: number | null
          transcript_case_number?: string | null
          unit_price_registered?: number | null
          unit_price_usable?: number | null
          updated_at?: string
          vr_720_url?: string | null
          workflow_control?: string | null
          youtube_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_rentals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_rentals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_sales: {
        Row: {
          address: string
          address_city: string | null
          address_district: string | null
          address_floor: string | null
          address_number: string | null
          address_street: string | null
          address_unit: string | null
          advantages: string | null
          agent_price: number | null
          area_auxiliary: number | null
          area_basement: number | null
          area_building: number | null
          area_common: number | null
          area_extension: number | null
          area_land: number | null
          area_main_building: number | null
          area_parking: number | null
          area_registered: number | null
          area_shared: number | null
          area_usable: number | null
          basement_floors: number | null
          basement_registration_note: string | null
          branch_code: string | null
          building_age_years: number | null
          building_condition: string | null
          building_purpose: string | null
          building_type: string | null
          business_area_code: string | null
          business_area_name: string | null
          case_count: number | null
          commission_date: string | null
          community_code: string | null
          community_name: string | null
          completion_date_raw: string | null
          confidential_notes: string | null
          construction_company: string | null
          contract_category: string | null
          contract_expiry_date: string | null
          created_at: string
          currency: string
          current_loan_amount: number | null
          current_mortgage_amount: number | null
          custom_number: string | null
          data_source: string | null
          deposit_amount: number | null
          details: Json | null
          disadvantages: string | null
          down_payment: number | null
          extra_rooms: number | null
          filing_date: string | null
          floor_max: number | null
          floor_min: number | null
          has_floor_plan: boolean | null
          has_independent_parking: boolean
          has_parking: boolean | null
          has_property_photos: boolean | null
          has_video: boolean | null
          id: string
          is_corner_unit: boolean | null
          is_data_open: boolean | null
          is_investigation_signed: boolean | null
          is_onsite_exposure: boolean | null
          is_pure_land: boolean
          land_number: string | null
          last_followup_date: string | null
          last_modifier: string | null
          last_registration_date: string | null
          latitude: number | null
          layout_balconies: number | null
          layout_bathrooms: number | null
          layout_living_rooms: number | null
          layout_rooms: number | null
          legacy_code: string | null
          legacy_key_code: string | null
          longitude: number | null
          main_judgment: string | null
          nearby_elementary: string | null
          nearby_junior_high: string | null
          nearby_mrt: string | null
          nearby_park: string | null
          notes: string | null
          open_date: string | null
          orientation: string | null
          original_listing_code: string | null
          owner_id: string
          parking_inclusion_note: string | null
          parking_number: string | null
          parking_ownership: string | null
          parking_price: number | null
          parking_type: string | null
          postal_code: string | null
          price: number
          price_includes_parking: boolean | null
          property_source: string | null
          region: string
          rent_includes_tax: boolean | null
          rental_deposit_months: number | null
          selling_reason: string | null
          status: string
          title: string | null
          total_floors: number | null
          transcript_case_number: string | null
          unit_price_registered: number | null
          unit_price_usable: number | null
          updated_at: string
          vr_720_url: string | null
          workflow_control: string | null
          youtube_code: string | null
        }
        Insert: {
          address: string
          address_city?: string | null
          address_district?: string | null
          address_floor?: string | null
          address_number?: string | null
          address_street?: string | null
          address_unit?: string | null
          advantages?: string | null
          agent_price?: number | null
          area_auxiliary?: number | null
          area_basement?: number | null
          area_building?: number | null
          area_common?: number | null
          area_extension?: number | null
          area_land?: number | null
          area_main_building?: number | null
          area_parking?: number | null
          area_registered?: number | null
          area_shared?: number | null
          area_usable?: number | null
          basement_floors?: number | null
          basement_registration_note?: string | null
          branch_code?: string | null
          building_age_years?: number | null
          building_condition?: string | null
          building_purpose?: string | null
          building_type?: string | null
          business_area_code?: string | null
          business_area_name?: string | null
          case_count?: number | null
          commission_date?: string | null
          community_code?: string | null
          community_name?: string | null
          completion_date_raw?: string | null
          confidential_notes?: string | null
          construction_company?: string | null
          contract_category?: string | null
          contract_expiry_date?: string | null
          created_at?: string
          currency?: string
          current_loan_amount?: number | null
          current_mortgage_amount?: number | null
          custom_number?: string | null
          data_source?: string | null
          deposit_amount?: number | null
          details?: Json | null
          disadvantages?: string | null
          down_payment?: number | null
          extra_rooms?: number | null
          filing_date?: string | null
          floor_max?: number | null
          floor_min?: number | null
          has_floor_plan?: boolean | null
          has_independent_parking?: boolean
          has_parking?: boolean | null
          has_property_photos?: boolean | null
          has_video?: boolean | null
          id?: string
          is_corner_unit?: boolean | null
          is_data_open?: boolean | null
          is_investigation_signed?: boolean | null
          is_onsite_exposure?: boolean | null
          is_pure_land?: boolean
          land_number?: string | null
          last_followup_date?: string | null
          last_modifier?: string | null
          last_registration_date?: string | null
          latitude?: number | null
          layout_balconies?: number | null
          layout_bathrooms?: number | null
          layout_living_rooms?: number | null
          layout_rooms?: number | null
          legacy_code?: string | null
          legacy_key_code?: string | null
          longitude?: number | null
          main_judgment?: string | null
          nearby_elementary?: string | null
          nearby_junior_high?: string | null
          nearby_mrt?: string | null
          nearby_park?: string | null
          notes?: string | null
          open_date?: string | null
          orientation?: string | null
          original_listing_code?: string | null
          owner_id: string
          parking_inclusion_note?: string | null
          parking_number?: string | null
          parking_ownership?: string | null
          parking_price?: number | null
          parking_type?: string | null
          postal_code?: string | null
          price?: number
          price_includes_parking?: boolean | null
          property_source?: string | null
          region?: string
          rent_includes_tax?: boolean | null
          rental_deposit_months?: number | null
          selling_reason?: string | null
          status?: string
          title?: string | null
          total_floors?: number | null
          transcript_case_number?: string | null
          unit_price_registered?: number | null
          unit_price_usable?: number | null
          updated_at?: string
          vr_720_url?: string | null
          workflow_control?: string | null
          youtube_code?: string | null
        }
        Update: {
          address?: string
          address_city?: string | null
          address_district?: string | null
          address_floor?: string | null
          address_number?: string | null
          address_street?: string | null
          address_unit?: string | null
          advantages?: string | null
          agent_price?: number | null
          area_auxiliary?: number | null
          area_basement?: number | null
          area_building?: number | null
          area_common?: number | null
          area_extension?: number | null
          area_land?: number | null
          area_main_building?: number | null
          area_parking?: number | null
          area_registered?: number | null
          area_shared?: number | null
          area_usable?: number | null
          basement_floors?: number | null
          basement_registration_note?: string | null
          branch_code?: string | null
          building_age_years?: number | null
          building_condition?: string | null
          building_purpose?: string | null
          building_type?: string | null
          business_area_code?: string | null
          business_area_name?: string | null
          case_count?: number | null
          commission_date?: string | null
          community_code?: string | null
          community_name?: string | null
          completion_date_raw?: string | null
          confidential_notes?: string | null
          construction_company?: string | null
          contract_category?: string | null
          contract_expiry_date?: string | null
          created_at?: string
          currency?: string
          current_loan_amount?: number | null
          current_mortgage_amount?: number | null
          custom_number?: string | null
          data_source?: string | null
          deposit_amount?: number | null
          details?: Json | null
          disadvantages?: string | null
          down_payment?: number | null
          extra_rooms?: number | null
          filing_date?: string | null
          floor_max?: number | null
          floor_min?: number | null
          has_floor_plan?: boolean | null
          has_independent_parking?: boolean
          has_parking?: boolean | null
          has_property_photos?: boolean | null
          has_video?: boolean | null
          id?: string
          is_corner_unit?: boolean | null
          is_data_open?: boolean | null
          is_investigation_signed?: boolean | null
          is_onsite_exposure?: boolean | null
          is_pure_land?: boolean
          land_number?: string | null
          last_followup_date?: string | null
          last_modifier?: string | null
          last_registration_date?: string | null
          latitude?: number | null
          layout_balconies?: number | null
          layout_bathrooms?: number | null
          layout_living_rooms?: number | null
          layout_rooms?: number | null
          legacy_code?: string | null
          legacy_key_code?: string | null
          longitude?: number | null
          main_judgment?: string | null
          nearby_elementary?: string | null
          nearby_junior_high?: string | null
          nearby_mrt?: string | null
          nearby_park?: string | null
          notes?: string | null
          open_date?: string | null
          orientation?: string | null
          original_listing_code?: string | null
          owner_id?: string
          parking_inclusion_note?: string | null
          parking_number?: string | null
          parking_ownership?: string | null
          parking_price?: number | null
          parking_type?: string | null
          postal_code?: string | null
          price?: number
          price_includes_parking?: boolean | null
          property_source?: string | null
          region?: string
          rent_includes_tax?: boolean | null
          rental_deposit_months?: number | null
          selling_reason?: string | null
          status?: string
          title?: string | null
          total_floors?: number | null
          transcript_case_number?: string | null
          unit_price_registered?: number | null
          unit_price_usable?: number | null
          updated_at?: string
          vr_720_url?: string | null
          workflow_control?: string | null
          youtube_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_sales_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_sales_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
          property_id: string
          reason: string | null
          status_category: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
          property_id: string
          reason?: string | null
          status_category: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
          property_id?: string
          reason?: string | null
          status_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      property_type_change_logs: {
        Row: {
          changed_by: string
          created_at: string
          effective_date: string
          id: string
          new_price: number | null
          new_type: string
          old_price: number | null
          old_type: string
          property_id: string
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          effective_date: string
          id?: string
          new_price?: number | null
          new_type: string
          old_price?: number | null
          old_type: string
          property_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          effective_date?: string
          id?: string
          new_price?: number | null
          new_type?: string
          old_price?: number | null
          old_type?: string
          property_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_type_change_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_type_change_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_offers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          offer_price: number
          property_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          offer_price: number
          property_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          offer_price?: number
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_configs: {
        Row: {
          created_at: string
          id: string
          max_requests: number
          role_level: string | null
          route_pattern: string
          window_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_requests: number
          role_level?: string | null
          route_pattern: string
          window_seconds: number
        }
        Update: {
          created_at?: string
          id?: string
          max_requests?: number
          role_level?: string | null
          route_pattern?: string
          window_seconds?: number
        }
        Relationships: []
      }
      rbac_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changes: Json | null
          created_at: string | null
          id: string
          role_id: string | null
          role_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          role_id?: string | null
          role_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          role_id?: string | null
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_audit_logs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "iam_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_logs: {
        Row: {
          algorithm_used: string
          created_at: string
          id: string
          input_data: Json
          interaction_at: string | null
          recommendation_type: string
          recommendations: Json
          user_id: string | null
          user_interaction: string | null
        }
        Insert: {
          algorithm_used: string
          created_at?: string
          id?: string
          input_data: Json
          interaction_at?: string | null
          recommendation_type: string
          recommendations: Json
          user_id?: string | null
          user_interaction?: string | null
        }
        Update: {
          algorithm_used?: string
          created_at?: string
          id?: string
          input_data?: Json
          interaction_at?: string | null
          recommendation_type?: string
          recommendations?: Json
          user_id?: string | null
          user_interaction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      regions_settings: {
        Row: {
          country_code: string
          currency_code: string | null
          features_enabled: Json | null
          tax_rate_percentage: number | null
        }
        Insert: {
          country_code: string
          currency_code?: string | null
          features_enabled?: Json | null
          tax_rate_percentage?: number | null
        }
        Update: {
          country_code?: string
          currency_code?: string | null
          features_enabled?: Json | null
          tax_rate_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_settings_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rent_receipts: {
        Row: {
          amount: number
          created_at: string
          currency_code: string | null
          id: string
          is_sent: boolean | null
          issue_date: string
          landlord_id: string
          period_from: string
          period_to: string
          property_id: string
          receipt_file_path: string | null
          receipt_number: string
          rental_ledger_id: string
          sent_at: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code?: string | null
          id?: string
          is_sent?: boolean | null
          issue_date: string
          landlord_id: string
          period_from: string
          period_to: string
          property_id: string
          receipt_file_path?: string | null
          receipt_number: string
          rental_ledger_id: string
          sent_at?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string | null
          id?: string
          is_sent?: boolean | null
          issue_date?: string
          landlord_id?: string
          period_from?: string
          period_to?: string
          property_id?: string
          receipt_file_path?: string | null
          receipt_number?: string
          rental_ledger_id?: string
          sent_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_receipts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_rental_ledger_id_fkey"
            columns: ["rental_ledger_id"]
            isOneToOne: false
            referencedRelation: "rental_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_applications: {
        Row: {
          additional_notes: string | null
          applicant_email: string | null
          applicant_id: string
          applicant_name: string
          applicant_phone: string | null
          created_at: string | null
          desired_move_in: string | null
          employment_status: string | null
          has_pets: boolean | null
          id: string
          landlord_id: string
          lease_term_months: number
          monthly_income: number | null
          occupants_count: number | null
          offer_amount: number
          property_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          applicant_email?: string | null
          applicant_id: string
          applicant_name: string
          applicant_phone?: string | null
          created_at?: string | null
          desired_move_in?: string | null
          employment_status?: string | null
          has_pets?: boolean | null
          id?: string
          landlord_id: string
          lease_term_months?: number
          monthly_income?: number | null
          occupants_count?: number | null
          offer_amount: number
          property_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          applicant_email?: string | null
          applicant_id?: string
          applicant_name?: string
          applicant_phone?: string | null
          created_at?: string | null
          desired_move_in?: string | null
          employment_status?: string | null
          has_pets?: boolean | null
          id?: string
          landlord_id?: string
          lease_term_months?: number
          monthly_income?: number | null
          occupants_count?: number | null
          offer_amount?: number
          property_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_ledger: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          created_by: string
          currency_code: string | null
          description: string | null
          id: string
          is_verified: boolean | null
          payment_method: string | null
          property_id: string
          receipt_number: string | null
          tenant_id: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          created_by: string
          currency_code?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          payment_method?: string | null
          property_id: string
          receipt_number?: string | null
          tenant_id?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          payment_method?: string | null
          property_id?: string
          receipt_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_ledger_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledger_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledger_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_agreements: {
        Row: {
          buyer_id: string | null
          buyer_name: string
          closing_date: string | null
          contingencies: string | null
          contract_file_path: string | null
          contract_number: string
          created_at: string
          down_payment: number
          id: string
          property_id: string
          purchase_price: number
          seller_id: string
          signed_by_buyer: boolean | null
          signed_by_seller: boolean | null
          status: string | null
          terms_and_conditions: string
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          buyer_name: string
          closing_date?: string | null
          contingencies?: string | null
          contract_file_path?: string | null
          contract_number: string
          created_at?: string
          down_payment: number
          id?: string
          property_id: string
          purchase_price: number
          seller_id: string
          signed_by_buyer?: boolean | null
          signed_by_seller?: boolean | null
          status?: string | null
          terms_and_conditions: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string
          closing_date?: string | null
          contingencies?: string | null
          contract_file_path?: string | null
          contract_number?: string
          created_at?: string
          down_payment?: number
          id?: string
          property_id?: string
          purchase_price?: number
          seller_id?: string
          signed_by_buyer?: boolean | null
          signed_by_seller?: boolean | null
          status?: string | null
          terms_and_conditions?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_agreements_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_agreements_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_agreements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_agreements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_ledger: {
        Row: {
          amount: number
          bank_account_id: string | null
          buyer_id_number: string | null
          buyer_name: string | null
          created_at: string
          created_by: string
          currency_code: string | null
          description: string | null
          id: string
          is_verified: boolean | null
          payment_method: string | null
          property_id: string
          receipt_number: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          buyer_id_number?: string | null
          buyer_name?: string | null
          created_at?: string
          created_by: string
          currency_code?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          payment_method?: string | null
          property_id: string
          receipt_number?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          buyer_id_number?: string | null
          buyer_name?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          payment_method?: string | null
          property_id?: string
          receipt_number?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_ledger_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_prompts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_favorite: boolean
          module_key: string | null
          name: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_favorite?: boolean
          module_key?: string | null
          name: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_favorite?: boolean
          module_key?: string | null
          name?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_configs: {
        Row: {
          id: string
          keywords: string[] | null
          meta_description: string | null
          og_image_url: string | null
          page_route: string
          title: string
          updated_at: string
        }
        Insert: {
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          og_image_url?: string | null
          page_route: string
          title: string
          updated_at?: string
        }
        Update: {
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          og_image_url?: string | null
          page_route?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          license_number: string | null
          phone: string
          provider_type: string
          rating: number | null
          service_areas: string[] | null
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          phone: string
          provider_type: string
          rating?: number | null
          service_areas?: string[] | null
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          phone?: string
          provider_type?: string
          rating?: number | null
          service_areas?: string[] | null
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      social_auth_connections: {
        Row: {
          access_token_enc: string | null
          created_at: string
          display_name: string | null
          email: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          profile_picture_url: string | null
          provider: string
          provider_user_id: string
          refresh_token_enc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          profile_picture_url?: string | null
          provider: string
          provider_user_id: string
          refresh_token_enc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          profile_picture_url?: string | null
          provider?: string
          provider_user_id?: string
          refresh_token_enc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_auth_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_auth_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_alerts: {
        Row: {
          created_at: string
          id: string
          quota_bytes: number
          resolved_at: string | null
          threshold_percent: number
          triggered_at: string
          used_bytes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quota_bytes: number
          resolved_at?: string | null
          threshold_percent?: number
          triggered_at?: string
          used_bytes: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quota_bytes?: number
          resolved_at?: string | null
          threshold_percent?: number
          triggered_at?: string
          used_bytes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_quotas: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          quota_bytes: number
          set_by: string | null
          updated_at: string | null
          used_bytes: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          quota_bytes?: number
          set_by?: string | null
          updated_at?: string | null
          used_bytes?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          quota_bytes?: number
          set_by?: string | null
          updated_at?: string | null
          used_bytes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_quotas_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_quotas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_blacklist: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      system_maintenance_logs: {
        Row: {
          completed_at: string | null
          details: string | null
          id: string
          started_at: string
          status: string
          task_name: string
        }
        Insert: {
          completed_at?: string | null
          details?: string | null
          id?: string
          started_at: string
          status: string
          task_name: string
        }
        Update: {
          completed_at?: string | null
          details?: string | null
          id?: string
          started_at?: string
          status?: string
          task_name?: string
        }
        Relationships: []
      }
      system_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          country_code: string
          created_at: string
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          rate_percentage: number
          region_code: string | null
          tax_type: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          description?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate_percentage: number
          region_code?: string | null
          tax_type: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate_percentage?: number
          region_code?: string | null
          tax_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_reports: {
        Row: {
          created_at: string
          filed_date: string | null
          filing_status: string | null
          id: string
          landlord_id: string
          report_file_path: string | null
          report_type: string
          report_year: number
          tax_amount: number | null
          taxable_income: number | null
          total_expenses: number | null
          total_income: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          filed_date?: string | null
          filing_status?: string | null
          id?: string
          landlord_id: string
          report_file_path?: string | null
          report_type: string
          report_year: number
          tax_amount?: number | null
          taxable_income?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          filed_date?: string | null
          filing_status?: string | null
          id?: string
          landlord_id?: string
          report_file_path?: string | null
          report_type?: string
          report_year?: number
          tax_amount?: number | null
          taxable_income?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_reports_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_reports_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_inquiries: {
        Row: {
          created_at: string
          id: string
          inquirer_email: string | null
          inquirer_name: string
          inquirer_phone: string | null
          inquiry_type: string | null
          landlord_id: string | null
          message: string
          property_id: string
          replied_at: string | null
          replied_by: string | null
          reply_message: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inquirer_email?: string | null
          inquirer_name: string
          inquirer_phone?: string | null
          inquiry_type?: string | null
          landlord_id?: string | null
          message: string
          property_id: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inquirer_email?: string | null
          inquirer_name?: string
          inquirer_phone?: string | null
          inquiry_type?: string | null
          landlord_id?: string | null
          message?: string
          property_id?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_inquiries_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_inquiries_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_inquiries_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_inquiries_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_settings: {
        Row: {
          created_at: string
          custom_css: string | null
          font_size: string | null
          id: string
          language: string | null
          primary_color: string | null
          theme_mode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_css?: string | null
          font_size?: string | null
          id?: string
          language?: string | null
          primary_color?: string | null
          theme_mode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_css?: string | null
          font_size?: string | null
          id?: string
          language?: string | null
          primary_color?: string | null
          theme_mode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_parse_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          phase_message: string | null
          progress: Json
          property_document_id: string
          requested_by_user_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          phase_message?: string | null
          progress?: Json
          property_document_id: string
          requested_by_user_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          phase_message?: string | null
          progress?: Json
          property_document_id?: string
          requested_by_user_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_parse_jobs_property_document_id_fkey"
            columns: ["property_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_conversion_logs: {
        Row: {
          context: string | null
          conversion_rate: number
          conversion_type: string
          created_at: string
          from_unit: string
          from_value: number
          id: string
          to_unit: string
          to_value: number
          user_id: string | null
        }
        Insert: {
          context?: string | null
          conversion_rate: number
          conversion_type: string
          created_at?: string
          from_unit: string
          from_value: number
          id?: string
          to_unit: string
          to_value: number
          user_id?: string | null
        }
        Update: {
          context?: string | null
          conversion_rate?: number
          conversion_type?: string
          created_at?: string
          from_unit?: string
          from_value?: number
          id?: string
          to_unit?: string
          to_value?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_conversion_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversion_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_progress: {
        Row: {
          bytes_uploaded: number | null
          chunk_size: number | null
          chunks_uploaded: number | null
          completed_at: string | null
          error_message: string | null
          file_name: string
          file_size_bytes: number
          id: string
          started_at: string
          total_chunks: number | null
          upload_status: string | null
          upload_url: string | null
          user_id: string
        }
        Insert: {
          bytes_uploaded?: number | null
          chunk_size?: number | null
          chunks_uploaded?: number | null
          completed_at?: string | null
          error_message?: string | null
          file_name: string
          file_size_bytes: number
          id?: string
          started_at?: string
          total_chunks?: number | null
          upload_status?: string | null
          upload_url?: string | null
          user_id: string
        }
        Update: {
          bytes_uploaded?: number | null
          chunk_size?: number | null
          chunks_uploaded?: number | null
          completed_at?: string | null
          error_message?: string | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          started_at?: string
          total_chunks?: number | null
          upload_status?: string | null
          upload_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_description: string | null
          activity_type: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_description?: string | null
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          admin_response: string | null
          attachments: string[] | null
          category: string | null
          created_at: string
          description: string
          feedback_type: string
          id: string
          priority: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          attachments?: string[] | null
          category?: string | null
          created_at?: string
          description: string
          feedback_type: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          attachments?: string[] | null
          category?: string | null
          created_at?: string
          description?: string
          feedback_type?: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          facebook_page_id: string | null
          facebook_page_name: string | null
          facebook_page_token: string | null
          facebook_token_expires_at: string | null
          google_access_token: string | null
          google_blog_id: string | null
          google_blog_name: string | null
          google_blog_url: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          is_connected: boolean
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_page_token?: string | null
          facebook_token_expires_at?: string | null
          google_access_token?: string | null
          google_blog_id?: string | null
          google_blog_name?: string | null
          google_blog_url?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          is_connected?: boolean
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_page_token?: string | null
          facebook_token_expires_at?: string | null
          google_access_token?: string | null
          google_blog_id?: string | null
          google_blog_name?: string | null
          google_blog_url?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          is_connected?: boolean
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          group_id: string | null
          id: string
          invite_code: string | null
          metadata: Json | null
          role: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          group_id?: string | null
          id?: string
          invite_code?: string | null
          metadata?: Json | null
          role?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          group_id?: string | null
          id?: string
          invite_code?: string | null
          metadata?: Json | null
          role?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token?: string
        }
        Relationships: []
      }
      user_page_settings: {
        Row: {
          page_key: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          page_key: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          page_key?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reviews: {
        Row: {
          cons: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_published: boolean | null
          is_verified: boolean | null
          pros: string | null
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          cons?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_published?: boolean | null
          is_verified?: boolean | null
          pros?: string | null
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          cons?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_published?: boolean | null
          is_verified?: boolean | null
          pros?: string | null
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vlm_credentials: {
        Row: {
          api_key_ciphertext: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          nonce: string
          provider: string
          salt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_ciphertext: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          nonce: string
          provider: string
          salt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_ciphertext?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          nonce?: string
          provider?: string
          salt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vlm_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      users_profile: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          currency: string
          display_name: string
          facebook_url: string | null
          id: string
          id_number_enc: string | null
          instagram_url: string | null
          line_id: string | null
          phone: string | null
          primary_role: string
          region: string
          role: string
          role_preferences: Json | null
          roles: string[]
          storage_quota_bytes: number | null
          storage_used_bytes: number | null
          updated_at: string
          wechat_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name: string
          facebook_url?: string | null
          id: string
          id_number_enc?: string | null
          instagram_url?: string | null
          line_id?: string | null
          phone?: string | null
          primary_role?: string
          region?: string
          role?: string
          role_preferences?: Json | null
          roles?: string[]
          storage_quota_bytes?: number | null
          storage_used_bytes?: number | null
          updated_at?: string
          wechat_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string
          facebook_url?: string | null
          id?: string
          id_number_enc?: string | null
          instagram_url?: string | null
          line_id?: string | null
          phone?: string | null
          primary_role?: string
          region?: string
          role?: string
          role_preferences?: Json | null
          roles?: string[]
          storage_quota_bytes?: number | null
          storage_used_bytes?: number | null
          updated_at?: string
          wechat_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_profile_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      users_track_history: {
        Row: {
          created_at: string
          device_info: Json | null
          event_name: string | null
          event_type: string
          id: string
          ip_address: unknown
          location_data: Json | null
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          event_name?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          location_data?: Json | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          event_name?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          location_data?: Json | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_track_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_track_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      version_history: {
        Row: {
          changelog: Json
          created_at: string
          deployed_at: string | null
          deployed_by: string | null
          id: string
          is_current: boolean | null
          migration_required: boolean | null
          release_date: string
          release_type: string
          rollback_available: boolean | null
          version_number: string
        }
        Insert: {
          changelog: Json
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          id?: string
          is_current?: boolean | null
          migration_required?: boolean | null
          release_date: string
          release_type: string
          rollback_available?: boolean | null
          version_number: string
        }
        Update: {
          changelog?: Json
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          id?: string
          is_current?: boolean | null
          migration_required?: boolean | null
          release_date?: string
          release_type?: string
          rollback_available?: boolean | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "version_history_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "version_history_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_appointments_buyer: {
        Row: {
          buyer_lead_id: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          landlord_id: string | null
          preferred_date: string
          preferred_time: string
          property_id: string
          status: string | null
          updated_at: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          buyer_lead_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          landlord_id?: string | null
          preferred_date: string
          preferred_time: string
          property_id: string
          status?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          buyer_lead_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          landlord_id?: string | null
          preferred_date?: string
          preferred_time?: string
          property_id?: string
          status?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_appointments_buyer_buyer_lead_id_fkey"
            columns: ["buyer_lead_id"]
            isOneToOne: false
            referencedRelation: "leads_buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_appointments_buyer_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_appointments_buyer_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_appointments_tenant: {
        Row: {
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          landlord_id: string | null
          preferred_date: string
          preferred_time: string
          property_id: string
          status: string | null
          tenant_lead_id: string | null
          updated_at: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          landlord_id?: string | null
          preferred_date: string
          preferred_time: string
          property_id: string
          status?: string | null
          tenant_lead_id?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          landlord_id?: string | null
          preferred_date?: string
          preferred_time?: string
          property_id?: string
          status?: string | null
          tenant_lead_id?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_appointments_tenant_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_appointments_tenant_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_appointments_tenant_tenant_lead_id_fkey"
            columns: ["tenant_lead_id"]
            isOneToOne: false
            referencedRelation: "leads_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_phone_numbers: {
        Row: {
          country_code: string
          created_at: string
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_cost: number | null
          number_type: string | null
          phone_number: string
          provider: string
          purpose: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_cost?: number | null
          number_type?: string | null
          phone_number: string
          provider: string
          purpose?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_cost?: number | null
          number_type?: string | null
          phone_number?: string
          provider?: string
          purpose?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_phone_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_phone_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      vlm_parsing_logs: {
        Row: {
          confidence_score: number | null
          cost: number | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          id: string
          image_url: string
          processing_time_ms: number | null
          prompt_text: string
          status: string | null
          vlm_model: string
        }
        Insert: {
          confidence_score?: number | null
          cost?: number | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          image_url: string
          processing_time_ms?: number | null
          prompt_text: string
          status?: string | null
          vlm_model: string
        }
        Update: {
          confidence_score?: number | null
          cost?: number | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          image_url?: string
          processing_time_ms?: number | null
          prompt_text?: string
          status?: string | null
          vlm_model?: string
        }
        Relationships: []
      }
      web_analytics: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          page_path: string
          session_id: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          page_path: string
          session_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          page_path?: string
          session_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      web_vitals: {
        Row: {
          cls_score: number | null
          connection_type: string | null
          created_at: string | null
          device_type: string | null
          fcp_ms: number | null
          fid_ms: number | null
          id: string
          inp_ms: number | null
          lcp_ms: number | null
          page_path: string
          session_id: string | null
          ttfb_ms: number | null
          user_agent: string | null
        }
        Insert: {
          cls_score?: number | null
          connection_type?: string | null
          created_at?: string | null
          device_type?: string | null
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          inp_ms?: number | null
          lcp_ms?: number | null
          page_path: string
          session_id?: string | null
          ttfb_ms?: number | null
          user_agent?: string | null
        }
        Update: {
          cls_score?: number | null
          connection_type?: string | null
          created_at?: string | null
          device_type?: string | null
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          inp_ms?: number | null
          lcp_ms?: number | null
          page_path?: string
          session_id?: string | null
          ttfb_ms?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string
          created_by: string | null
          event_triggers: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          method: string
          name: string
          retry_count: number | null
          secret_key: string | null
          timeout_seconds: number | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_triggers: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          method?: string
          name: string
          retry_count?: number | null
          secret_key?: string | null
          timeout_seconds?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_triggers?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          method?: string
          name?: string
          retry_count?: number | null
          secret_key?: string | null
          timeout_seconds?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist_blacklist: {
        Row: {
          created_at: string
          id: string
          list_type: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_type: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          list_type?: string
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      behavior_daily_stats: {
        Row: {
          anomaly_count: number | null
          api_calls: number | null
          page_views: number | null
          stat_date: string | null
          total_events: number | null
          unique_ips: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      iam_users_view: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          raw_user_meta_data: Json | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_sign_in_at?: string | null
          raw_user_meta_data?: Json | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_sign_in_at?: string | null
          raw_user_meta_data?: Json | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          created_at: string | null
          details: Json | null
          id: string | null
          monthly_rent: number | null
          owner_id: string | null
          price: number | null
          property_type: string | null
          status: string | null
        }
        Relationships: []
      }
      users_profile_with_role: {
        Row: {
          address: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          id_number_enc: string | null
          phone: string | null
          primary_role: string | null
          role: string | null
          role_preferences: Json | null
          roles: string[] | null
          storage_quota_bytes: number | null
          storage_used_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          id_number_enc?: string | null
          phone?: string | null
          primary_role?: string | null
          role?: string | null
          role_preferences?: Json | null
          roles?: string[] | null
          storage_quota_bytes?: number | null
          storage_used_bytes?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          id_number_enc?: string | null
          phone?: string | null
          primary_role?: string | null
          role?: string | null
          role_preferences?: Json | null
          roles?: string[] | null
          storage_quota_bytes?: number | null
          storage_used_bytes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_profile_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "iam_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      web_vitals_page_summary: {
        Row: {
          avg_cls: number | null
          avg_fcp_ms: number | null
          avg_fid_ms: number | null
          avg_lcp_ms: number | null
          avg_ttfb_ms: number | null
          p75_lcp_ms: number | null
          page_path: string | null
          sample_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_user_role: {
        Args: { new_role: string; user_id: string }
        Returns: boolean
      }
      check_agent_permission: {
        Args: {
          p_agent_id: string
          p_landlord_id: string
          p_permission_key: string
          p_property_id?: string
        }
        Returns: boolean
      }
      check_superadmin_blacklist: {
        Args: { p_ip: string; p_user_agent?: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { p_action: string; p_resource: string; p_user_id: string }
        Returns: string
      }
      cleanup_old_behavior_logs: { Args: never; Returns: undefined }
      cleanup_old_logs: { Args: { retention_days?: number }; Returns: number }
      detect_behavior_anomalies: { Args: never; Returns: undefined }
      ensure_user_in_registered_users_group: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      expire_email_verifications: { Args: never; Returns: undefined }
      expire_outdated_authorizations: { Args: never; Returns: undefined }
      get_authorized_landlords: {
        Args: { p_agent_id?: string }
        Returns: {
          authorization_level: string
          landlord_id: string
          landlord_name: string
          property_count: number
          valid_until: string
        }[]
      }
      get_pending_payments_for_property: {
        Args: { p_property_id: string }
        Returns: number
      }
      get_postgres_roles_count: { Args: never; Returns: number }
      get_properties_without_blog_counts: {
        Args: never
        Returns: {
          rentals_without_blog: number
          sales_without_blog: number
        }[]
      }
      get_properties_without_photo_counts: {
        Args: never
        Returns: {
          rentals_without_photo: number
          sales_without_photo: number
        }[]
      }
      get_slow_queries: {
        Args: never
        Returns: {
          avg_time: number
          calls: number
          query: string
          total_time: number
        }[]
      }
      get_storage_file_types: { Args: never; Returns: Json }
      get_storage_summary: { Args: never; Returns: Json }
      get_unverified_documents_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_region: { Args: never; Returns: string }
      get_user_roles: {
        Args: { lookup_user_id: string }
        Returns: {
          role_name: string
        }[]
      }
      has_role: {
        Args: { lookup_user_id: string; role_name: string }
        Returns: boolean
      }
      identify_orphaned_files: {
        Args: { limit_count?: number }
        Returns: {
          bucket_id: string
          created_at: string
          name: string
          size: number
        }[]
      }
      is_identity_verified: { Args: { p_user_id: string }; Returns: boolean }
      is_owner_or_authorized_agent: {
        Args: {
          p_landlord_id: string
          p_property_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      switch_user_role: {
        Args: { new_role: string; user_id: string }
        Returns: boolean
      }
      sync_profile_roles_from_iam: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "expired"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invitation_status: ["pending", "accepted", "expired"],
    },
  },
} as const
