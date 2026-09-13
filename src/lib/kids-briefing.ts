export type KidsFormData = {
  childName: string;
  ageGroup: string;
  objectives: string[];
  interactions: string[];
  focusWord?: string;
  favoriteAnimal?: string;
  favoriteToy?: string;
  favoriteFood?: string;
  momName?: string;
  dadName?: string;
  siblingNames?: string;
  grandparentsNames?: string;
  childStory?: string;
  phone?: string;
  email?: string;
};

export function buildKidsBriefing(data: KidsFormData): string {
  const objectives = data.objectives.length > 0 ? data.objectives.join(", ") : "aprendizado e diversão";
  const interactions = data.interactions.length > 0 ? data.interactions.join(", ") : "brincar e cantar";

  const facts = [
    `A música é para ${data.childName.trim() || "a criança"} e foi pensada para a faixa etária ${data.ageGroup}.`,
    `Objetivos principais: ${objectives}.`,
    `Interações da música: ${interactions}.`,
  ];

  if (data.focusWord) facts.push(`A palavra que a criança está aprendendo é ${data.focusWord}.`);
  if (data.favoriteAnimal) facts.push(`Animal favorito: ${data.favoriteAnimal}.`);
  if (data.favoriteToy) facts.push(`Brinquedo favorito: ${data.favoriteToy}.`);
  if (data.favoriteFood) facts.push(`Comida favorita: ${data.favoriteFood}.`);
  if (data.momName) facts.push(`Nome da mamãe: ${data.momName}.`);
  if (data.dadName) facts.push(`Nome do papai: ${data.dadName}.`);
  if (data.siblingNames) facts.push(`Nomes dos irmãos: ${data.siblingNames}.`);
  if (data.grandparentsNames) facts.push(`Nomes dos avós: ${data.grandparentsNames}.`);
  if (data.childStory) facts.push(`Sobre a criança: ${data.childStory}.`);

  facts.push(
    "Crie uma música infantil simples, alegre, cheia de repetição, refrão fácil e momentos de interação entre pais e filhos.",
  );

  return facts.join(" ");
}

export function buildKidsOrderData(
  data: KidsFormData,
  contact: { phone: string; email?: string | null; responsibleName?: string | null } = { phone: "" },
) {
  const childName = data.childName.trim();
  const safePhone = (contact.phone ?? "").trim();
  const briefing = buildKidsBriefing(data);
  const objectiveText = data.objectives.length > 0 ? data.objectives.join(", ") : "aprendizado e diversão";
  const storyText = data.childStory?.trim() ? ` ${data.childStory.trim()}` : "";

  return {
    nome_cliente: childName || "Criança",
    email_cliente: contact.email?.trim() || undefined,
    telefone_cliente: safePhone || "(00) 00000-0000",
    para_quem: childName || "Criança",
    nome_receptor: undefined,
    ocasiao: `Aprendizado, brincadeira e conexão em casa para ${childName || "a criança"}`,
    descricao: `Canção de Fé Kids — ${briefing}${storyText}`.slice(0, 2000),
    genero_musical: "Infantil",
    tipo_cantor: "feminino" as const,
    duracao_segundos: 90,
    bot_field: "",
    form_started_at: Date.now(),
    objetivo_principal: objectiveText,
  };
}
