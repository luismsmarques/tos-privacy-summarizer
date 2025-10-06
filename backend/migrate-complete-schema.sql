-- Migração completa para resolver problemas de URL e Summary null
-- Execute este script para garantir que todas as colunas necessárias existem

-- 1. Adicionar colunas básicas se não existirem
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Adicionar colunas extras se não existirem
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS processing_time DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS focus VARCHAR(50) DEFAULT 'privacy';

-- 3. Renomear coluna type para document_type se necessário
DO $$ 
BEGIN
    -- Verificar se existe coluna 'type' mas não 'document_type'
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'summaries' AND column_name = 'type')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'summaries' AND column_name = 'document_type') THEN
        ALTER TABLE summaries RENAME COLUMN type TO document_type;
    END IF;
END $$;

-- 4. Adicionar coluna document_type se não existir
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'unknown';

-- 5. Criar função para updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Criar trigger para updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_summaries_updated_at') THEN
        CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. Atualizar registros existentes
UPDATE summaries 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 8. Atualizar document_type para registros existentes
UPDATE summaries 
SET document_type = 'unknown' 
WHERE document_type IS NULL;

-- 9. Calcular word_count baseado no summary se possível
UPDATE summaries 
SET word_count = CASE 
    WHEN summary IS NOT NULL AND summary != '' THEN 
        array_length(string_to_array(trim(summary), ' '), 1)
    ELSE 0 
END
WHERE word_count IS NULL;

-- 10. Calcular processing_time baseado na duration
UPDATE summaries 
SET processing_time = ROUND(duration / 1000.0, 2)
WHERE processing_time IS NULL;

-- 11. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_summaries_url ON summaries(url);
CREATE INDEX IF NOT EXISTS idx_summaries_document_type ON summaries(document_type);
CREATE INDEX IF NOT EXISTS idx_summaries_focus ON summaries(focus);
CREATE INDEX IF NOT EXISTS idx_summaries_word_count ON summaries(word_count);

-- 12. Atualizar view analytics_summaries
CREATE OR REPLACE VIEW analytics_summaries AS
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN created_at > CURRENT_DATE THEN 1 END) as today,
    ROUND(AVG(duration) / 1000.0, 2) as avg_time,
    ROUND(COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate,
    ROUND(AVG(word_count), 0) as avg_word_count,
    COUNT(CASE WHEN document_type = 'privacy_policy' THEN 1 END) as privacy_policies,
    COUNT(CASE WHEN document_type = 'terms_of_service' THEN 1 END) as terms_of_service,
    COUNT(CASE WHEN document_type = 'unknown' THEN 1 END) as unknown_docs
FROM summaries;

-- 13. Criar view para histórico de utilizador
CREATE OR REPLACE VIEW user_history AS
SELECT 
    s.id,
    s.summary_id,
    s.user_id,
    s.url,
    s.title,
    s.document_type,
    s.success,
    s.duration,
    s.text_length,
    s.word_count,
    s.summary,
    s.processing_time,
    s.focus,
    s.created_at,
    s.updated_at,
    u.credits
FROM summaries s
JOIN users u ON s.user_id = u.user_id
ORDER BY s.created_at DESC;

-- 14. Adicionar comentários para documentação
COMMENT ON TABLE summaries IS 'Tabela de resumos gerados pelos utilizadores';
COMMENT ON COLUMN summaries.url IS 'URL da página analisada';
COMMENT ON COLUMN summaries.summary IS 'Conteúdo do resumo gerado';
COMMENT ON COLUMN summaries.title IS 'Título da página analisada';
COMMENT ON COLUMN summaries.document_type IS 'Tipo de documento: privacy_policy, terms_of_service, unknown';
COMMENT ON COLUMN summaries.word_count IS 'Número de palavras no resumo';
COMMENT ON COLUMN summaries.processing_time IS 'Tempo de processamento em segundos';
COMMENT ON COLUMN summaries.focus IS 'Foco do resumo: privacy, terms, general';

-- 15. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'summaries' 
ORDER BY ordinal_position;
