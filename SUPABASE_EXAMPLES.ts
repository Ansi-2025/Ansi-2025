// ============================================
// Exemplos de uso do Supabase na aplicação
// ============================================

// 📁 src/integrations/supabase/examples.ts

import { supabase } from './client';
import { supabaseServer } from './client.server';

/**
 * ✅ EXEMPLO 1: Criar um novo pedido (Frontend)
 */
export async function createOrderFrontend() {
  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      nome_cliente: 'João Silva',
      email_cliente: 'joao@example.com',
      telefone_cliente: '11999999999',
      descricao: 'Quero uma música sobre fé e esperança com duração mínima de trinta caracteres',
      genero_musical: 'Gospel',
      // status padrão: 'recebido'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar pedido:', error);
    return null;
  }

  console.log('✅ Pedido criado:', data);
  return data;
}

/**
 * ✅ EXEMPLO 2: Buscar pedidos de um cliente
 */
export async function getClientOrders(email: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('email_cliente', email)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    return [];
  }

  console.log('✅ Pedidos encontrados:', data.length);
  return data;
}

/**
 * ✅ EXEMPLO 3: Buscar um pedido específico com histórico
 */
export async function getOrderWithHistory(pedidoId: string) {
  // Buscar pedido
  const { data: order, error: orderError } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single();

  if (orderError) {
    console.error('❌ Erro ao buscar pedido:', orderError);
    return null;
  }

  // Buscar histórico de status
  const { data: history, error: historyError } = await supabase
    .from('status_history')
    .select('*')
    .eq('pedido_id', pedidoId)
    .order('criado_em', { ascending: false });

  if (historyError) {
    console.error('❌ Erro ao buscar histórico:', historyError);
    return order; // Retorna pedido mesmo se histórico falhar
  }

  return { ...order, status_history: history };
}

/**
 * ✅ EXEMPLO 4: Atualizar status de um pedido (Server-side - Recomendado)
 */
export async function updateOrderStatus(pedidoId: string, newStatus: string) {
  const { data, error } = await supabaseServer
    .from('pedidos')
    .update({ status: newStatus })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar status:', error);
    throw error;
  }

  console.log('✅ Status atualizado para:', newStatus);
  return data;
}

/**
 * ✅ EXEMPLO 5: Upload de música (Storage)
 */
export async function uploadMusic(
  pedidoId: string,
  file: File,
  type: 'previa' | 'musica'
) {
  const fileName = `${pedidoId}/${type}_${Date.now()}.mp3`;

  // Upload para storage
  const { error: uploadError } = await supabase.storage
    .from('musicas')
    .upload(fileName, file);

  if (uploadError) {
    console.error('❌ Erro ao fazer upload:', uploadError);
    throw uploadError;
  }

  // Obter URL pública
  const { data } = supabase.storage
    .from('musicas')
    .getPublicUrl(fileName);

  const publicUrl = data.publicUrl;

  // Atualizar URL no pedido
  const urlColumn = type === 'previa' ? 'url_previa' : 'url_musica';
  const { error: updateError } = await supabaseServer
    .from('pedidos')
    .update({ [urlColumn]: publicUrl })
    .eq('id', pedidoId);

  if (updateError) {
    console.error('❌ Erro ao atualizar URL:', updateError);
    throw updateError;
  }

  console.log('✅ Música enviada com sucesso:', publicUrl);
  return publicUrl;
}

/**
 * ✅ EXEMPLO 6: Registrar mudança de status no histórico (Server-side)
 */
export async function recordStatusChange(
  pedidoId: string,
  statusAnterior: string,
  statusNovo: string,
  adminUser: string,
  mensagemWhatsapp?: string
) {
  const { data, error } = await supabaseServer
    .from('status_history')
    .insert({
      pedido_id: pedidoId,
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      admin_user: adminUser,
      mensagem_whatsapp: mensagemWhatsapp,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao registrar mudança:', error);
    throw error;
  }

  console.log('✅ Mudança de status registrada');
  return data;
}

/**
 * ✅ EXEMPLO 7: Obter estatísticas (Agregação)
 */
export async function getOrderStatistics() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('status');

  if (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    return null;
  }

  // Contar por status
  const stats = data.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  console.log('✅ Estatísticas:', stats);
  return stats;
}

