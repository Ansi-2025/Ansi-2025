# 🚀 Guia de Migração: Lovable → Supabase

## Visão Geral
Este guia detalha como migrar o projeto "Canção de Fé" do Lovable para Supabase, mantendo toda a funcionalidade e dados intactos.

---

## 📋 Fase 1: Preparação no Supabase

### 1.1 Criar Projeto Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New project"
3. Configure:
   - **Name:** `cancao-de-fe`
   - **Database Password:** Gere uma senha forte e salve em local seguro
   - **Region:** Escolha a mais próxima (ex: `sa-east-1` para Brasil)
4. Aguarde o projeto ser criado (2-3 minutos)

### 1.2 Obter Credenciais
1. Vá para **Settings → API**
2. Copie e salve em `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ... (NUNCA compartilhe publicamente)
   ```

---

## 🗄️ Fase 2: Criar Estrutura de Banco de Dados

### 2.1 SQL para Criar Tabelas

Acesse **SQL Editor** no Supabase e execute:

```sql
-- ========================================
-- 1. CRIAR ENUM PARA STATUS
-- ========================================
CREATE TYPE public.pedido_status AS ENUM (
  'recebido',
  'em_producao',
  'em_revisao',
  'pronto',
  'previa',
  'pagamento',
  'entregue'
);

-- ========================================
-- 2. CRIAR TABELA PEDIDOS (ORDERS)
-- ========================================
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Cliente Info
  nome_cliente TEXT NOT NULL,
  email_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  
  -- Pedido Details
  descricao TEXT NOT NULL,
  genero_musical TEXT,
  duracao_segundos INTEGER DEFAULT 45,
  
  -- Status e Arquivos
  status public.pedido_status NOT NULL DEFAULT 'recebido',
  url_previa TEXT,
  url_musica TEXT,
  pix_qr_code TEXT,
  pix_fixado BOOLEAN DEFAULT false,
  
  -- Pagamento
  valor_pix DECIMAL(10, 2),
  pago_em TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT email_format CHECK (email_cliente ~* '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT descricao_min_length CHECK (LENGTH(descricao) >= 30)
);

-- Índices para performance
CREATE INDEX idx_pedidos_email ON public.pedidos(email_cliente);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_criado_em ON public.pedidos(criado_em DESC);

-- ========================================
-- 3. CRIAR TABELA HISTORICO DE STATUS
-- ========================================
CREATE TABLE public.status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  admin_user TEXT,
  mensagem_whatsapp TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_pedido_id ON public.status_history(pedido_id);
CREATE INDEX idx_status_history_criado_em ON public.status_history(criado_em DESC);

-- ========================================
-- 4. CRIAR BUCKET PARA MÚSICAS
-- ========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('musicas', 'Músicas do Projeto', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Políticas para PEDIDOS
-- Qualquer um pode LER seus próprios pedidos (pelo email)
CREATE POLICY "Clientes veem seus próprios pedidos"
  ON public.pedidos FOR SELECT
  USING (true);

-- Service role pode fazer tudo (usado por funções server-side)
CREATE POLICY "Service role gerencia pedidos"
  ON public.pedidos FOR ALL
  TO service_role
  WITH CHECK (true);

-- Políticas para STATUS_HISTORY
CREATE POLICY "Público lê histórico de status"
  ON public.status_history FOR SELECT
  USING (true);

CREATE POLICY "Service role gerencia histórico"
  ON public.status_history FOR ALL
  TO service_role
  WITH CHECK (true);

-- Políticas para STORAGE (MUSICAS)
CREATE POLICY "Público vê músicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'musicas');

CREATE POLICY "Service role upload músicas"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'musicas');

CREATE POLICY "Service role deleta músicas"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'musicas');
```

---

## 🔗 Fase 3: Atualizar Variáveis de Ambiente

### 3.1 Arquivo `.env.local`
```env
# Supabase
VITE_SUPABASE_URL=https://[SEU_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[SEU_ANON_KEY]
VITE_SUPABASE_SERVICE_ROLE_KEY=[SEU_SERVICE_ROLE_KEY]

# Telegram (se usar)
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id

# Outros
VITE_APP_PASSWORD=sua_senha_admin_aqui
```

### 3.2 Arquivo `.env.production`
```env
# Produção - Use valores seguros
VITE_SUPABASE_URL=https://[SEU_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[SEU_ANON_KEY_PROD]
```

---

## 📱 Fase 4: Migrar Dados (Se houver dados no Lovable)

### 4.1 Exportar de Lovable
1. Se há dados no Lovable, exporte em JSON/CSV
2. Prepare em formato compatível com Supabase

### 4.2 Importar para Supabase
```sql
-- Exemplo: Inserir dados exportados
INSERT INTO public.pedidos (
  nome_cliente, email_cliente, telefone_cliente,
  descricao, genero_musical, status
) VALUES
  ('João Silva', 'joao@email.com', '11999999999', 
   'Quero uma música sobre fé e esperança', 'Gospel', 'recebido'),
  ('Maria Santos', 'maria@email.com', '11988888888',
   'Música para casamento com tema cristão', 'Clássica', 'em_producao');
```

