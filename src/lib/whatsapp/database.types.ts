// Generated from a local database with the baseline and the Phase C migration
// applied (supabase gen types typescript --local). The shared file
// src/lib/supabase/database.types.ts is generated from production, which does
// not have these tables until the owner applies the migration. Once it has,
// regenerate that file, point the imports here at it, and delete this one.

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
        ComputedFields: never
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
          detail: NonNullable<Json>
          id: string
          lead_id: number | null
          needs_review: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          summary: string
          type: string
        }
        ComputedFields: never
        Insert: {
          actor_sales_id?: string | null
          conversation_id?: string | null
          created_at?: string
          detail?: NonNullable<Json>
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
          detail?: NonNullable<Json>
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
        ComputedFields: never
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
        ComputedFields: never
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
        ComputedFields: never
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
        ComputedFields: never
        Insert: {
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
        ComputedFields: never
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
          answers: NonNullable<Json>
          conversation_id: string
          created_at: string
          lead_id: number | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          answers?: NonNullable<Json>
          conversation_id: string
          created_at?: string
          lead_id?: number | null
          updated_at?: string
        }
        Update: {
          answers?: NonNullable<Json>
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_login_email: { Args: { p_username: string }; Returns: string }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      normalize_phone_wa: { Args: { p_phone: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
