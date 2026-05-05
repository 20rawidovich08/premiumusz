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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      balance_transactions: {
        Row: {
          admin_note: string | null
          amount_uzs: number
          bot_user_id: string | null
          created_at: string
          id: string
          order_id: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_uzs: number
          bot_user_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_uzs?: number
          bot_user_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_users: {
        Row: {
          balance: number
          banned: boolean
          created_at: string
          full_name: string | null
          id: string
          language: string
          phone: string | null
          referral_code: string
          referred_by: string | null
          telegram_id: number
          updated_at: string
          username: string | null
          wizard_state: Json
        }
        Insert: {
          balance?: number
          banned?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          telegram_id: number
          updated_at?: string
          username?: string | null
          wizard_state?: Json
        }
        Update: {
          balance?: number
          banned?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          telegram_id?: number
          updated_at?: string
          username?: string | null
          wizard_state?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bot_users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          failed_count: number
          id: string
          message: string
          sent_count: number
          status: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          id?: string
          message: string
          sent_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          id?: string
          message?: string
          sent_count?: number
          status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_note: string | null
          amount_stars: number | null
          amount_uzs: number | null
          bot_user_id: string | null
          contact_full_name: string | null
          contact_phone: string | null
          contact_telegram: string | null
          created_at: string
          duration_months: number
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          plan_id: string | null
          product_type: string
          receipt_url: string | null
          source: Database["public"]["Enums"]["order_source"]
          stars_amount: number | null
          stars_charge_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          telegram_target: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_stars?: number | null
          amount_uzs?: number | null
          bot_user_id?: string | null
          contact_full_name?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          created_at?: string
          duration_months: number
          id?: string
          order_number?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          plan_id?: string | null
          product_type?: string
          receipt_url?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          stars_amount?: number | null
          stars_charge_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          telegram_target?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_stars?: number | null
          amount_uzs?: number | null
          bot_user_id?: string | null
          contact_full_name?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          created_at?: string
          duration_months?: number
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          plan_id?: string | null
          product_type?: string
          receipt_url?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          stars_amount?: number | null
          stars_charge_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          telegram_target?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          duration_months: number
          id: string
          price_stars: number
          price_uzs: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_months: number
          id?: string
          price_stars: number
          price_uzs: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_months?: number
          id?: string
          price_stars?: number
          price_uzs?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          bot_user_id: string | null
          created_at: string
          discount_uzs: number
          id: string
          order_id: string | null
          promo_id: string
          user_id: string | null
        }
        Insert: {
          bot_user_id?: string | null
          created_at?: string
          discount_uzs: number
          id?: string
          order_id?: string | null
          promo_id: string
          user_id?: string | null
        }
        Update: {
          bot_user_id?: string | null
          created_at?: string
          discount_uzs?: number
          id?: string
          order_id?: string | null
          promo_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          applies_to: string
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_amount: number
          per_user_limit: number
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          applies_to?: string
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_amount?: number
          per_user_limit?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          applies_to?: string
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_amount?: number
          per_user_limit?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          created_at: string
          id: string
          referred_id: string | null
          referrer_id: string | null
          reward: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id?: string | null
          reward?: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id?: string | null
          reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_events_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stars_packages: {
        Row: {
          active: boolean
          created_at: string
          id: string
          sort_order: number
          stars: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          stars: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          stars?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_user_balance: {
        Args: {
          p_delta: number
          p_note?: string
          p_user_id: string
          p_user_kind: string
        }
        Returns: undefined
      }
      admin_analytics: { Args: never; Returns: Json }
      admin_decide_order: {
        Args: { p_approve: boolean; p_note?: string; p_order_id: string }
        Returns: undefined
      }
      admin_decide_topup: {
        Args: { p_approve: boolean; p_note?: string; p_tx_id: string }
        Returns: undefined
      }
      create_website_order: {
        Args: {
          p_full_name: string
          p_phone: string
          p_plan_id: string
          p_receipt_path: string
          p_telegram: string
        }
        Returns: {
          id: string
          order_number: string
        }[]
      }
      get_order_by_number: {
        Args: { p_number: string }
        Returns: {
          admin_note: string
          amount_uzs: number
          created_at: string
          duration_months: number
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      get_receipt_signed_url: { Args: { p_path: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_premium_with_balance: {
        Args: { p_plan_id: string; p_telegram: string }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      purchase_premium_with_promo: {
        Args: { p_plan_id: string; p_promo_code?: string; p_telegram: string }
        Returns: {
          discount_uzs: number
          final_amount: number
          order_id: string
          order_number: string
        }[]
      }
      purchase_stars_with_balance: {
        Args: { p_stars: number; p_telegram: string }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      purchase_stars_with_promo: {
        Args: { p_promo_code?: string; p_stars: number; p_telegram: string }
        Returns: {
          discount_uzs: number
          final_amount: number
          order_id: string
          order_number: string
        }[]
      }
      request_topup: {
        Args: { p_amount_uzs: number; p_receipt_path: string }
        Returns: string
      }
      validate_promo_code: {
        Args: { p_amount: number; p_code: string; p_type: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_source: "bot" | "website"
      order_status: "pending" | "approved" | "rejected" | "paid"
      payment_method: "card" | "stars" | "balance"
      tx_status: "pending" | "approved" | "rejected"
      tx_type:
        | "topup"
        | "premium_purchase"
        | "stars_purchase"
        | "refund"
        | "adjustment"
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
      app_role: ["admin", "user"],
      order_source: ["bot", "website"],
      order_status: ["pending", "approved", "rejected", "paid"],
      payment_method: ["card", "stars", "balance"],
      tx_status: ["pending", "approved", "rejected"],
      tx_type: [
        "topup",
        "premium_purchase",
        "stars_purchase",
        "refund",
        "adjustment",
      ],
    },
  },
} as const