/**
 * ✅ EXEMPLO 8: Escutar mudanças em tempo real (Subscribe)
 */
export function subscribeToOrderUpdates(pedidoId: string) {
  const subscription = supabase
    .channel(`pedido:${pedidoId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'pedidos',
        filter: `id=eq.${pedidoId}`,
      },
      (payload) => {
        console.log('🔄 Pedido atualizado em tempo real:', payload);
        // Atualizar UI aqui
      }
    )
    .subscribe();

  // Retornar função para desinscrever
  return () => subscription.unsubscribe();
}

/**
 * ✅ EXEMPLO 9: Deletar um pedido (Admin apenas)
 */
export async function deleteOrder(pedidoId: string) {
  const { error } = await supabaseServer
    .from('pedidos')
    .delete()
    .eq('id', pedidoId);

  if (error) {
    console.error('❌ Erro ao deletar pedido:', error);
    throw error;
  }

  console.log('✅ Pedido deletado');
}

/**
 * ✅ EXEMPLO 10: Busca com filtros avançados
 */
export async function searchOrders(filters: {
  status?: string;
  email?: string;
  dataInicio?: string;
  dataFim?: string;
  nome?: string;
}) {
  let query = supabase.from('pedidos').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.email) {
    query = query.ilike('email_cliente', `%${filters.email}%`);
  }

  if (filters.nome) {
    query = query.ilike('nome_cliente', `%${filters.nome}%`);
  }

  if (filters.dataInicio) {
    query = query.gte('criado_em', filters.dataInicio);
  }

  if (filters.dataFim) {
    query = query.lte('criado_em', filters.dataFim);
  }

  const { data, error } = await query.order('criado_em', { ascending: false });

  if (error) {
    console.error('❌ Erro na busca:', error);
    return [];
  }

  console.log('✅ Resultados encontrados:', data.length);
  return data;
}

// ============================================
// INTEGRAÇÃO EM REACT COMPONENTS
// ============================================

/**
 * ✅ EXEMPLO 11: Hook customizado para pedidos
 */
import { useQuery, useMutation } from '@tanstack/react-query';

export function useOrders(email: string) {
  return useQuery({
    queryKey: ['orders', email],
    queryFn: () => getClientOrders(email),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: createOrderFrontend,
  });
}

/**
 * ✅ EXEMPLO 12: Usando em um componente React
 */
export function OrdersList() {
  const { data: orders, isLoading, error } = useOrders('joao@example.com');

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar pedidos</div>;

  return (
    <ul>
      {orders?.map((order) => (
        <li key={order.id}>
          <h3>{order.nome_cliente}</h3>
          <p>Status: {order.status}</p>
          <p>Descrição: {order.descricao}</p>
        </li>
      ))}
    </ul>
  );
}

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export interface Pedido {
  id: string;
  nome_cliente: string;
  email_cliente: string;
  telefone_cliente?: string;
  descricao: string;
  genero_musical?: string;
  duracao_segundos: number;
  status: PedidoStatus;
  url_previa?: string;
  url_musica?: string;
  pix_qr_code?: string;
  pix_fixado: boolean;
  valor_pix?: number;
  pago_em?: string;
  criado_em: string;
  atualizado_em: string;
}

export type PedidoStatus =
  | 'recebido'
  | 'em_producao'
  | 'em_revisao'
  | 'pronto'
  | 'previa'
  | 'pagamento'
  | 'entregue';

export interface StatusHistory {
  id: string;
  pedido_id: string;
  status_anterior?: string;
  status_novo: string;
  admin_user?: string;
  mensagem_whatsapp?: string;
  criado_em: string;
}

// ============================================
// MELHORIAS FUTURAS
// ============================================

/**
 * TODO: Implementar
 * - [ ] Autenticação com Supabase Auth
 * - [ ] Cache com Redis
 * - [ ] Webhooks para notificações
 * - [ ] Funções PostgreSQL customizadas
 * - [ ] Backup automático
 * - [ ] Logs de auditoria
 * - [ ] Replicação geográfica
 */
