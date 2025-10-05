-- Migração para adicionar campos ao histórico de resumos
-- Execute este script para atualizar a tabela summaries existente

-- Adicionar novos campos se não existirem
DO $$ 
BEGIN
    -- Adicionar campo title se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'summaries' AND column_name = 'title') THEN
        ALTER TABLE summaries ADD COLUMN title TEXT;
    END IF;

    -- Renomear coluna type para document_type se necessário
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'summaries' AND column_name = 'type') THEN
        ALTER TABLE summaries RENAME COLUMN type TO document_type;
    END IF;

    -- Adicionar campo word_count se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'summaries' AND column_name = 'word_count') THEN
        ALTER TABLE summaries ADD COLUMN word_count INTEGER;
    END IF;

    -- Adicionar campo processing_time se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'summaries' AND column_name = 'processing_time') THEN
        ALTER TABLE summaries ADD COLUMN processing_time DECIMAL(10,2);
    END IF;

    -- Adicionar campo focus se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'summaries' AND column_name = 'focus') THEN
        ALTER TABLE summaries ADD COLUMN focus VARCHAR(50) DEFAULT 'privacy';
    END IF;

    -- Atualizar valores padrão para document_type
    UPDATE summaries SET document_type = 'unknown' WHERE document_type IS NULL;
    
    -- Calcular word_count baseado no summary se possível
    UPDATE summaries 
    SET word_count = CASE 
        WHEN summary IS NOT NULL AND summary != '' THEN 
            array_length(string_to_array(trim(summary), ' '), 1)
        ELSE 0 
    END
    WHERE word_count IS NULL;

    -- Calcular processing_time baseado na duration
    UPDATE summaries 
    SET processing_time = ROUND(duration / 1000.0, 2)
    WHERE processing_time IS NULL;

END $$;

-- Criar índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_summaries_document_type ON summaries(document_type);
CREATE INDEX IF NOT EXISTS idx_summaries_focus ON summaries(focus);
CREATE INDEX IF NOT EXISTS idx_summaries_word_count ON summaries(word_count);

-- Atualizar view analytics_summaries para incluir novos campos
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

-- View para histórico de utilizador
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

COMMENT ON TABLE summaries IS 'Tabela de resumos gerados pelos utilizadores';
COMMENT ON COLUMN summaries.title IS 'Título da página analisada';
COMMENT ON COLUMN summaries.document_type IS 'Tipo de documento: privacy_policy, terms_of_service, unknown';
COMMENT ON COLUMN summaries.word_count IS 'Número de palavras no resumo';
COMMENT ON COLUMN summaries.processing_time IS 'Tempo de processamento em segundos';
COMMENT ON COLUMN summaries.focus IS 'Foco do resumo: privacy, terms, general';
