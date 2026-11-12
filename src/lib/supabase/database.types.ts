// Generated from the live crm-fsi schema. Regenerate after every migration;
// do not edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_login_email: { Args: { p_username: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
