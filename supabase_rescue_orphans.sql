-- ==============================================================================
-- FINANTE: RESGATE DE DADOS ÓRFÃOS E PERMISSÕES DE EXCLUSÃO DE CATEGORIAS
-- Execute este script no SQL Editor do seu Supabase
-- ==============================================================================

-- 1. Atualizar a política de despesas para permitir visualizar itens do usuário OU itens antigos sem dono
DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
CREATE POLICY "Users can manage their own expenses" 
ON public.expenses 
FOR ALL 
TO authenticated 
USING (user_id IS NULL OR auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 2. Atualizar a política de receitas para permitir visualizar itens do usuário OU itens antigos sem dono
DROP POLICY IF EXISTS "Users can manage their own incomes" ON public.incomes;
CREATE POLICY "Users can manage their own incomes" 
ON public.incomes 
FOR ALL 
TO authenticated 
USING (user_id IS NULL OR auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 3. Atualizar a política de investimentos para permitir visualizar itens do usuário OU itens antigos sem dono
DROP POLICY IF EXISTS "Users can manage their own investments" ON public.investments;
CREATE POLICY "Users can manage their own investments" 
ON public.investments 
FOR ALL 
TO authenticated 
USING (user_id IS NULL OR auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Permitir que o usuário autenticado possa excluir categorias e fornecedores (mesmo os criados como padrão)
DROP POLICY IF EXISTS "Users can delete own expense_types" ON public.expense_types;
CREATE POLICY "Users can delete own expense_types" 
ON public.expense_types 
FOR DELETE 
TO authenticated 
USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
CREATE POLICY "Users can delete own companies" 
ON public.companies 
FOR DELETE 
TO authenticated 
USING (user_id IS NULL OR auth.uid() = user_id);

-- 5. Vincular automaticamente todas as despesas e receitas sem dono ao primeiro usuário autenticado
DO $$
DECLARE
    primeiro_usuario uuid;
BEGIN
    SELECT id INTO primeiro_usuario FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF primeiro_usuario IS NOT NULL THEN
        UPDATE public.expenses 
        SET user_id = primeiro_usuario 
        WHERE user_id IS NULL;

        UPDATE public.incomes 
        SET user_id = primeiro_usuario 
        WHERE user_id IS NULL;

        UPDATE public.investments 
        SET user_id = primeiro_usuario 
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Dados vinculados com sucesso ao usuário: %', primeiro_usuario;
    ELSE
        RAISE NOTICE 'Nenhum usuário cadastrado em auth.users ainda. As políticas permitirão a visualização assim que você fizer login.';
    END IF;
END $$;

-- 6. Permitir a mesma empresa em categorias diferentes
-- Remove qualquer restrição única que bloqueava o mesmo nome globalmente
ALTER TABLE IF EXISTS public.companies DROP CONSTRAINT IF EXISTS companies_name_key;
ALTER TABLE IF EXISTS public.companies DROP CONSTRAINT IF EXISTS companies_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS companies_user_name_type_unique_idx 
ON public.companies (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)), lower(trim(default_type)));

-- 7. Suporte a ícones e cores customizadas para tipos de despesa
ALTER TABLE IF EXISTS public.expense_types ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE IF EXISTS public.expense_types ADD COLUMN IF NOT EXISTS color text;

