import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

/**
 * Cliente para polling da API SunoAPI.org
 * Usado como fallback quando o webhook não chega
 */
export async function verificarStatusMusicaSuno(taskId: string) {
  const apiKey = process.env.SUNO_API_KEY;

  if (!apiKey) {
    throw new Error("SUNO_API_KEY não configurada");
  }

  try {
    const response = await fetch(
      `https://api.sunoapi.org/api/v1/query?ids=${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Erro ao verificar status Suno [${response.status}]:`, errorBody);
      throw new Error(`Falha ao verificar status: ${response.status}`);
    }

    const result = await response.json() as {
      code: number;
      data: Array<{
        id: string;
        status: string;
        audio_url?: string;
        stream_audio_url?: string;
        image_url?: string;
        duration?: number;
      }>;
      msg: string;
    };

    if (result.code !== 200) {
      throw new Error(`API retornou erro: ${result.msg}`);
    }

    return result.data[0] || null;
  } catch (error) {
    console.error("Erro ao verificar status da música no Suno:", error);
    throw error;
  }
}

/**
 * Polling periódico - busca todos os pedidos em "gerando_musica" e verifica status
 * Deve ser executado via cron job ou CI/CD
 */
export async function pollingMusicasEmGeracao() {
  const MAX_TENTATIVAS = 12; // 12 * 5 minutos = 60 minutos max
  const TEMPO_DECORRIDO_MINUTOS = 5; // Verificar a cada 5 minutos

  console.log("Iniciando polling de músicas em geração...");

  // Buscar pedidos em "gerando_musica" que foram criados há menos de 1 hora
  const agora = new Date();
  const umHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);

  const { data: pedidosEmGeracao, error } = await supabase
    .from("pedidos")
    .select("id, suno_task_id, status")
    .eq("status", "gerando_musica")
    .gte("musica_gerada_em", umHoraAtras.toISOString())
    .not("suno_task_id", "is", null);

  if (error) {
    console.error("Erro ao buscar pedidos em geração:", error);
    return [];
  }

  if (!pedidosEmGeracao || pedidosEmGeracao.length === 0) {
    console.log("Nenhum pedido em geração encontrado");
    return [];
  }

  console.log(`Encontrados ${pedidosEmGeracao.length} pedidos em geração`);

  const resultados = [];

  for (const pedido of pedidosEmGeracao) {
    if (!pedido.suno_task_id) {
      console.warn(`Pedido ${pedido.id} sem task_id`);
      continue;
    }

    try {
      const statusMusica = await verificarStatusMusicaSuno(pedido.suno_task_id);

      if (!statusMusica) {
        console.warn(`Status não encontrado para task_id ${pedido.suno_task_id}`);
        continue;
      }

      // Se a música estiver pronta
      if (statusMusica.audio_url) {
        console.log(`Música pronta para pedido ${pedido.id}:`, {
          duration: statusMusica.duration,
          audioUrl: statusMusica.audio_url,
        });

        const { error: updateError } = await supabase
          .from("pedidos")
          .update({
            url_musica: statusMusica.audio_url,
            url_musica_segunda_versao: null,
            segunda_versao: false,
            status: "musica_pronta",
            status_atualizado_em: new Date().toISOString(),
          })
          .eq("id", pedido.id);

        if (updateError) {
          console.error(`Erro ao atualizar pedido ${pedido.id}:`, updateError);
        } else {
          resultados.push({
            pedidoId: pedido.id,
            status: "atualizado",
            musicaDuration: statusMusica.duration,
          });
        }
      } else {
        console.log(
          `Música ainda em geração para pedido ${pedido.id} (status: ${statusMusica.status})`
        );
      }
    } catch (error) {
      console.error(
        `Erro ao processar pedido ${pedido.id}:`,
        error instanceof Error ? error.message : error
      );
    }

    // Pequeno delay entre requisições para não sobrecarregar
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Polling concluído. ${resultados.length} pedido(s) atualizado(s)`);
  return resultados;
}