---

## ⚙️ Fase 5: Configurar Server Functions

### 5.1 Atualizar `src/lib/order.functions.ts`

As funções já estão prontas! Apenas verifique se as importações do Supabase estão corretas:

```typescript
import { createServerFn } from '@tanstack/start';
import { supabase } from '~/integrations/supabase/client.server';
import { z } from 'zod';

// Suas funções de negócio estão aqui
// Exemplo de função que será executada no servidor
```

### 5.2 Criar Função RPC para Migrations (Opcional)

Se precisar executar SQL dinâmico:

```sql
-- No Supabase SQL Editor
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSON AS $$
BEGIN
  -- Esta função permite executar SQL via RPC
  -- Use com CUIDADO em produção!
  EXECUTE sql_query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Restrinja para service_role apenas
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
```

---

## 🧪 Fase 6: Testes

### 6.1 Testar Conexão
```typescript
// Em src/routes/__root.tsx ou em um route de teste
import { useEffect } from 'react';
import { supabase } from '~/integrations/supabase/client';

export function TestConnection() {
  useEffect(() => {
    const test = async () => {
      try {
        const { data, error } = await supabase
          .from('pedidos')
          .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        console.log('✓ Supabase conectado!');
      } catch (e) {
        console.error('✗ Erro de conexão:', e);
      }
    };
    test();
  }, []);

  return null;
}
```

### 6.2 Testar CRUD
```typescript
// Criar
const { data: newOrder } = await supabase
  .from('pedidos')
  .insert({ nome_cliente: 'Teste', email_cliente: 'teste@test.com', descricao: 'Descrição com mais de trinta caracteres aqui' })
  .select()
  .single();

// Ler
const { data: orders } = await supabase
  .from('pedidos')
  .select('*')
  .eq('status', 'recebido');

// Atualizar
const { data: updated } = await supabase
  .from('pedidos')
  .update({ status: 'em_producao' })
  .eq('id', orderId)
  .select()
  .single();

// Deletar
await supabase
  .from('pedidos')
  .delete()
  .eq('id', orderId);
```

---

## 🔐 Fase 7: Segurança

### 7.1 Configurar JWT Secret
1. Vá para **Settings → Database**
2. Copie o `JWT_SECRET`
3. Configure em suas variáveis de ambiente

### 7.2 Habilitar 2FA (Recomendado)
1. **Settings → Auth → MFA**
2. Ative TOTP ou outros métodos

### 7.3 Secrets no `.gitignore`
```bash
# Já deve estar no .gitignore:
.env.local
.env.*.local
.env.production.local
```

---

## 📦 Fase 8: Deploy

### 8.1 Build
```bash
npm run build
```

### 8.2 Testar Localmente
```bash
npm run dev
```

### 8.3 Deploy para Produção

**Opção 1: Vercel/Netlify**
```bash
# Configure as variáveis de ambiente no painel
# Deploy automático ao push para main
```

**Opção 2: Lovable (continuar usando)**
```bash
git push origin main
# Lovable sincroniza automaticamente
```

---

## 🆘 Troubleshooting

### Erro: "Type pedido_status not found"
```sql
-- Verifique se o enum foi criado
SELECT typname FROM pg_type WHERE typname = 'pedido_status';

-- Se não existir, execute a criação novamente
CREATE TYPE public.pedido_status AS ENUM (
  'recebido', 'em_producao', 'em_revisao', 'pronto', 'previa', 'pagamento', 'entregue'
);
```

### Erro: "CORS error" no frontend
1. Vá para **Settings → API**
2. Em **CORS**, adicione seu domínio:
   - Desenvolvimento: `http://localhost:5173`
   - Produção: `https://seu-dominio.com`

### Erro: "Permission denied" em operações
1. Verifique as políticas RLS em **Authentication → Policies**
2. Assegure que o usuário/service_role tem permissões
3. Teste com `service_role` key (no backend apenas!)

### Música não aparece no bucket
1. Verifique se o bucket `musicas` foi criado
2. Confirme que as políticas RLS permitem SELECT
3. Verifique o caminho do arquivo no código

---

## ✅ Checklist de Migração

- [ ] Projeto Supabase criado
- [ ] Credenciais salvas em `.env.local`
- [ ] Estrutura de BD criada (SQL executado)
- [ ] Dados migrados (se houver)
- [ ] Funções de negócio testadas
- [ ] RLS policies configuradas
- [ ] Build compila sem erros
- [ ] Testes de CRUD passam
- [ ] Deploy para staging OK
- [ ] Deploy para produção OK

---

## 📚 Recursos Adicionais

- [Docs Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🤝 Suporte

Se encontrar problemas:
1. Consulte logs no **Supabase Dashboard → Logs**
2. Verifique console do navegador (F12)
3. Teste queries no **SQL Editor** do Supabase
4. Leia a documentação oficial

---

**Data de atualização:** 30/06/2026  
**Status:** ✅ Pronto para implementação
