#!/bin/bash
# Script de inicialização rápida: Lovable → Supabase

echo "🚀 Canção de Fé - Guia Rápido de Migração Supabase"
echo "=================================================="
echo ""

# Step 1
echo "📋 PASSO 1: Crie um projeto em supabase.com"
echo "   → Vá para: https://supabase.com"
echo "   → Clique em 'New Project'"
echo "   → Nome: cancao-de-fe"
echo "   → Region: sa-east-1 (Brasil)"
echo "   → Aguarde 2-3 minutos"
echo ""

# Step 2
echo "🔑 PASSO 2: Copie as credenciais"
echo "   → Settings → API"
echo "   → Copie VITE_SUPABASE_URL"
echo "   → Copie VITE_SUPABASE_ANON_KEY"
echo "   → Copie VITE_SUPABASE_SERVICE_ROLE_KEY"
echo ""

# Step 3
echo "📝 PASSO 3: Crie arquivo .env.local"
echo "   → Crie arquivo na raiz do projeto"
echo "   → Cole as credenciais"
echo ""
cat > .env.local.template << 'EOF'
VITE_SUPABASE_URL=https://[SEU_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_APP_PASSWORD=sua_senha_admin_aqui
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id
EOF
echo "   ✓ Arquivo .env.local.template criado como referência"
echo ""

# Step 4
echo "🗄️  PASSO 4: Execute o SQL no Supabase"
echo "   → SQL Editor → Nova Query"
echo "   → Cole o conteúdo de: supabase/migrations/20260630240000_fix_pedido_status_enum.sql"
echo "   → Clique em 'RUN'"
echo ""

# Step 5
echo "🔗 PASSO 5: Teste a conexão"
echo "   → Execute: npm run dev"
echo "   → Abra: http://localhost:5173"
echo "   → Verifique o console para mensagens de conexão"
echo ""

# Step 6
echo "✅ PASSO 6: Deploy"
echo "   → npm run build"
echo "   → Faça commit: git add . && git commit -m 'chore: Configure Supabase'"
echo "   → Push: git push origin main"
echo ""

echo "=================================================="
echo "📚 Para guia completo, veja: MIGRACAO_LOVABLE_SUPABASE.md"
echo "🆘 Em caso de dúvidas, consulte o guia completo"
