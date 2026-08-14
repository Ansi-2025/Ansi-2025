import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Canção de Fé" },
      { name: "description", content: "Conheça a política de privacidade da Canção de Fé." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
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
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacidade
          </div>

          <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Política de Privacidade
          </h1>

          <div className="mt-8 space-y-6 text-base leading-relaxed text-sky-50/80">
            <p>
              A Canção de Fé respeita a privacidade de seus clientes e visitantes. Coletamos apenas as informações
              necessárias para fornecer nossos serviços, como nome, WhatsApp, e-mail, CPF e dados do pedido.
            </p>

            <p>
              Utilizamos esses dados para processar a criação da música personalizada, enviar atualizações do pedido,
              validar o pagamento e manter o atendimento adequado ao cliente.
            </p>

            <p>
              Os dados pessoais são armazenados em ambiente seguro e não são vendidos, compartilhados ou comercializados
              com terceiros, salvo quando exigido por lei ou necessário para a prestação do serviço contratado.
            </p>

            <p>
              Também podem ser usados serviços de terceiros, como Stripe e Supabase, para processamento de pagamento e
              organização do pedido, de acordo com as políticas aplicáveis dessas plataformas.
            </p>

            <p>
              Você pode solicitar acesso, correção ou exclusão de seus dados entrando em contato pelo suporte da Canção
              de Fé.
            </p>

            <p>
              Esta política pode ser atualizada periodicamente para refletir melhorias internas ou requisitos legais.
              Recomendamos revisá-la com frequência.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
