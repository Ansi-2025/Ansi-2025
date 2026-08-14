import { createClient } from "@supabase/supabase-js";
import type { SunoCallbackData } from "../integrations/suno/client";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

/**
 * Processa o callback do Suno quando a música é gerada
 */
export async function handleSunoWebhook(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as {
      code: number;
      msg: string;
      data: SunoCallbackData;
    };

    if (payload.code !== 200) {
      console.error("Suno webhook error:", payload.msg);
      return new Response(JSON.stringify({ error: payload.msg }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const { data } = payload;
    const { task_id, callbackType, data: tracks } = data;

    if (!tracks || tracks.length === 0) {
      console.warn("Suno webhook sem tracks:", { task_id, callbackType });
      return new Response(
        JSON.stringify({ error: "No tracks in callback" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Buscar o pedido associado a este task_id
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select("id, status")
      .eq("suno_task_id", task_id)
      .single();

    if (pedidoError || !pedido) {
      console.error("Pedido não encontrado para task_id:", {
        task_id,
        error: pedidoError,
      });
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Processar baseado no tipo de callback
    if (callbackType === "complete") {
      const primaryTrack = tracks[0];
      const secondaryTrack = tracks[1] ?? null;
      const hasSecondVersion = Boolean(secondaryTrack?.audio_url);

      const { error: updateError } = await supabase
        .from("pedidos")
        .update({
          url_musica: primaryTrack?.audio_url ?? null,
          url_musica_segunda_versao: hasSecondVersion ? secondaryTrack?.audio_url ?? null : null,
          segunda_versao: hasSecondVersion,
          status: "musica_pronta",
          status_atualizado_em: new Date().toISOString(),
        })
        .eq("id", pedido.id);

      if (updateError) {
        console.error("Erro ao atualizar pedido com a música final:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar pedido" }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          }
        );
      }

      await supabase.from("status_history").insert({
        pedido_id: pedido.id,
        status_anterior: pedido.status,
        status_novo: "musica_pronta",
        mensagem_whatsapp: hasSecondVersion
          ? "Músicas prontas e disponíveis para download. O pedido inclui duas versões."
          : "Música pronta e disponível para download.",
        criado_em: new Date().toISOString(),
      });

      console.log("Música final disponível:", {
        pedidoId: pedido.id,
        taskId: task_id,
        hasSecondVersion,
        primaryDuration: primaryTrack?.duration,
        secondaryDuration: secondaryTrack?.duration,
      });
    } else if (callbackType === "text") {
      // Apenas texto/letra foi gerada
      console.log("Texto/letra gerada para task_id:", task_id);
    } else if (callbackType === "first") {
      // Primeira música foi gerada
      console.log("Primeira música gerada para task_id:", task_id);
    }

    return new Response(JSON.stringify({ success: true, taskId: task_id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao processar webhook do Suno:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
