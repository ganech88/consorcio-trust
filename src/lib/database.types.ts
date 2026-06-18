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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_consortia: {
        Row: {
          admin_id: string
          consortium_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
        }
        Insert: {
          admin_id: string
          consortium_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
        }
        Update: {
          admin_id?: string
          consortium_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_consortia_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_consortia_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_consortia_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          capacity: number | null
          consortium_id: string
          id: string
          name: string
          requires_approval: boolean | null
        }
        Insert: {
          capacity?: number | null
          consortium_id: string
          id?: string
          name: string
          requires_approval?: boolean | null
        }
        Update: {
          capacity?: number | null
          consortium_id?: string
          id?: string
          name?: string
          requires_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "amenities_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          category: string | null
          consortium_id: string
          content: string | null
          created_at: string | null
          id: string
          is_important: boolean | null
          pinned: boolean
          title: string
        }
        Insert: {
          category?: string | null
          consortium_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          pinned?: boolean
          title: string
        }
        Update: {
          category?: string | null
          consortium_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          pinned?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_visitors: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          consortium_id: string | null
          created_at: string | null
          id: string
          note: string | null
          time_from: string | null
          time_to: string | null
          user_id: string | null
          valid_from: string | null
          valid_until: string | null
          visitor_name: string
          visitor_type: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          consortium_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          time_from?: string | null
          time_to?: string | null
          user_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
          visitor_name: string
          visitor_type?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          consortium_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          time_from?: string | null
          time_to?: string | null
          user_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
          visitor_name?: string
          visitor_type?: string | null
        }
        Relationships: []
      }
      board_posts: {
        Row: {
          body: string | null
          category: string | null
          consortium_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          reactions_count: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string | null
          consortium_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          reactions_count?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          category?: string | null
          consortium_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          reactions_count?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amenity_id: string
          end_time: string
          id: string
          start_time: string
          status: string | null
          user_id: string
        }
        Insert: {
          amenity_id: string
          end_time: string
          id?: string
          start_time: string
          status?: string | null
          user_id: string
        }
        Update: {
          amenity_id?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          admin_note: string | null
          consortium_id: string
          created_at: string | null
          description: string | null
          id: string
          photo_url: string | null
          priority: string | null
          responded_by: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          consortium_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          photo_url?: string | null
          priority?: string | null
          responded_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          consortium_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          photo_url?: string | null
          priority?: string | null
          responded_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consortia: {
        Row: {
          address: string | null
          admin_email: string | null
          city: string | null
          created_at: string
          cuit: string | null
          id: string
          invite_code: string | null
          name: string
          reminder_days_after_due: number | null
          reminder_days_before_due: number | null
          reminder_enabled: boolean | null
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          city?: string | null
          created_at?: string
          cuit?: string | null
          id?: string
          invite_code?: string | null
          name: string
          reminder_days_after_due?: number | null
          reminder_days_before_due?: number | null
          reminder_enabled?: boolean | null
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          city?: string | null
          created_at?: string
          cuit?: string | null
          id?: string
          invite_code?: string | null
          name?: string
          reminder_days_after_due?: number | null
          reminder_days_before_due?: number | null
          reminder_enabled?: boolean | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          category: string
          color: string
          consortium_id: string | null
          created_at: string
          email: string | null
          emergency: boolean
          hours: string | null
          id: string
          name: string
          phone: string | null
          role: string
          sort_order: number
        }
        Insert: {
          category?: string
          color?: string
          consortium_id?: string | null
          created_at?: string
          email?: string | null
          emergency?: boolean
          hours?: string | null
          id?: string
          name: string
          phone?: string | null
          role: string
          sort_order?: number
        }
        Update: {
          category?: string
          color?: string
          consortium_id?: string | null
          created_at?: string
          email?: string | null
          emergency?: boolean
          hours?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          consortium_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          user_id: string | null
        }
        Insert: {
          consortium_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_id?: string | null
        }
        Update: {
          consortium_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      debt_reminders_log: {
        Row: {
          amount: number | null
          channel: string
          consortium_id: string | null
          id: string
          message: string | null
          sent_at: string | null
          unit_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          channel?: string
          consortium_id?: string | null
          id?: string
          message?: string | null
          sent_at?: string | null
          unit_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          channel?: string
          consortium_id?: string | null
          id?: string
          message?: string | null
          sent_at?: string | null
          unit_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_reminders_log_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_reminders_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          admin_notes: string | null
          consortium_id: string
          created_at: string | null
          description: string | null
          doc_type: string
          file_name: string | null
          file_url: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          consortium_id: string
          created_at?: string | null
          description?: string | null
          doc_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          consortium_id?: string
          created_at?: string | null
          description?: string | null
          doc_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          consortium_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          start_date: string
          title: string
          type: string
        }
        Insert: {
          all_day?: boolean
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          title: string
          type?: string
        }
        Update: {
          all_day?: boolean
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          ai_audit_status: string | null
          ai_estimated_market_price: number | null
          amount: number
          category: string | null
          description: string
          id: string
          receipt_url: string | null
          summary_id: string
          supplier_name: string | null
        }
        Insert: {
          ai_audit_status?: string | null
          ai_estimated_market_price?: number | null
          amount: number
          category?: string | null
          description: string
          id?: string
          receipt_url?: string | null
          summary_id: string
          supplier_name?: string | null
        }
        Update: {
          ai_audit_status?: string | null
          ai_estimated_market_price?: number | null
          amount?: number
          category?: string | null
          description?: string
          id?: string
          receipt_url?: string | null
          summary_id?: string
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "expenses_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payments: {
        Row: {
          amount: number
          expense_id: string
          id: string
          mp_external_reference: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          mp_status: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          expense_id: string
          id?: string
          mp_external_reference?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          mp_status?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          expense_id?: string
          id?: string
          mp_external_reference?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          mp_status?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_period_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          period_id: string | null
          status: string
          unit_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_id?: string | null
          status?: string
          unit_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_id?: string | null
          status?: string
          unit_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_period_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "expense_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_periods: {
        Row: {
          consortium_id: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          period: string
          total_amount: number
        }
        Insert: {
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          period: string
          total_amount: number
        }
        Update: {
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          period?: string
          total_amount?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          consortium_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          period: string
          status: string
          title: string
        }
        Insert: {
          amount: number
          consortium_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          period: string
          status?: string
          title: string
        }
        Update: {
          amount?: number
          consortium_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          period?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_log: {
        Row: {
          amount: number
          category: string
          consortium_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          provider: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category?: string
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          provider?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          provider?: string | null
          receipt_url?: string | null
        }
        Relationships: []
      }
      expenses_summary: {
        Row: {
          consortium_id: string
          due_date: string | null
          id: string
          pdf_url: string | null
          period: string
          status: string | null
          total_amount: number
        }
        Insert: {
          consortium_id: string
          due_date?: string | null
          id?: string
          pdf_url?: string | null
          period: string
          status?: string | null
          total_amount: number
        }
        Update: {
          consortium_id?: string
          due_date?: string | null
          id?: string
          pdf_url?: string | null
          period?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_summary_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          amount: number
          applied_by: string | null
          attachment_url: string | null
          consortium_id: string
          created_at: string | null
          fine_date: string
          id: string
          notes: string | null
          period: string | null
          reason: string
          status: string
          unit_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          applied_by?: string | null
          attachment_url?: string | null
          consortium_id: string
          created_at?: string | null
          fine_date?: string
          id?: string
          notes?: string | null
          period?: string | null
          reason: string
          status?: string
          unit_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          applied_by?: string | null
          attachment_url?: string | null
          consortium_id?: string
          created_at?: string | null
          fine_date?: string
          id?: string
          notes?: string | null
          period?: string | null
          reason?: string
          status?: string
          unit_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fines_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          category: string | null
          consortium_id: string | null
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          id: string
          last_completed: string | null
          name: string
          next_due: string | null
          notes: string | null
          recurrence: string | null
        }
        Insert: {
          category?: string | null
          consortium_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          last_completed?: string | null
          name: string
          next_due?: string | null
          notes?: string | null
          recurrence?: string | null
        }
        Update: {
          category?: string | null
          consortium_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          last_completed?: string | null
          name?: string
          next_due?: string | null
          notes?: string | null
          recurrence?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_config: {
        Row: {
          access_token: string
          consortium_id: string
          created_at: string | null
          enabled: boolean | null
          id: string
          public_key: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          consortium_id: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          public_key?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          consortium_id?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          public_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_config_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: true
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          carrier: string | null
          collected_at: string | null
          consortium_id: string | null
          created_at: string | null
          description: string | null
          id: string
          logged_at: string | null
          logged_by: string | null
          photo_url: string | null
          status: string | null
          unit_user_id: string | null
        }
        Insert: {
          carrier?: string | null
          collected_at?: string | null
          consortium_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          photo_url?: string | null
          status?: string | null
          unit_user_id?: string | null
        }
        Update: {
          carrier?: string | null
          collected_at?: string | null
          consortium_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          photo_url?: string | null
          status?: string | null
          unit_user_id?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          attachment_url: string | null
          consortium_id: string
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          paid_by: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          consortium_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          paid_by?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          consortium_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          paid_by?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          id: string
          payment_date: string | null
          proof_url: string | null
          status: string | null
          unit_id: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          proof_url?: string | null
          status?: string | null
          unit_id: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          proof_url?: string | null
          status?: string | null
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          consortium_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          options: Json
          title: string
        }
        Insert: {
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          options?: Json
          title: string
        }
        Update: {
          consortium_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          options?: Json
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consortium_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          unit_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          consortium_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
          unit_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          consortium_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          admin_note: string | null
          amenity_id: number
          amenity_name: string
          consortium_id: string | null
          created_at: string
          date: string
          id: string
          status: Database["public"]["Enums"]["reservation_status"]
          time_slot: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amenity_id: number
          amenity_name: string
          consortium_id?: string | null
          created_at?: string
          date: string
          id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          time_slot: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amenity_id?: number
          amenity_name?: string
          consortium_id?: string | null
          created_at?: string
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          time_slot?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          bank_info: string | null
          category: string | null
          consortium_id: string
          created_at: string | null
          cuit: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          bank_info?: string | null
          category?: string | null
          consortium_id: string
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          bank_info?: string | null
          category?: string | null
          consortium_id?: string
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          apartment: string | null
          balance: number | null
          consortium_id: string
          floor: string | null
          id: string
          name: string
          owner_id: string | null
          tenant_id: string | null
        }
        Insert: {
          apartment?: string | null
          balance?: number | null
          consortium_id: string
          floor?: string | null
          id?: string
          name: string
          owner_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          apartment?: string | null
          balance?: number | null
          consortium_id?: string
          floor?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: false
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          authorized_date: string
          consortium_id: string | null
          created_at: string
          doc_number: string | null
          id: string
          name: string
          status: string
          unit_id: string
          user_id: string | null
        }
        Insert: {
          authorized_date?: string
          consortium_id?: string | null
          created_at?: string
          doc_number?: string | null
          id?: string
          name: string
          status?: string
          unit_id: string
          user_id?: string | null
        }
        Update: {
          authorized_date?: string
          consortium_id?: string | null
          created_at?: string
          doc_number?: string | null
          id?: string
          name?: string
          status?: string
          unit_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      mp_config_safe: {
        Row: {
          consortium_id: string | null
          created_at: string | null
          enabled: boolean | null
          id: string | null
          public_key: string | null
          updated_at: string | null
        }
        Insert: {
          consortium_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          public_key?: string | null
          updated_at?: string | null
        }
        Update: {
          consortium_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          public_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_config_consortium_id_fkey"
            columns: ["consortium_id"]
            isOneToOne: true
            referencedRelation: "consortia"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_consortium_and_become_admin: {
        Args: { p_address?: string; p_city?: string; p_name: string }
        Returns: {
          address: string | null
          admin_email: string | null
          city: string | null
          created_at: string
          cuit: string | null
          id: string
          invite_code: string | null
          name: string
          reminder_days_after_due: number | null
          reminder_days_before_due: number | null
          reminder_enabled: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "consortia"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_consortium_id: { Args: never; Returns: string }
      increment_board_reactions: {
        Args: { post_id: string }
        Returns: undefined
      }
      is_consortium_admin: { Args: { cid: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      reservation_status: "pending" | "approved" | "rejected"
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
      reservation_status: ["pending", "approved", "rejected"],
    },
  },
} as const
