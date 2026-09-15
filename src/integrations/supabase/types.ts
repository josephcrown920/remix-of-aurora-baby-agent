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
      acceptance_criteria: {
        Row: {
          active: boolean
          category: string
          created_at: string
          criterion: string
          id: number
          project_id: number
          severity: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          criterion: string
          id?: number
          project_id: number
          severity?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          criterion?: string
          id?: number
          project_id?: number
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acceptance_criteria_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      context_sections: {
        Row: {
          content: Json
          created_at: string
          id: number
          is_locked: boolean
          priority: number
          project_id: number
          section_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: number
          is_locked?: boolean
          priority?: number
          project_id: number
          section_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: number
          is_locked?: boolean
          priority?: number
          project_id?: number
          section_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      continuity_events: {
        Row: {
          category: string
          code: string
          created_at: string
          event_type: string
          evidence: Json
          generation_id: number | null
          id: number
          message: string
          project_id: number
          severity: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          event_type: string
          evidence?: Json
          generation_id?: number | null
          id?: number
          message: string
          project_id: number
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          event_type?: string
          evidence?: Json
          generation_id?: number | null
          id?: number
          message?: string
          project_id?: number
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "continuity_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_reviews: {
        Row: {
          accepted: boolean
          created_at: string
          criteria_results: Json
          generation_id: number
          id: number
          score: number | null
          summary: string
          updated_at: string
        }
        Insert: {
          accepted: boolean
          created_at?: string
          criteria_results?: Json
          generation_id: number
          id?: number
          score?: number | null
          summary: string
          updated_at?: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          criteria_results?: Json
          generation_id?: number
          id?: number
          score?: number | null
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_reviews_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          approval_state: string
          context_snapshot: Json
          created_at: string
          failure_reason: string | null
          id: number
          lock_references: number[]
          model: string
          notebook_references: number[]
          project_id: number
          prompt: string
          provider: string
          result: Json
          state: string
          task: string
          task_type: string
          updated_at: string
        }
        Insert: {
          approval_state?: string
          context_snapshot?: Json
          created_at?: string
          failure_reason?: string | null
          id?: number
          lock_references?: number[]
          model?: string
          notebook_references?: number[]
          project_id: number
          prompt: string
          provider?: string
          result?: Json
          state?: string
          task: string
          task_type: string
          updated_at?: string
        }
        Update: {
          approval_state?: string
          context_snapshot?: Json
          created_at?: string
          failure_reason?: string | null
          id?: number
          lock_references?: number[]
          model?: string
          notebook_references?: number[]
          project_id?: number
          prompt?: string
          provider?: string
          result?: Json
          state?: string
          task?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_locks: {
        Row: {
          created_at: string
          id: number
          key: string
          label: string
          project_id: number
          rule: string
          scope: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          key: string
          label: string
          project_id: number
          rule: string
          scope?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
          label?: string
          project_id?: number
          rule?: string
          scope?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_locks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_entries: {
        Row: {
          approval_state: string
          confidence: number
          content: Json
          created_at: string
          description: string
          entry_type: string
          id: number
          project_id: number
          source: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          approval_state?: string
          confidence?: number
          content?: Json
          created_at?: string
          description: string
          entry_type: string
          id?: number
          project_id: number
          source?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          approval_state?: string
          confidence?: number
          content?: Json
          created_at?: string
          description?: string
          entry_type?: string
          id?: number
          project_id?: number
          source?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          context: Json
          created_at: string
          description: string
          id: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          description: string
          id?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          description?: string
          id?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reference_assets: {
        Row: {
          asset_type: string
          authority: string
          created_at: string
          id: number
          metadata: Json
          name: string
          notebook_entry_id: number | null
          project_id: number
          purpose: string
          source_generation_id: number | null
          updated_at: string
          uri: string | null
        }
        Insert: {
          asset_type?: string
          authority?: string
          created_at?: string
          id?: number
          metadata?: Json
          name: string
          notebook_entry_id?: number | null
          project_id: number
          purpose: string
          source_generation_id?: number | null
          updated_at?: string
          uri?: string | null
        }
        Update: {
          asset_type?: string
          authority?: string
          created_at?: string
          id?: number
          metadata?: Json
          name?: string
          notebook_entry_id?: number | null
          project_id?: number
          purpose?: string
          source_generation_id?: number | null
          updated_at?: string
          uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_assets_notebook_entry_id_fkey"
            columns: ["notebook_entry_id"]
            isOneToOne: false
            referencedRelation: "notebook_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_messages: {
        Row: {
          created_at: string
          id: string
          meta: string | null
          project_id: string
          role: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: string | null
          project_id: string
          role: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: string | null
          project_id?: string
          role?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          brief: string
          created_at: string
          id: string
          image_model: string
          owner_key: string
          project_type: string
          rules: string
          title: string
          updated_at: string
          video_model: string
          world: Json
        }
        Insert: {
          brief?: string
          created_at?: string
          id?: string
          image_model?: string
          owner_key: string
          project_type?: string
          rules?: string
          title?: string
          updated_at?: string
          video_model?: string
          world?: Json
        }
        Update: {
          brief?: string
          created_at?: string
          id?: string
          image_model?: string
          owner_key?: string
          project_type?: string
          rules?: string
          title?: string
          updated_at?: string
          video_model?: string
          world?: Json
        }
        Relationships: []
      }
      studio_shots: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          image_prompt: string
          image_url: string | null
          position: number
          project_id: string
          summary: string
          title: string
          tone: string
          updated_at: string
          video_prompt: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          image_prompt?: string
          image_url?: string | null
          position?: number
          project_id: string
          summary?: string
          title?: string
          tone?: string
          updated_at?: string
          video_prompt?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          image_prompt?: string
          image_url?: string | null
          position?: number
          project_id?: string
          summary?: string
          title?: string
          tone?: string
          updated_at?: string
          video_prompt?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
