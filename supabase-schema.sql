-- Supabase Schema para ToS Summarizer Analytics
-- Execute este SQL no SQL Editor do Supabase

-- Tabela de utilizadores
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_summaries INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0
);

-- Tabela de resumos
CREATE TABLE summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT,
    document_type TEXT CHECK (document_type IN ('terms_of_service', 'privacy_policy', 'other')),
    text_length INTEGER,
    response_time DECIMAL(5,2),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de analytics (métricas agregadas)
CREATE TABLE analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE UNIQUE,
    total_users INTEGER DEFAULT 0,
    total_summaries INTEGER DEFAULT 0,
    avg_response_time DECIMAL(5,2) DEFAULT 0,
    uptime DECIMAL(5,2) DEFAULT 100,
    requests_per_minute INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_created_at ON summaries(created_at);
CREATE INDEX idx_analytics_date ON analytics(date);

-- Função para incrementar contadores
CREATE OR REPLACE FUNCTION increment_counter(table_name TEXT, column_name TEXT, id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_value INTEGER;
BEGIN
    EXECUTE format('SELECT %I FROM %I WHERE id = $1', column_name, table_name) 
    INTO current_value USING id;
    
    current_value := COALESCE(current_value, 0) + 1;
    
    EXECUTE format('UPDATE %I SET %I = $1 WHERE id = $2', table_name, column_name) 
    USING current_value, id;
    
    RETURN current_value;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar analytics automaticamente
CREATE OR REPLACE FUNCTION update_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar métricas do dia atual
    INSERT INTO analytics (date, total_users, total_summaries, avg_response_time, uptime, requests_per_minute, error_rate)
    VALUES (
        CURRENT_DATE,
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM summaries),
        (SELECT COALESCE(AVG(response_time), 0) FROM summaries WHERE created_at >= CURRENT_DATE),
        100.0, -- Uptime (simplificado)
        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE - INTERVAL '1 minute'),
        (SELECT COALESCE((COUNT(*) FILTER (WHERE success = false) * 100.0 / NULLIF(COUNT(*), 0)), 0) FROM summaries WHERE created_at >= CURRENT_DATE)
    )
    ON CONFLICT (date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        total_summaries = EXCLUDED.total_summaries,
        avg_response_time = EXCLUDED.avg_response_time,
        requests_per_minute = EXCLUDED.requests_per_minute,
        error_rate = EXCLUDED.error_rate,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar analytics quando novos resumos são criados
CREATE TRIGGER trigger_update_analytics
    AFTER INSERT ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics();

-- Trigger para atualizar last_active quando utilizador faz resumo
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_active = NOW(),
        total_summaries = total_summaries + 1,
        credits_used = credits_used + 1
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_activity
    AFTER INSERT ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

-- Políticas de segurança (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública de analytics
CREATE POLICY "Analytics are viewable by everyone" ON analytics
    FOR SELECT USING (true);

-- Política para permitir inserção de dados de analytics
CREATE POLICY "Allow analytics logging" ON summaries
    FOR INSERT WITH CHECK (true);

-- Política para permitir inserção de utilizadores
CREATE POLICY "Allow user creation" ON users
    FOR INSERT WITH CHECK (true);

-- Política para permitir atualização de utilizadores
CREATE POLICY "Allow user updates" ON users
    FOR UPDATE USING (true);

-- Inserir dados iniciais para teste
INSERT INTO analytics (date, total_users, total_summaries, avg_response_time, uptime, requests_per_minute, error_rate)
VALUES (CURRENT_DATE, 0, 0, 0, 100, 0, 0)
ON CONFLICT (date) DO NOTHING;
