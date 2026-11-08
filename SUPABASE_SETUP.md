# 🎵 Canção de Fé - Setup Supabase

## ⚡ Quick Start (5 minutos)

### 1️⃣ Crie Projeto Supabase
```
1. Vá para https://supabase.com
2. Clique "New Project"
3. Nome: cancao-de-fe
4. Region: sa-east-1
5. Aguarde criação (2-3 min)
```

### 2️⃣ Copie Credenciais
```
Settings → API → Copie as 3 chaves para .env.local:

VITE_SUPABASE_URL=https://[ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...
```

### 3️⃣ Configure Banco de Dados
```
No Supabase:
1. SQL Editor
2. Copie todo o SQL de: supabase/migrations/20260630240000_fix_pedido_status_enum.sql
3. Execute
```

### 4️⃣ Teste
```bash
npm run dev
# Verificar console para confirmação de conexão
```

---

## 📋 Estrutura do Banco

```
pedidos
├── id (UUID) ← Chave primária
├── nome_cliente
├── email_cliente  
├── descricao (min 30 caracteres)
├── status (recebido, em_producao, em_revisao, pronto, previa, pagamento, entregue)
├── url_previa (45 segundos)
├── url_musica (final)
├── pix_qr_code
├── pix_fixado (true/false)
├── valor_pix
├── pago_em
└── timestamps (criado_em, atualizado_em)

status_history
├── id
├── pedido_id → pedidos
├── status_anterior
├── status_novo
├── admin_user
├── mensagem_whatsapp
└── criado_em

storage.musicas/
└── [arquivo.mp3]
```

---

## 🔧 Environment Variables

```env
# .env.local (DEV)
VITE_SUPABASE_URL=https://[ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789
FLATKEY_API_KEY=sua_chave_flatkey
FLATKEY_MODEL=gpt-6-luna
```

> ⚠️ Nunca commite `.env.local` - está em `.gitignore`
>
> Variáveis `VITE_` ficam disponíveis ao navegador. A chave administrativa do Supabase e
> o token do Telegram devem ser configurados somente no servidor, sem esse prefixo.
> Remova antigas variáveis `VITE_SUPABASE_SERVICE_ROLE*` antes de iniciar ou gerar o build.
> Se alguma chave administrativa ou token tiver sido exposto, revogue-o e configure um novo.
> `FLATKEY_MODEL` é opcional; se omitido, a aplicação usa `gpt-6-luna`. Configure um modelo
> disponível na conta Flatkey e consulte as condições de uso e cobrança do provedor.
>
> O preço de novos pedidos é definido em `src/lib/pricing.ts`: R$ 19,90 pela música e
> R$ 5,00 pela segunda versão opcional. A variável antiga `STRIPE_ITEM_PRICE` não é
> mais utilizada. Para pedidos com pagamento já iniciado, o valor anterior é consultado
> no Stripe e mantido, inclusive ao alterar a seleção da segunda versão.
>
> Para o botão **Ver Exemplos**, configure `VITE_EXAMPLE_MUSIC_1`,
> `VITE_EXAMPLE_MUSIC_2` e `VITE_EXAMPLE_MUSIC_3` com os links dos três áudios
> no `.env.local` e nas variáveis do ambiente de produção. Variáveis `VITE_` e
> links assinados ficam visíveis aos visitantes; use apenas links destinados ao
> acesso público e substitua-os quando expirarem. Após alterar as variáveis,
> gere e publique um novo build.
>
> As orientações em áudio usam `VITE_GUIDE_WELCOME`, `VITE_GUIDE_START`, `VITE_GUIDE_STORY`,
> `VITE_GUIDE_BACK`, `VITE_GUIDE_CREATE`, `VITE_GUIDE_OCCASION`,
> `VITE_GUIDE_STYLE`, `VITE_GUIDE_PREVIEW` e `VITE_GUIDE_SECOND_VERSION`.
> Configure os links no `.env.local` e na Vercel como variáveis públicas de
> configuração, não como segredos. Eles ficam visíveis no navegador e devem ser
> renovados ao expirar. Os clientes podem silenciar as orientações; a reprodução
> dos exemplos e da música não é silenciada por essa opção.
> A mensagem de boas-vindas tenta tocar ao entrar na página, mas pode ser
> bloqueada pela política de reprodução automática do navegador.

---

## ✅ Checklist

- [ ] Projeto criado no Supabase
- [ ] `.env.local` preenchido
- [ ] SQL executado com sucesso
- [ ] `npm run dev` conecta ao Supabase
- [ ] Teste POST em /api/orders funciona
- [ ] Build compila: `npm run build`
- [ ] Pronto para deploy

---

## 🆘 Troubleshooting

### ❌ "Can't connect to Supabase"
```
✓ Verifique VITE_SUPABASE_URL no .env.local
✓ Confirme chaves corretas no painel Supabase
✓ Verifique internet e firewall
```

### ❌ "Type pedido_status not found"
```sql
-- Verifique se enum foi criado
SELECT typname FROM pg_type WHERE typname = 'pedido_status';

-- Se falta, execute migration novamente
```

### ❌ "CORS error"
```
✓ Supabase → Settings → API → CORS
✓ Adicione: http://localhost:5173 (dev)
✓ Adicione: https://seu-dominio.com (prod)
```

---

## 📚 Documentação Completa

Para guia detalhado com:
- Migração de dados existentes
- Segurança e RLS
- Deploy em produção
- Funções avançadas

👉 Veja: **MIGRACAO_LOVABLE_SUPABASE.md**

---

## 🚀 Próximos Passos

1. **Dev Local:** `npm run dev` → Testa tudo
2. **Build:** `npm run build` → Verifica erros
3. **Deploy Dev:** `git push origin dev` → Staging
4. **Deploy Prod:** `git push origin main` → Produção

---

## 📞 Suporte

- 📖 [Supabase Docs](https://supabase.com/docs)
- 🐛 [GitHub Issues](https://github.com/seu-usuario/cancao-de-fe)
- 💬 Guia completo: MIGRACAO_LOVABLE_SUPABASE.md

---

**Última atualização:** 30/06/2026  
**Status:** ✅ Pronto para usar
