import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Headphones, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5541997232395?text=Ol%C3%A1%2C%20quero%20ajuda%20sobre%20o%20pedido%20da%20minha%20m%C3%BAsica%20personalizada.";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Suporte | Canção de Fé" },
      { name: "description", content: "Entre em contato com o suporte da Canção de Fé." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <main className="min-h-screen bg-[#041827] px-5 py-16 text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-200 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(10,20,30,0.35)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-sky-100/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
            <Headphones className="h-3.5 w-3.5" />
            Suporte
          </div>

          <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Estamos aqui para ajudar
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-sky-50/80">
            Se você tiver dúvidas sobre seu pedido, pagamento, aprovação da letra, ou qualquer outro detalhe,
            fale com a gente pelo WhatsApp e responderemos o mais rápido possível.
          </p>

          <div className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-[#0b1d2e] p-5">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-[#25D366]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-100/80">Contato</p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-lg font-medium text-white transition-colors hover:text-[#25D366]"
                >
                  WhatsApp da Canção de Fé
                </a>
              </div>
            </div>

            <div className="border-t border-white/10 pt-5 text-sm leading-relaxed text-sky-50/75">
              <p>
                Horário de atendimento: de segunda a sábado, conforme a disponibilidade da equipe.
              </p>
              <p className="mt-2">
                Também é possível acompanhar seu pedido diretamente em <Link to="/acompanhar" className="text-white underline underline-offset-4">Acompanhar Pedido</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
