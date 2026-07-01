export type HotmartPagamento = {
  id_transacao: string;
  status: "pendente" | "pago" | "cancelado";
  valor: number;
  expiracao: string;
};

export async function criarPagamentoHotmart() {
  throw new Error("Hotmart ainda não está implementado. Esta função é um ponto de extensão para a integração futura.");
}

export async function validarPagamentoHotmart() {
  throw new Error("Hotmart ainda não está implementado. Esta função é um ponto de extensão para a integração futura.");
}
