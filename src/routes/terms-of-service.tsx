import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Canção de Fé" },
      { name: "description", content: "Consulte os termos de uso da Canção de Fé." },
    ],
  }),
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#041827] px-5 py-16 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-200 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>

        <article className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(10,20,30,0.35)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-sky-100/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
            <FileText className="h-3.5 w-3.5" />
            Termos
          </div>

          <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Termos de Uso
          </h1>

          <div className="mt-8 space-y-6 text-base leading-relaxed text-sky-50/80">
            <p>
              Ao utilizar os serviços da Canção de Fé, o usuário declara que leu e aceita as condições aqui descritas.
            </p>

            <p>
              Os serviços oferecidos têm como objetivo produzir músicas personalizadas com base nas informações e histórias
              fornecidas pelo cliente, incluindo textos, memórias, frases e orientações para a criação da obra.
            </p>

            <p>
              O cliente é responsável pela veracidade das informações informadas, incluindo dados pessoais, texto da canção,
              informações do pedido e dados de pagamento.
            </p>

            <p>
              A Canção de Fé se compromete a entregar o material conforme o fluxo contratado, porém não garante que o
              resultado final reproduza exatamente expectativas subjetivas, sendo possível ajustar letras, versões e detalhes
              por meio do processo de aprovação do cliente.
            </p>

            <p>
              Pagamentos serão processados por plataformas externas e o cliente deve respeitar as políticas de uso e segurança
              aplicáveis a essas ferramentas.
            </p>

            <p>
              O uso indevido do serviço, inclusive envio de conteúdo ofensivo, falso, ilegal ou que viole direitos de terceiros,
              poderá resultar na suspensão do atendimento.
            </p>

            <p>
              Estes termos podem ser alterados a qualquer momento, e a continuidade do uso do serviço após mudanças implica
              aceitação das novas condições.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
