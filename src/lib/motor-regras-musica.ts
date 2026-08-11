export type DadosPedidoParaRoteiro = {
  nome_cliente: string;
  email_cliente?: string | null;
  telefone_cliente?: string | null;
  para_quem: string;
  ocasiao: string;
  descricao: string;
  genero_musical: string;
  duracao_segundos: number;
};

export function gerarRoteiroMusical(pedido: DadosPedidoParaRoteiro) {
  const tema = gerarTema(pedido);
  const narrativa = gerarNarrativa(pedido);
  const tom = gerarTom(pedido);
  const estilo = pedido.genero_musical;
  const instrumentos = selecionarInstrumentos(pedido.genero_musical);
  const estrutura = [
    "Introdução",
    "Verso 1",
    "Pré-Refrão",
    "Refrão",
    "Verso 2",
    "Ponte",
    "Refrão Final",
  ];

  return `Tema:\n${tema}\n\nNarrativa:\n${narrativa}\n\nTom:\n${tom}\n\nEstilo:\n${estilo}\n\nInstrumentos:\n${instrumentos.join("\n")}\n\nEstrutura:\n${estrutura.join("\n")}`;
}

function gerarTema(pedido: DadosPedidoParaRoteiro) {
  const descricao = pedido.descricao.toLowerCase();
  if (descricao.includes("amor") || descricao.includes("esposa") || descricao.includes("marido") || descricao.includes("família")) {
    return "Amor e conexão familiar";
  }
  if (descricao.includes("fé") || descricao.includes("Deus") || descricao.includes("oração")) {
    return "Fé, gratidão e esperança";
  }
  if (descricao.includes("vitória") || descricao.includes("superação") || descricao.includes("cura")) {
    return "Superação e vitória";
  }
  return "História pessoal marcada pela emoção";
}

function gerarNarrativa(pedido: DadosPedidoParaRoteiro) {
  const partes: string[] = [];
  partes.push(`A música é um ${pedido.genero_musical.toLowerCase()} com atmosfera emocional e memorável.`);
  partes.push(`A canção é dedicada a ${pedido.para_quem} e celebra ${pedido.ocasiao.toLowerCase()}.`);
  partes.push(`O cliente ${pedido.nome_cliente} deseja incluir na letra: ${pedido.descricao.trim()}`);
  partes.push(`A mensagem central deve ser profunda, honesta e inspiradora, com tom emocional e envolvente.`);
  return partes.join(" ");
}

function gerarTom(pedido: DadosPedidoParaRoteiro) {
  const descricao = pedido.descricao.toLowerCase();
  if (descricao.includes("emocionante") || descricao.includes("lindo") || descricao.includes("saudade")) {
    return "Emocionante e acolhedor";
  }
  if (descricao.includes("alegre") || descricao.includes("festa") || descricao.includes("celebração")) {
    return "Animado e festivo";
  }
  return "Aconchegante e inspirador";
}

function selecionarInstrumentos(genero: string) {
  const generoLower = genero.toLowerCase();
  if (generoLower.includes("gospel") || generoLower.includes("adoração") || generoLower.includes("pop gospel")) {
    return ["Violão", "Piano", "Baixo", "Bateria suave"];
  }
  if (generoLower.includes("romântica") || generoLower.includes("romantica")) {
    return ["Violão", "Piano", "Cordas" , "Baixo acústico"];
  }
  if (generoLower.includes("sertanejo")) {
    return ["Violão", "Sanfona", "Baixo", "Bateria leve"];
  }
  if (generoLower.includes("infantil")) {
    return ["Teclado", "Ukulele", "Percussão leve", "Cordas suaves"];
  }
  return ["Violão", "Piano", "Baixo", "Bateria leve"];
}
