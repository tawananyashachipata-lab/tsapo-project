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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_settings: {
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
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      agents: {
        Row: {
          address: string
          business_name: string
          contact_name: string
          created_at: string
          email: string | null
          id: string
          location_id: string
          phone: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          business_name: string
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          location_id: string
          phone: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          business_name?: string
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          location_id?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_access_state: {
        Row: {
          key: string
          reason: string
          status: number
          updated_at: string
        }
        Insert: {
          key: string
          reason: string
          status: number
          updated_at?: string
        }
        Update: {
          key?: string
          reason?: string
          status?: number
          updated_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          created_at: string
          id: string
          message: Json
          sdk_id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: Json
          sdk_id: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: Json
          sdk_id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          province: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          province: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          province?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          parcel_id: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          parcel_id?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          parcel_id?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "delivery_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          price_multiplier: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_multiplier?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_multiplier?: number
        }
        Relationships: []
      }
      parcels: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          destination_agent_id: string | null
          destination_location_id: string
          dimensions: string | null
          expected_delivery: string | null
          id: string
          image_path: string | null
          origin_agent_id: string | null
          payment_method: string | null
          pickup_location_id: string
          price_usd: number
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string
          sender_email: string | null
          sender_id: string
          sender_name: string
          sender_phone: string
          special_instructions: string | null
          status: Database["public"]["Enums"]["parcel_status"]
          tracking_number: string
          updated_at: string
          weight_kg: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          destination_agent_id?: string | null
          destination_location_id: string
          dimensions?: string | null
          expected_delivery?: string | null
          id?: string
          image_path?: string | null
          origin_agent_id?: string | null
          payment_method?: string | null
          pickup_location_id: string
          price_usd: number
          recipient_email?: string | null
          recipient_name: string
          recipient_phone: string
          sender_email?: string | null
          sender_id: string
          sender_name: string
          sender_phone: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["parcel_status"]
          tracking_number: string
          updated_at?: string
          weight_kg: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          destination_agent_id?: string | null
          destination_location_id?: string
          dimensions?: string | null
          expected_delivery?: string | null
          id?: string
          image_path?: string | null
          origin_agent_id?: string | null
          payment_method?: string | null
          pickup_location_id?: string
          price_usd?: number
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string
          sender_email?: string | null
          sender_id?: string
          sender_name?: string
          sender_phone?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["parcel_status"]
          tracking_number?: string
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "parcel_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_destination_agent_id_fkey"
            columns: ["destination_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_origin_agent_id_fkey"
            columns: ["origin_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          method: string
          parcel_id: string
          payer_id: string
          reference: string | null
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          method: string
          parcel_id: string
          payer_id: string
          reference?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          method?: string
          parcel_id?: string
          payer_id?: string
          reference?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "delivery_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          parcel_id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          parcel_id: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          parcel_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_codes_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: true
            referencedRelation: "delivery_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_codes_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: true
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_business: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_business?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_business?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          parcel_tracking: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          parcel_tracking?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          parcel_tracking?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string
          id: string
          location: string | null
          parcel_id: string
          status: Database["public"]["Enums"]["parcel_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          location?: string | null
          parcel_id: string
          status: Database["public"]["Enums"]["parcel_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string | null
          parcel_id?: string
          status?: Database["public"]["Enums"]["parcel_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "delivery_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
      delivery_history: {
        Row: {
          created_at: string | null
          destination: string | null
          id: string | null
          pickup: string | null
          price_usd: number | null
          sender_id: string | null
          status: Database["public"]["Enums"]["parcel_status"] | null
          tracking_number: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_booking: { Args: { _parcel: string }; Returns: undefined }
      confirm_payment: {
        Args: { _payment: string; _reference: string }
        Returns: undefined
      }
      create_booking: {
        Args: {
          _category: string
          _description: string
          _dest_agent: string
          _destination: string
          _dimensions: string
          _image_path: string
          _instructions: string
          _origin_agent: string
          _payment_method: string
          _pickup: string
          _recipient_email: string
          _recipient_name: string
          _recipient_phone: string
          _sender_email: string
          _sender_name: string
          _sender_phone: string
          _weight: number
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_recipient_of: {
        Args: { _parcel: Database["public"]["Tables"]["parcels"]["Row"] }
        Returns: boolean
      }
      my_agent_id: { Args: never; Returns: string }
      notify_parcel: {
        Args: {
          _body: string
          _parcel: Database["public"]["Tables"]["parcels"]["Row"]
          _title: string
        }
        Returns: undefined
      }
      quote_price: {
        Args: { _category: string; _from: string; _to: string; _weight: number }
        Returns: number
      }
      set_admin_role: {
        Args: { _grant: boolean; _user: string }
        Returns: undefined
      }
      track_parcel: { Args: { _tracking: string }; Returns: Json }
      update_parcel_status: {
        Args: {
          _note: string
          _parcel: string
          _status: Database["public"]["Enums"]["parcel_status"]
        }
        Returns: undefined
      }
      verify_pickup: {
        Args: { _code: string; _tracking: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "sender"
        | "recipient"
        | "agent"
        | "business"
        | "admin"
        | "main_admin"
      parcel_status:
        | "booking_received"
        | "awaiting_agent"
        | "received_by_agent"
        | "in_transit"
        | "arrived_destination"
        | "ready_for_collection"
        | "collected"
        | "cancelled"
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {
      app_role: [
        "sender",
        "recipient",
        "agent",
        "business",
        "admin",
        "main_admin",
      ],
      parcel_status: [
        "booking_received",
        "awaiting_agent",
        "received_by_agent",
        "in_transit",
        "arrived_destination",
        "ready_for_collection",
        "collected",
        "cancelled",
      ],
    },
  },
} as const
