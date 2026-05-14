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
      app_branding: {
        Row: {
          brand_name: string
          favicon_url: string | null
          id: number
          logo_dark_url: string | null
          logo_light_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_name?: string
          favicon_url?: string | null
          id?: number
          logo_dark_url?: string | null
          logo_light_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_name?: string
          favicon_url?: string | null
          id?: number
          logo_dark_url?: string | null
          logo_light_url?: string | null
          updated_at?: string
          updated_by?: string | null
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
          booking_time: string
          branch: string | null
          cancel_reason: string | null
          cancel_requested: boolean
          cancel_requested_at: string | null
          car_plate_number: string | null
          car_type: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          id: string
          next_service_date: string | null
          payment_status: string
          reminder_sent: boolean | null
          service_duration: number
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
          booking_time: string
          branch?: string | null
          cancel_reason?: string | null
          cancel_requested?: boolean
          cancel_requested_at?: string | null
          car_plate_number?: string | null
          car_type?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          id?: string
          next_service_date?: string | null
          payment_status?: string
          reminder_sent?: boolean | null
          service_duration: number
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
          booking_time?: string
          branch?: string | null
          cancel_reason?: string | null
          cancel_requested?: boolean
          cancel_requested_at?: string | null
          car_plate_number?: string | null
          car_type?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          id?: string
          next_service_date?: string | null
          payment_status?: string
          reminder_sent?: boolean | null
          service_duration?: number
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
          name?: string
          phone?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          whatsapp?: string
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
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
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
          assigned_branch: string | null
          avatar_url: string | null
          created_at: string
          customer_id: string | null
          full_name: string | null
          id: string
          is_verified: boolean
          phone: string | null
          referral_code: string | null
          referral_terms_accepted_at: string | null
          referral_terms_version: number | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          assigned_branch?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          full_name?: string | null
          id: string
          is_verified?: boolean
          phone?: string | null
          referral_code?: string | null
          referral_terms_accepted_at?: string | null
          referral_terms_version?: number | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          assigned_branch?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean
          phone?: string | null
          referral_code?: string | null
          referral_terms_accepted_at?: string | null
          referral_terms_version?: number | null
          referred_by?: string | null
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
          min_purchase: number
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
          min_purchase?: number
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
          min_purchase?: number
          sort_order?: number
          starts_at?: string
          terms?: string | null
          title?: string
          updated_at?: string
          voucher_prefix?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
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
      referral_settings: {
        Row: {
          booking_commission_pct: number
          id: number
          is_active: boolean
          min_withdraw: number
          point_value_rp: number
          signup_bonus: number
          terms_text: string | null
          terms_version: number
          updated_at: string
          updated_by: string | null
          voucher_conversion_rate: number
          voucher_validity_days: number
        }
        Insert: {
          booking_commission_pct?: number
          id?: number
          is_active?: boolean
          min_withdraw?: number
          point_value_rp?: number
          signup_bonus?: number
          terms_text?: string | null
          terms_version?: number
          updated_at?: string
          updated_by?: string | null
          voucher_conversion_rate?: number
          voucher_validity_days?: number
        }
        Update: {
          booking_commission_pct?: number
          id?: number
          is_active?: boolean
          min_withdraw?: number
          point_value_rp?: number
          signup_bonus?: number
          terms_text?: string | null
          terms_version?: number
          updated_at?: string
          updated_by?: string | null
          voucher_conversion_rate?: number
          voucher_validity_days?: number
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
      attach_referrer: { Args: { _code: string }; Returns: Json }
      claim_promo: { Args: { _promo_id: string }; Returns: Json }
      confirm_booking: { Args: { _booking_id: string }; Returns: Json }
      confirm_manual_payment: { Args: { _payment_id: string }; Returns: Json }
      convert_referral_to_voucher: { Args: { _amount: number }; Returns: Json }
      generate_referral_code_for: {
        Args: { _user_id: string }
        Returns: string
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
      mark_referral_withdrawal_paid: {
        Args: { _id: string; _proof_url?: string }
        Returns: Json
      }
      redeem_referral_voucher: {
        Args: { _booking_id: string; _code: string }
        Returns: Json
      }
      redeem_reward: { Args: { _reward_id: string }; Returns: Json }
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
