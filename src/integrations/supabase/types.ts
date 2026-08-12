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
      pedidos: {
        Row: {
          created_at: string
          descricao: string
          duracao_segundos: number | null
          email_cliente: string | null
          cpf_cliente: string | null
          genero_musical: string | null
          id: string
          nome_cliente: string | null
          para_quem: string
          ocasiao: string | null
          letra_refazer_contador: number
          pix_qr_code: string | null
          pix_fixado: boolean
          pago_em: string | null
          roteiro_ia: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          status_atualizado_em: string
          suno_job_id: string | null
          url_musica: string | null
          url_previa: string | null
          valor_pix: string | null
          whatsapp: string
          telefone_cliente: string | null
          letra_gerada: string | null
          letra_aprovada: boolean
          preview_gerada_em: string | null
          musica_gerada_em: string | null
          stripe_checkout_url: string | null
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          duracao_segundos?: number | null
          email_cliente?: string | null
          genero_musical?: string | null
          id?: string
          nome_cliente?: string | null
          para_quem: string
          ocasiao?: string | null
          letra_refazer_contador?: number
          pix_qr_code?: string | null
          pix_fixado?: boolean
          pago_em?: string | null
          roteiro_ia?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          status_atualizado_em?: string
          suno_job_id?: string | null
          url_musica?: string | null
          url_previa?: string | null
          valor_pix?: string | null
          whatsapp: string
          telefone_cliente?: string | null
          letra_gerada?: string | null
          letra_aprovada?: boolean
          preview_gerada_em?: string | null
          musica_gerada_em?: string | null
          stripe_checkout_url?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          duracao_segundos?: number | null
          email_cliente?: string | null
          genero_musical?: string | null
          id?: string
          nome_cliente?: string | null
          para_quem?: string
          ocasiao?: string | null
          letra_refazer_contador?: number
          pix_qr_code?: string | null
          pix_fixado?: boolean
          pago_em?: string | null
          roteiro_ia?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          status_atualizado_em?: string
          suno_job_id?: string | null
          url_musica?: string | null
          url_previa?: string | null
          valor_pix?: string | null
          whatsapp?: string
          telefone_cliente?: string | null
          letra_gerada?: string | null
          letra_aprovada?: boolean
          preview_gerada_em?: string | null
          musica_gerada_em?: string | null
          stripe_checkout_url?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
        }
        Relationships: []
      }
      status_history: {
        Row: {
          admin_user: string | null
          criado_em: string
          id: string
          mensagem_whatsapp: string | null
          pedido_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          admin_user?: string | null
          criado_em?: string
          id?: string
          mensagem_whatsapp?: string | null
          pedido_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          admin_user?: string | null
          criado_em?: string
          id?: string
          mensagem_whatsapp?: string | null
          pedido_id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_pedido_id_fkey"
            columns: ["pedido_id"]
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          }
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
      pedido_status:
        | "recebido"
        | "gerando_letra"
        | "letra_pronta"
        | "aguardando_aprovacao_letra"
        | "letra_aprovada"
        | "pagamento"
        | "gerando_musica"
        | "previa"
        | "musica_pronta"
        | "pago"
        | "entregue"
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
      pedido_status: [
        "recebido",
        "gerando_letra",
        "letra_pronta",
        "aguardando_aprovacao_letra",
        "letra_aprovada",
        "pagamento",
        "gerando_musica",
        "previa",
        "musica_pronta",
        "pago",
        "entregue",
      ],
    },
  },
} as const
