import { createClient } from "@supabase/supabase-js";
import type { SunoCallbackData } from "../integrations/suno/client";
import { enviarMusicaPorWhatsapp } from "@/lib/whatsapp.service";

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
      .select("id, status, stripe_payment_status, nome_cliente, telefone_cliente, email_cliente, segunda_versao")
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
      const paymentAlreadyConfirmed =
        ["paid", "succeeded", "complete"].includes(String(pedido.stripe_payment_status ?? "").toLowerCase()) ||
        ["pago", "musica_pronta", "entregue"].includes(String(pedido.status));
      const shouldReleaseSecondVersion = Boolean(pedido.segunda_versao && secondaryTrack?.audio_url);

      const nextStatus = paymentAlreadyConfirmed ? "musica_pronta" : "previa";

      const { error: updateError } = await supabase
        .from("pedidos")
        .update({
          url_previa: primaryTrack?.audio_url ?? null,
          url_previa_segunda_versao: secondaryTrack?.audio_url ?? null,
          url_musica: paymentAlreadyConfirmed ? primaryTrack?.audio_url ?? null : null,
          url_musica_segunda_versao: paymentAlreadyConfirmed && shouldReleaseSecondVersion ? secondaryTrack?.audio_url ?? null : null,
          segunda_versao: paymentAlreadyConfirmed ? shouldReleaseSecondVersion : Boolean(pedido.segunda_versao),
          status: nextStatus,
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
        status_novo: nextStatus,
        mensagem_whatsapp: paymentAlreadyConfirmed
          ? shouldReleaseSecondVersion
            ? "Pagamento confirmado e músicas completas liberadas (duas versões)."
            : "Pagamento confirmado e música completa liberada."
          : "Prévia da música gerada e pronta para audição.",
        criado_em: new Date().toISOString(),
      });

      const deliveryUrl = shouldReleaseSecondVersion && secondaryTrack?.audio_url ? secondaryTrack.audio_url : primaryTrack?.audio_url ?? null;
      const deliveryMessage = shouldReleaseSecondVersion
        ? `Olá ${pedido.nome_cliente ?? "cliente"}! Sua música já está pronta com duas versões disponíveis para download. ${deliveryUrl}`
        : `Olá ${pedido.nome_cliente ?? "cliente"}! Sua música já está pronta e disponível para download: ${deliveryUrl}`;

      if (paymentAlreadyConfirmed && pedido.telefone_cliente) {
        const result = await enviarMusicaPorWhatsapp({
          nomeCliente: pedido.nome_cliente ?? "cliente",
          whatsapp: pedido.telefone_cliente,
          musicaUrl: deliveryUrl,
          mensagem: deliveryMessage,
        });

        console.log("Entrega via WhatsApp do arquivo final:", {
          pedidoId: pedido.id,
          provider: result.provider,
          ok: result.ok,
          reason: result.reason,
          fallbackUrl: result.fallbackUrl,
        });
      }

      console.log("Música final disponível:", {
        pedidoId: pedido.id,
        taskId: task_id,
        paymentAlreadyConfirmed,
        shouldReleaseSecondVersion,
        statusAtualizado: nextStatus,
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
