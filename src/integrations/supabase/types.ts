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
      activity_logs: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      app_branding: {
        Row: {
          brand_name: string
          favicon_url: string | null
          id: number
          logo_dark_url: string | null
          logo_light_url: string | null
          site_description: string | null
          site_title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_name?: string
          favicon_url?: string | null
          id?: number
          logo_dark_url?: string | null
          logo_light_url?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_name?: string
          favicon_url?: string | null
          id?: number
          logo_dark_url?: string | null
          logo_light_url?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      booking_reviews: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          follow_up_at: string | null
          follow_up_method: string | null
          follow_up_status: string
          id: string
          internal_note: string | null
          rating: number
          review_text: string | null
          service_quality: string
          submitted_at: string | null
          submitted_via: string | null
          updated_at: string
          user_id: string
          would_recommend: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          follow_up_at?: string | null
          follow_up_method?: string | null
          follow_up_status?: string
          id?: string
          internal_note?: string | null
          rating: number
          review_text?: string | null
          service_quality?: string
          submitted_at?: string | null
          submitted_via?: string | null
          updated_at?: string
          user_id: string
          would_recommend?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          follow_up_at?: string | null
          follow_up_method?: string | null
          follow_up_status?: string
          id?: string
          internal_note?: string | null
          rating?: number
          review_text?: string | null
          service_quality?: string
          submitted_at?: string | null
          submitted_via?: string | null
          updated_at?: string
          user_id?: string
          would_recommend?: string
        }
        Relationships: []
      }
      booking_slots: {
        Row: {
          branch: string
          created_at: string
          id: string
          max_capacity: number
          notes: string | null
          slot_date: string
          slot_time: string
          status: string
          updated_at: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          max_capacity?: number
          notes?: string | null
          slot_date: string
          slot_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          max_capacity?: number
          notes?: string | null
          slot_date?: string
          slot_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_status_logs: {
        Row: {
          booking_id: string
          changed_at: string
          changed_by: string | null
          duration_from_prev_minutes: number | null
          from_status: string | null
          id: string
          to_status: string
        }
        Insert: {
          booking_id: string
          changed_at?: string
          changed_by?: string | null
          duration_from_prev_minutes?: number | null
          from_status?: string | null
          id?: string
          to_status: string
        }
        Update: {
          booking_id?: string
          changed_at?: string
          changed_by?: string | null
          duration_from_prev_minutes?: number | null
          from_status?: string | null
          id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_source: string | null
          booking_time: string
          branch: string | null
          cancel_reason: string | null
          cancel_requested: boolean
          cancel_requested_at: string | null
          car_plate_number: string | null
          car_type: string | null
          cashback_credit_amount: number | null
          cashback_credited: boolean
          cashback_used: number
          created_at: string
          created_branch: string | null
          created_by: string | null
          created_by_role: string | null
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          discount_amount: number
          discount_code: string | null
          discount_label: string | null
          discount_source: string | null
          id: string
          next_service_date: string | null
          original_service_price: number | null
          payment_method: string | null
          payment_status: string
          pickup_accuracy_m: number | null
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_at_workshop_at: string | null
          pickup_dispatched_at: string | null
          pickup_distance_km: number | null
          pickup_driver_id: string | null
          pickup_driver_name: string | null
          pickup_fee: number
          pickup_handover_photos: Json
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_nearest_branch_id: string | null
          pickup_notes: string | null
          pickup_odometer_end: number | null
          pickup_odometer_start: number | null
          pickup_return: boolean
          pickup_return_fee: number
          pickup_returned_at: string | null
          pickup_source: string | null
          pickup_status: string
          promo_claim_id: string | null
          queue_estimated_start: string | null
          queue_note: string | null
          queue_set_at: string | null
          queue_set_by: string | null
          reminder_sent: boolean | null
          review_reminder_dismissed: boolean
          review_reminder_due_at: string | null
          review_reminder_sent_at: string | null
          review_submission_token: string | null
          service_duration: number
          service_location: string
          service_name: string
          service_price: number
          service_status: string
          service_type: string
          status: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          booking_date: string
          booking_source?: string | null
          booking_time: string
          branch?: string | null
          cancel_reason?: string | null
          cancel_requested?: boolean
          cancel_requested_at?: string | null
          car_plate_number?: string | null
          car_type?: string | null
          cashback_credit_amount?: number | null
          cashback_credited?: boolean
          cashback_used?: number
          created_at?: string
          created_branch?: string | null
          created_by?: string | null
          created_by_role?: string | null
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          discount_amount?: number
          discount_code?: string | null
          discount_label?: string | null
          discount_source?: string | null
          id?: string
          next_service_date?: string | null
          original_service_price?: number | null
          payment_method?: string | null
          payment_status?: string
          pickup_accuracy_m?: number | null
          pickup_address?: string | null
          pickup_arrived_at?: string | null
          pickup_at_workshop_at?: string | null
          pickup_dispatched_at?: string | null
          pickup_distance_km?: number | null
          pickup_driver_id?: string | null
          pickup_driver_name?: string | null
          pickup_fee?: number
          pickup_handover_photos?: Json
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_nearest_branch_id?: string | null
          pickup_notes?: string | null
          pickup_odometer_end?: number | null
          pickup_odometer_start?: number | null
          pickup_return?: boolean
          pickup_return_fee?: number
          pickup_returned_at?: string | null
          pickup_source?: string | null
          pickup_status?: string
          promo_claim_id?: string | null
          queue_estimated_start?: string | null
          queue_note?: string | null
          queue_set_at?: string | null
          queue_set_by?: string | null
          reminder_sent?: boolean | null
          review_reminder_dismissed?: boolean
          review_reminder_due_at?: string | null
          review_reminder_sent_at?: string | null
          review_submission_token?: string | null
          service_duration: number
          service_location?: string
          service_name: string
          service_price: number
          service_status?: string
          service_type: string
          status?: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          booking_date?: string
          booking_source?: string | null
          booking_time?: string
          branch?: string | null
          cancel_reason?: string | null
          cancel_requested?: boolean
          cancel_requested_at?: string | null
          car_plate_number?: string | null
          car_type?: string | null
          cashback_credit_amount?: number | null
          cashback_credited?: boolean
          cashback_used?: number
          created_at?: string
          created_branch?: string | null
          created_by?: string | null
          created_by_role?: string | null
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          discount_amount?: number
          discount_code?: string | null
          discount_label?: string | null
          discount_source?: string | null
          id?: string
          next_service_date?: string | null
          original_service_price?: number | null
          payment_method?: string | null
          payment_status?: string
          pickup_accuracy_m?: number | null
          pickup_address?: string | null
          pickup_arrived_at?: string | null
          pickup_at_workshop_at?: string | null
          pickup_dispatched_at?: string | null
          pickup_distance_km?: number | null
          pickup_driver_id?: string | null
          pickup_driver_name?: string | null
          pickup_fee?: number
          pickup_handover_photos?: Json
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_nearest_branch_id?: string | null
          pickup_notes?: string | null
          pickup_odometer_end?: number | null
          pickup_odometer_start?: number | null
          pickup_return?: boolean
          pickup_return_fee?: number
          pickup_returned_at?: string | null
          pickup_source?: string | null
          pickup_status?: string
          promo_claim_id?: string | null
          queue_estimated_start?: string | null
          queue_note?: string | null
          queue_set_at?: string | null
          queue_set_by?: string | null
          reminder_sent?: boolean | null
          review_reminder_dismissed?: boolean
          review_reminder_due_at?: string | null
          review_reminder_sent_at?: string | null
          review_submission_token?: string | null
          service_duration?: number
          service_location?: string
          service_name?: string
          service_price?: number
          service_status?: string
          service_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_pickup_nearest_branch_id_fkey"
            columns: ["pickup_nearest_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_promo_claim_id_fkey"
            columns: ["promo_claim_id"]
            isOneToOne: false
            referencedRelation: "promo_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          created_at: string
          directions_url: string | null
          hours: string
          id: string
          image_url: string | null
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string
          slug: string
          sort_order: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string
          created_at?: string
          directions_url?: string | null
          hours?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string
          slug: string
          sort_order?: number
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          created_at?: string
          directions_url?: string | null
          hours?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      cashback_ledger: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          promo_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          promo_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          promo_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_ledger_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_complaints: {
        Row: {
          admin_note: string | null
          attachment_url: string | null
          category: string
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      internal_reports: {
        Row: {
          category: string
          created_at: string
          description: string
          fixed_at: string | null
          fixed_by: string | null
          fixed_note: string | null
          id: string
          image_url: string | null
          page_url: string | null
          reporter_email: string | null
          reporter_id: string | null
          reporter_name: string | null
          reporter_phone: string | null
          reporter_role: string | null
          source: string
          status: string
          title: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          fixed_at?: string | null
          fixed_by?: string | null
          fixed_note?: string | null
          id?: string
          image_url?: string | null
          page_url?: string | null
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          reporter_role?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          fixed_at?: string | null
          fixed_by?: string | null
          fixed_note?: string | null
          id?: string
          image_url?: string | null
          page_url?: string | null
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          reporter_role?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          invoice_number: string
          items: Json
          payment_method: string | null
          payment_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          id?: string
          invoice_number: string
          items?: Json
          payment_method?: string | null
          payment_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          invoice_number?: string
          items?: Json
          payment_method?: string | null
          payment_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          content?: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          content?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          points: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points: number
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_payment_accounts: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          branch: string | null
          branch_label: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_name: string
          branch?: string | null
          branch_label?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          branch_label?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      manual_payment_proofs: {
        Row: {
          bank_account_id: string | null
          booking_id: string
          created_at: string
          id: string
          method: string
          notes: string | null
          payment_id: string | null
          proof_url: string
          qris_id: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_bank: string | null
          sender_name: string
          status: string
          transfer_amount: number
          transfer_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          payment_id?: string | null
          proof_url: string
          qris_id?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_bank?: string | null
          sender_name: string
          status?: string
          transfer_amount: number
          transfer_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payment_id?: string | null
          proof_url?: string
          qris_id?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_bank?: string | null
          sender_name?: string
          status?: string
          transfer_amount?: number
          transfer_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payment_proofs_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "manual_payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payment_proofs_qris_id_fkey"
            columns: ["qris_id"]
            isOneToOne: false
            referencedRelation: "manual_payment_qris"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payment_qris: {
        Row: {
          branch: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          merchant_name: string
          notes: string | null
          qris_image_url: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          merchant_name: string
          notes?: string | null
          qris_image_url: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          merchant_name?: string
          notes?: string | null
          qris_image_url?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          source: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          source?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          source?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          midtrans_order_id: string | null
          midtrans_transaction_id: string | null
          payment_method: string
          payment_status: string
          updated_at: string
          user_id: string
          verified_by_webhook: boolean
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          payment_method?: string
          payment_status?: string
          updated_at?: string
          user_id: string
          verified_by_webhook?: boolean
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          payment_method?: string
          payment_status?: string
          updated_at?: string
          user_id?: string
          verified_by_webhook?: boolean
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acquisition_source: string | null
          assigned_branch: string | null
          avatar_url: string | null
          created_at: string
          customer_id: string | null
          first_booking_source: string | null
          flagged_at: string | null
          flagged_reason: string | null
          fraud_score: number
          full_name: string | null
          id: string
          is_flagged: boolean
          is_verified: boolean
          payout_bank_account: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          referral_code: string | null
          referral_terms_accepted_at: string | null
          referral_terms_version: number | null
          referred_by: string | null
          signup_ip: string | null
          updated_at: string
        }
        Insert: {
          acquisition_source?: string | null
          assigned_branch?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          first_booking_source?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          fraud_score?: number
          full_name?: string | null
          id: string
          is_flagged?: boolean
          is_verified?: boolean
          payout_bank_account?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          referral_code?: string | null
          referral_terms_accepted_at?: string | null
          referral_terms_version?: number | null
          referred_by?: string | null
          signup_ip?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_source?: string | null
          assigned_branch?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          first_booking_source?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          fraud_score?: number
          full_name?: string | null
          id?: string
          is_flagged?: boolean
          is_verified?: boolean
          payout_bank_account?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          referral_code?: string | null
          referral_terms_accepted_at?: string | null
          referral_terms_version?: number | null
          referred_by?: string | null
          signup_ip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_claims: {
        Row: {
          claimed_at: string
          expires_at: string | null
          id: string
          promo_id: string
          status: string
          used_at: string | null
          user_id: string
          voucher_code: string
        }
        Insert: {
          claimed_at?: string
          expires_at?: string | null
          id?: string
          promo_id: string
          status?: string
          used_at?: string | null
          user_id: string
          voucher_code: string
        }
        Update: {
          claimed_at?: string
          expires_at?: string | null
          id?: string
          promo_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
          voucher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_claims_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          applicable_categories: string[] | null
          applicable_service_ids: string[]
          badge: string | null
          cashback_max_amount: number | null
          cashback_validity_days: number
          claims_count: number
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          max_claims: number | null
          max_claims_per_user: number
          min_purchase: number
          reward_mode: string
          sort_order: number
          starts_at: string
          terms: string | null
          title: string
          updated_at: string
          voucher_prefix: string
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_service_ids?: string[]
          badge?: string | null
          cashback_max_amount?: number | null
          cashback_validity_days?: number
          claims_count?: number
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_claims?: number | null
          max_claims_per_user?: number
          min_purchase?: number
          reward_mode?: string
          sort_order?: number
          starts_at?: string
          terms?: string | null
          title: string
          updated_at?: string
          voucher_prefix?: string
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_service_ids?: string[]
          badge?: string | null
          cashback_max_amount?: number | null
          cashback_validity_days?: number
          claims_count?: number
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_claims?: number | null
          max_claims_per_user?: number
          min_purchase?: number
          reward_mode?: string
          sort_order?: number
          starts_at?: string
          terms?: string | null
          title?: string
          updated_at?: string
          voucher_prefix?: string
        }
        Relationships: []
      }
      push_delivery_logs: {
        Row: {
          created_at: string
          detail: Json
          event_type: string
          id: string
          notification_id: string | null
          platform: string | null
          status_code: number | null
          token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          notification_id?: string | null
          platform?: string | null
          status_code?: number | null
          token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          notification_id?: string | null
          platform?: string | null
          status_code?: number | null
          token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_delivery_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          invalid_reason: string | null
          invalidated_at: string | null
          last_active: string | null
          platform: string
          role: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          invalid_reason?: string | null
          invalidated_at?: string | null
          last_active?: string | null
          platform: string
          role?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          invalid_reason?: string | null
          invalidated_at?: string | null
          last_active?: string | null
          platform?: string
          role?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pwa_events: {
        Row: {
          created_at: string
          event: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pwa_settings: {
        Row: {
          banner_enabled: boolean
          banner_subtitle: string
          banner_title: string
          default_ringtone: string
          default_vibrate: boolean
          delay_seconds: number
          id: number
          notification_enabled: boolean
          notification_icon_url: string | null
          notification_sound_url: string | null
          reprompt_days: number
          updated_at: string
        }
        Insert: {
          banner_enabled?: boolean
          banner_subtitle?: string
          banner_title?: string
          default_ringtone?: string
          default_vibrate?: boolean
          delay_seconds?: number
          id?: number
          notification_enabled?: boolean
          notification_icon_url?: string | null
          notification_sound_url?: string | null
          reprompt_days?: number
          updated_at?: string
        }
        Update: {
          banner_enabled?: boolean
          banner_subtitle?: string
          banner_title?: string
          default_ringtone?: string
          default_vibrate?: boolean
          delay_seconds?: number
          id?: number
          notification_enabled?: boolean
          notification_icon_url?: string | null
          notification_sound_url?: string | null
          reprompt_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_balances: {
        Row: {
          available_balance: number
          pending_balance: number
          total_converted: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          pending_balance?: number
          total_converted?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          pending_balance?: number
          total_converted?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount: number
          available_at: string | null
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          referee_id: string
          referrer_id: string
          status: string
          type: string
        }
        Insert: {
          amount: number
          available_at?: string | null
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          referee_id: string
          referrer_id: string
          status?: string
          type: string
        }
        Update: {
          amount?: number
          available_at?: string | null
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          referee_id?: string
          referrer_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      referral_fraud_log: {
        Row: {
          created_at: string
          details: Json
          id: string
          related_user_id: string | null
          rule: string
          score_delta: number
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          related_user_id?: string | null
          rule: string
          score_delta?: number
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          related_user_id?: string | null
          rule?: string
          score_delta?: number
          user_id?: string
        }
        Relationships: []
      }
      referral_ip_allowlist: {
        Row: {
          created_at: string
          created_by: string | null
          ip: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ip: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          active_from: string | null
          active_until: string | null
          booking_commission_pct: number
          fraud_score_flag_threshold: number
          id: number
          is_active: boolean
          max_referrals_per_day: number
          max_referrals_per_month: number
          min_withdraw: number
          point_value_rp: number
          same_ip_threshold: number
          signup_bonus: number
          signup_bonus_hold_days: number
          terms_text: string | null
          terms_version: number
          updated_at: string
          updated_by: string | null
          voucher_conversion_rate: number
          voucher_validity_days: number
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          booking_commission_pct?: number
          fraud_score_flag_threshold?: number
          id?: number
          is_active?: boolean
          max_referrals_per_day?: number
          max_referrals_per_month?: number
          min_withdraw?: number
          point_value_rp?: number
          same_ip_threshold?: number
          signup_bonus?: number
          signup_bonus_hold_days?: number
          terms_text?: string | null
          terms_version?: number
          updated_at?: string
          updated_by?: string | null
          voucher_conversion_rate?: number
          voucher_validity_days?: number
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          booking_commission_pct?: number
          fraud_score_flag_threshold?: number
          id?: number
          is_active?: boolean
          max_referrals_per_day?: number
          max_referrals_per_month?: number
          min_withdraw?: number
          point_value_rp?: number
          same_ip_threshold?: number
          signup_bonus?: number
          signup_bonus_hold_days?: number
          terms_text?: string | null
          terms_version?: number
          updated_at?: string
          updated_by?: string | null
          voucher_conversion_rate?: number
          voucher_validity_days?: number
        }
        Relationships: []
      }
      referral_signups_meta: {
        Row: {
          created_at: string
          referee_id: string
          referrer_id: string
          signup_ip: string | null
          signup_phone: string | null
        }
        Insert: {
          created_at?: string
          referee_id: string
          referrer_id: string
          signup_ip?: string | null
          signup_phone?: string | null
        }
        Update: {
          created_at?: string
          referee_id?: string
          referrer_id?: string
          signup_ip?: string | null
          signup_phone?: string | null
        }
        Relationships: []
      }
      referral_vouchers: {
        Row: {
          amount: number
          code: string
          created_at: string
          expires_at: string
          id: string
          status: string
          used_at: string | null
          used_booking_id: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          status?: string
          used_at?: string | null
          used_booking_id?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          used_at?: string | null
          used_booking_id?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_withdrawals: {
        Row: {
          account_holder: string
          account_number: string
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          proof_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          admin_note?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_favorite: boolean
          is_global: boolean
          kind: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_global?: boolean
          kind: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_global?: boolean
          kind?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          points_spent: number
          redemption_code: string
          reward_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          points_spent: number
          redemption_code: string
          reward_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          points_spent?: number
          redemption_code?: string
          reward_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          applicable_categories: string[] | null
          applicable_service_ids: string[]
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          name: string
          points_required: number
          updated_at: string
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_service_ids?: string[]
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          name: string
          points_required: number
          updated_at?: string
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_service_ids?: string[]
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_icons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          kind: string
          label: string | null
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          kind?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          kind?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          badge: string | null
          booking_service_id: string | null
          category: string
          created_at: string
          description: string | null
          duration: number
          home_color: string | null
          home_sort_order: number
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          is_popular: boolean
          media_urls: Json
          name: string
          price: number
          rating: number
          reviews: number
          show_on_home: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          booking_service_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          home_color?: string | null
          home_sort_order?: number
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          media_urls?: Json
          name: string
          price?: number
          rating?: number
          reviews?: number
          show_on_home?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          booking_service_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          home_color?: string | null
          home_sort_order?: number
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          media_urls?: Json
          name?: string
          price?: number
          rating?: number
          reviews?: number
          show_on_home?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      status_change_requests: {
        Row: {
          booking_id: string
          created_at: string
          field: string
          from_value: string | null
          id: string
          reason: string
          requested_by: string
          requester_role: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_table: string
          to_value: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          field: string
          from_value?: string | null
          id?: string
          reason: string
          requested_by: string
          requester_role?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_table: string
          to_value: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          field?: string
          from_value?: string | null
          id?: string
          reason?: string
          requested_by?: string
          requester_role?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_table?: string
          to_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      tire_orders: {
        Row: {
          branch: string
          car_plate_number: string | null
          car_type: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          fulfillment_type: string
          id: string
          install_date: string | null
          install_time: string | null
          installation_fee: number
          items: Json
          midtrans_order_id: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          quantity_total: number
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          branch: string
          car_plate_number?: string | null
          car_type?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          fulfillment_type: string
          id?: string
          install_date?: string | null
          install_time?: string | null
          installation_fee?: number
          items?: Json
          midtrans_order_id?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          quantity_total?: number
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          branch?: string
          car_plate_number?: string | null
          car_type?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          fulfillment_type?: string
          id?: string
          install_date?: string | null
          install_time?: string | null
          installation_fee?: number
          items?: Json
          midtrans_order_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          quantity_total?: number
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tires: {
        Row: {
          brand: string
          category: string
          click_count: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          logo_url: string | null
          oem_compatibility: string[] | null
          size: string
          type: string
          updated_at: string
        }
        Insert: {
          brand: string
          category?: string
          click_count?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          oem_compatibility?: string[] | null
          size: string
          type: string
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          click_count?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          oem_compatibility?: string[] | null
          size?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_filter_presets: {
        Row: {
          created_at: string
          id: string
          module: string
          name: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          name: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          name?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          current_route: string
          last_seen: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_route?: string
          last_seen?: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_route?: string
          last_seen?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_complaints: {
        Row: {
          ai_response: string | null
          complaint: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          recommended_service_ids: Json
          staff_notes: string | null
          status: string
          updated_at: string
          user_id: string | null
          vehicle_brand: string
          vehicle_mileage: number | null
          vehicle_model: string
          vehicle_plate: string | null
          vehicle_transmission: string | null
          vehicle_year: number
        }
        Insert: {
          ai_response?: string | null
          complaint: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          recommended_service_ids?: Json
          staff_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand: string
          vehicle_mileage?: number | null
          vehicle_model: string
          vehicle_plate?: string | null
          vehicle_transmission?: string | null
          vehicle_year: number
        }
        Update: {
          ai_response?: string | null
          complaint?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          recommended_service_ids?: Json
          staff_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string
          vehicle_mileage?: number | null
          vehicle_model?: string
          vehicle_plate?: string | null
          vehicle_transmission?: string | null
          vehicle_year?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          created_at: string
          fuel_type: string | null
          id: string
          image_url: string | null
          is_default: boolean
          last_service_date: string | null
          license_plate: string
          model: string
          oem_tire: string | null
          tire_size: string | null
          transmission: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          brand: string
          created_at?: string
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          last_service_date?: string | null
          license_plate: string
          model: string
          oem_tire?: string | null
          tire_size?: string | null
          transmission?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          brand?: string
          created_at?: string
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          last_service_date?: string | null
          license_plate?: string
          model?: string
          oem_tire?: string | null
          tire_size?: string | null
          transmission?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      wa_password_resets: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip_hash: string | null
          otp_hash: string
          otp_salt: string
          phone_e164: string
          requested_at: string
          reset_token_hash: string | null
          status: string
          triggered_by_admin: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          otp_hash: string
          otp_salt: string
          phone_e164: string
          requested_at?: string
          reset_token_hash?: string | null
          status?: string
          triggered_by_admin?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          otp_hash?: string
          otp_salt?: string
          phone_e164?: string
          requested_at?: string
          reset_token_hash?: string | null
          status?: string
          triggered_by_admin?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          booking_id: string | null
          created_at: string
          error_message: string | null
          fraud_status: string | null
          gross_amount: number | null
          id: string
          order_id: string | null
          payment_id: string | null
          payment_type: string | null
          raw_payload: Json | null
          source: string
          transaction_id: string | null
          transaction_status: string | null
          validation_result: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          fraud_status?: string | null
          gross_amount?: number | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          payment_type?: string | null
          raw_payload?: Json | null
          source?: string
          transaction_id?: string | null
          transaction_status?: string | null
          validation_result: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          fraud_status?: string | null
          gross_amount?: number | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          payment_type?: string | null
          raw_payload?: Json | null
          source?: string
          transaction_id?: string | null
          transaction_status?: string | null
          validation_result?: string
        }
        Relationships: []
      }
    }
    Views: {
      cashback_balances: {
        Row: {
          balance: number | null
          expiring_soon: number | null
          user_id: string | null
        }
        Relationships: []
      }
      public_reviews: {
        Row: {
          branch: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          initials: string | null
          rating: number | null
          review: string | null
          service_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _map_role_to_source: { Args: { _role: string }; Returns: string }
      add_fraud_score: {
        Args: {
          _delta: number
          _details?: Json
          _related_user_id?: string
          _rule: string
          _user_id: string
        }
        Returns: undefined
      }
      adjust_loyalty_points: {
        Args: {
          _created_by?: string
          _description?: string
          _points: number
          _transaction_type: string
          _user_id: string
        }
        Returns: number
      }
      admin_adjust_cashback: {
        Args: {
          _amount: number
          _description?: string
          _expires_at?: string
          _type?: string
          _user_id: string
        }
        Returns: number
      }
      admin_unflag_user: {
        Args: { _release_commissions?: boolean; _user_id: string }
        Returns: Json
      }
      apply_cashback_to_booking: {
        Args: { _amount: number; _booking_id: string }
        Returns: Json
      }
      apply_status_change_request: {
        Args: { _id: string; _note?: string }
        Returns: Json
      }
      approve_booking_cancellation: {
        Args: { _booking_id: string }
        Returns: Json
      }
      approve_manual_payment_proof: {
        Args: { _proof_id: string }
        Returns: Json
      }
      approve_referral_withdrawal: {
        Args: { _id: string; _note?: string }
        Returns: Json
      }
      assert_signup_ip_unique: {
        Args: { _exclude_user?: string; _ip: string }
        Returns: undefined
      }
      attach_referrer:
        | { Args: { _code: string }; Returns: Json }
        | { Args: { _code: string; _ip?: string }; Returns: Json }
      booking_status_ordinal: { Args: { _status: string }; Returns: number }
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      claim_promo: { Args: { _promo_id: string }; Returns: Json }
      confirm_booking: { Args: { _booking_id: string }; Returns: Json }
      confirm_manual_payment: { Args: { _payment_id: string }; Returns: Json }
      convert_referral_to_voucher: { Args: { _amount: number }; Returns: Json }
      create_notification: {
        Args: {
          _action_url?: string
          _category?: string
          _message: string
          _metadata?: Json
          _priority?: string
          _source?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      generate_referral_code_for: {
        Args: { _user_id: string }
        Returns: string
      }
      get_cashback_balance: { Args: { _user_id: string }; Returns: number }
      get_push_token_stats: { Args: never; Returns: Json }
      get_pwa_push_audit: { Args: never; Returns: Json }
      get_review_booking_info: {
        Args: { _token: string }
        Returns: {
          already_submitted: boolean
          booking_id: string
          branch: string
          customer_name: string
          service_name: string
        }[]
      }
      get_slot_availability: {
        Args: { _branch: string; _date: string; _time: string }
        Returns: Json
      }
      get_user_branch: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_cabang_for: { Args: { _branch: string }; Returns: boolean }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
      log_admin_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _metadata?: Json
          _target_id?: string
          _target_label?: string
          _target_type?: string
        }
        Returns: string
      }
      mark_referral_withdrawal_paid: {
        Args: { _id: string; _proof_url?: string }
        Returns: Json
      }
      redeem_referral_voucher: {
        Args: { _booking_id: string; _code: string }
        Returns: Json
      }
      redeem_reward: { Args: { _reward_id: string }; Returns: Json }
      refund_cashback_for_booking: {
        Args: { _booking_id: string }
        Returns: Json
      }
      reject_booking_cancellation: {
        Args: { _booking_id: string; _reason?: string }
        Returns: Json
      }
      reject_manual_payment: {
        Args: { _payment_id: string; _reason?: string }
        Returns: Json
      }
      reject_manual_payment_proof: {
        Args: { _proof_id: string; _reason: string }
        Returns: Json
      }
      reject_referral_withdrawal: {
        Args: { _id: string; _reason: string }
        Returns: Json
      }
      reject_status_change_request: {
        Args: { _id: string; _note?: string }
        Returns: Json
      }
      release_pending_referral_commissions: { Args: never; Returns: Json }
      request_booking_cancellation: {
        Args: { _booking_id: string; _reason: string }
        Returns: Json
      }
      request_referral_withdrawal: {
        Args: {
          _account_holder: string
          _account_number: string
          _amount: number
          _bank_name: string
        }
        Returns: Json
      }
      staff_submit_manual_payment_proof: {
        Args: {
          _booking_id: string
          _mark_paid?: boolean
          _method: string
          _notes: string
          _proof_url: string
          _sender_bank: string
          _sender_name: string
          _transfer_amount: number
          _transfer_date: string
        }
        Returns: Json
      }
      submit_customer_review: {
        Args: { _rating: number; _review_text: string; _token: string }
        Returns: Json
      }
      submit_manual_payment_proof: {
        Args: {
          _bank_account_id: string
          _booking_id: string
          _method: string
          _notes: string
          _proof_url: string
          _qris_id: string
          _sender_bank: string
          _sender_name: string
          _transfer_amount: number
          _transfer_date: string
        }
        Returns: Json
      }
      validate_referral_voucher: { Args: { _code: string }; Returns: Json }
      verify_user: { Args: { _user_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer" | "admin_cabang"
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
      app_role: ["admin", "staff", "customer", "admin_cabang"],
    },
  },
} as const
