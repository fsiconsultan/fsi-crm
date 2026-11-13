// Generated from the live crm-fsi schema (supabase gen types typescript
// --project-id yoyszukutqwoxxdolzcg --schema public). Regenerate after every
// migration; do not edit by hand.

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      assignment_history: {
        Row: {
          assigned_by: string | null
          conversation_id: string | null
          created_at: string
          from_sales_id: string | null
          id: string
          lead_id: number | null
          rule: string
          to_sales_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          conversation_id?: string | null
          created_at?: string
          from_sales_id?: string | null
          id?: string
          lead_id?: number | null
          rule: string
          to_sales_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          conversation_id?: string | null
          created_at?: string
          from_sales_id?: string | null
          id?: string
          lead_id?: number | null
          rule?: string
          to_sales_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_history_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_from_sales_id_fkey"
            columns: ["from_sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_to_sales_id_fkey"
            columns: ["to_sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_events: {
        Row: {
          actor_sales_id: string | null
          conversation_id: string | null
          created_at: string
          detail: Json
          id: string
          lead_id: number | null
          needs_review: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          summary: string
          type: string
        }
        Insert: {
          actor_sales_id?: string | null
          conversation_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          lead_id?: number | null
          needs_review?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          summary: string
          type: string
        }
        Update: {
          actor_sales_id?: string | null
          conversation_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          lead_id?: number | null
          needs_review?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          summary?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_events_actor_sales_id_fkey"
            columns: ["actor_sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          customer_id: number
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          customer_id: number
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          customer_id?: number
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_schedules: {
        Row: {
          all_day: boolean
          booked_via: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          email_error: string | null
          email_message_id: string | null
          email_sent_at: string | null
          email_status: string
          ends_at: string | null
          google_error: string | null
          google_event_id: string | null
          google_sync_status: string
          google_synced_at: string | null
          ics_sequence: number
          id: string
          kind: string
          lead_email_snapshot: string | null
          lead_id: number | null
          location: string | null
          notes: string | null
          notify_lead: boolean
          previous_starts_at: string | null
          reschedule_count: number
          sales_id: string | null
          starts_at: string
          status: string
          title: string
          time_zone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          all_day?: boolean
          booked_via?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string
          ends_at?: string | null
          google_error?: string | null
          google_event_id?: string | null
          google_sync_status?: string
          google_synced_at?: string | null
          ics_sequence?: number
          id?: string
          kind: string
          lead_email_snapshot?: string | null
          lead_id?: number | null
          location?: string | null
          notes?: string | null
          notify_lead?: boolean
          previous_starts_at?: string | null
          reschedule_count?: number
          sales_id?: string | null
          starts_at: string
          status?: string
          title: string
          time_zone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          all_day?: boolean
          booked_via?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string
          ends_at?: string | null
          google_error?: string | null
          google_event_id?: string | null
          google_sync_status?: string
          google_synced_at?: string | null
          ics_sequence?: number
          id?: string
          kind?: string
          lead_email_snapshot?: string | null
          lead_id?: number | null
          location?: string | null
          notes?: string | null
          notify_lead?: boolean
          previous_starts_at?: string | null
          reschedule_count?: number
          sales_id?: string | null
          starts_at?: string
          status?: string
          title?: string
          time_zone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_schedules_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_schedules_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_schedules_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          appointment: string | null
          business: string | null
          closing: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          email: string | null
          follow_up_date: string | null
          id: number
          lead_type: string | null
          location: string | null
          notes: string | null
          phone: string | null
          phone_wa: string | null
          quotation: string | null
          sales_id: string | null
          site_survey: string | null
          status: string | null
          status_started_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          appointment?: string | null
          business?: string | null
          closing?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: number
          lead_type?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          phone_wa?: string | null
          quotation?: string | null
          sales_id?: string | null
          site_survey?: string | null
          status?: string | null
          status_started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          appointment?: string | null
          business?: string | null
          closing?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: number
          lead_type?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          phone_wa?: string | null
          quotation?: string | null
          sales_id?: string | null
          site_survey?: string | null
          status?: string | null
          status_started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failure_count: number
          id: string
          last_success_at: string | null
          p256dh: string
          sales_user_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failure_count?: number
          id?: string
          last_success_at?: string | null
          p256dh: string
          sales_user_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failure_count?: number
          id?: string
          last_success_at?: string | null
          p256dh?: string
          sales_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_sales_user_id_fkey"
            columns: ["sales_user_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_users: {
        Row: {
          "auth_user-id": string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          photo_url: string | null
          role: string | null
          status: string | null
          username: string | null
        }
        Insert: {
          "auth_user-id"?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          photo_url?: string | null
          role?: string | null
          status?: string | null
          username?: string | null
        }
        Update: {
          "auth_user-id"?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          photo_url?: string | null
          role?: string | null
          status?: string | null
          username?: string | null
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          ai_pending_since: string | null
          ai_run_at: string | null
          ai_run_id: string | null
          assigned_sales_id: string | null
          created_at: string
          handed_back_at: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_message_preview: string | null
          last_read_at: string | null
          lead_id: number | null
          mode: string
          phone_number_id: string | null
          profile_name: string | null
          source: string
          taken_over_at: string | null
          taken_over_by: string | null
          updated_at: string
          wa_id: string
        }
        Insert: {
          ai_pending_since?: string | null
          ai_run_at?: string | null
          ai_run_id?: string | null
          assigned_sales_id?: string | null
          created_at?: string
          handed_back_at?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_read_at?: string | null
          lead_id?: number | null
          mode?: string
          phone_number_id?: string | null
          profile_name?: string | null
          source?: string
          taken_over_at?: string | null
          taken_over_by?: string | null
          updated_at?: string
          wa_id: string
        }
        Update: {
          ai_pending_since?: string | null
          ai_run_at?: string | null
          ai_run_id?: string | null
          assigned_sales_id?: string | null
          created_at?: string
          handed_back_at?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_read_at?: string | null
          lead_id?: number | null
          mode?: string
          phone_number_id?: string | null
          profile_name?: string | null
          source?: string
          taken_over_at?: string | null
          taken_over_by?: string | null
          updated_at?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_assigned_sales_id_fkey"
            columns: ["assigned_sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_taken_over_by_fkey"
            columns: ["taken_over_by"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          message_type: string
          sender_sales_id: string | null
          sender_type: string
          status: string
          wa_message_id: string | null
          wa_timestamp: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          sender_sales_id?: string | null
          sender_type: string
          status: string
          wa_message_id?: string | null
          wa_timestamp?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          sender_sales_id?: string | null
          sender_type?: string
          status?: string
          wa_message_id?: string | null
          wa_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_sender_sales_id_fkey"
            columns: ["sender_sales_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_qualifications: {
        Row: {
          answers: Json
          conversation_id: string
          created_at: string
          lead_id: number | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          conversation_id: string
          created_at?: string
          lead_id?: number | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          conversation_id?: string
          created_at?: string
          lead_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_qualifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_qualifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_status_backlog: {
        Row: {
          error_code: string | null
          error_message: string | null
          received_at: string
          status: string
          wa_message_id: string
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          received_at?: string
          status: string
          wa_message_id: string
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          received_at?: string
          status?: string
          wa_message_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_login_email: { Args: { p_username: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      normalize_phone_wa: { Args: { p_phone: string }; Returns: string }
      record_push_failure: { Args: { p_id: string }; Returns: undefined }
      register_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent: string
        }
        Returns: string
      }
      wa_find_or_create_lead: {
        Args: {
          p_conversation_id: string
          p_customer_name: string
          p_notes: string
          p_status: string
          p_status_started_at: string
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
