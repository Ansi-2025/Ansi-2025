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
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
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
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_APP_PASSWORD=admin123
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789
```

> ⚠️ Nunca commite `.env.local` - está em `.gitignore`

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
