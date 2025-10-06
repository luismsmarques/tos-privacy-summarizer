-- Schema para Analytics Database
-- Vercel Postgres

-- Tabela de utilizadores
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    summaries_generated INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resumos
CREATE TABLE IF NOT EXISTS summaries (
    id SERIAL PRIMARY KEY,
    summary_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    url TEXT,
    title TEXT,
    document_type VARCHAR(50) DEFAULT 'unknown',
    success BOOLEAN NOT NULL,
    duration INTEGER NOT NULL, -- em milissegundos
    text_length INTEGER,
    word_count INTEGER,
    summary TEXT,
    processing_time DECIMAL(10,2),
    focus VARCHAR(50) DEFAULT 'privacy',
    rating_complexidade INTEGER DEFAULT 0, -- 1-10 escala de complexidade
    rating_boas_praticas INTEGER DEFAULT 0, -- 1-10 escala de boas práticas
    risk_score INTEGER DEFAULT 0, -- 1-10 escala de risco (calculado)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabela de requests (para performance)
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- em milissegundos
    user_agent TEXT,
    ip_address VARCHAR(45),
    user_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Tabela de performance por hora
CREATE TABLE IF NOT EXISTS performance_hourly (
    id SERIAL PRIMARY KEY,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    date DATE NOT NULL,
    requests INTEGER DEFAULT 0,
    avg_response_time DECIMAL(10,3) DEFAULT 0,
    errors INTEGER DEFAULT 0,
    total_duration BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hour, date)
);

-- Tabela de créditos (histórico)
CREATE TABLE IF NOT EXISTS credits_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'consumed', 'purchased', 'refunded'
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabela de feedback
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'inaccurate', 'missing', 'unclear', 'irrelevant', 'format', 'other'
    section VARCHAR(50) NOT NULL, -- 'resumo_conciso', 'pontos_chave', 'alertas_privacidade', 'geral'
    description TEXT NOT NULL,
    suggestion TEXT,
    page_url TEXT,
    page_title TEXT,
    summary_id VARCHAR(255),
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES summaries(summary_id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_summaries_success ON summaries(success);
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_hourly_date ON performance_hourly(date);
CREATE INDEX IF NOT EXISTS idx_credits_history_user_id ON credits_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_history_created_at ON credits_history(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_section ON feedback(section);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_summary_id ON feedback(summary_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_hourly_updated_at BEFORE UPDATE ON performance_hourly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views para analytics (facilitam queries)
CREATE OR REPLACE VIEW analytics_overview AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM summaries WHERE success = true) as total_summaries,
    (SELECT COALESCE(AVG(duration), 0) FROM requests WHERE timestamp > NOW() - INTERVAL '1 hour') as avg_response_time,
    (SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE ROUND((COUNT(*) - COUNT(CASE WHEN status_code >= 400 THEN 1 END)) * 100.0 / COUNT(*), 2)
        END
     FROM requests WHERE timestamp > NOW() - INTERVAL '1 hour'
    ) as uptime,
    (SELECT COUNT(*) FROM requests WHERE timestamp > NOW() - INTERVAL '1 minute') as requests_per_minute,
    (SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*), 2)
        END
     FROM requests WHERE timestamp > NOW() - INTERVAL '1 hour'
    ) as error_rate;

CREATE OR REPLACE VIEW analytics_users AS
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN last_seen > CURRENT_DATE THEN 1 END) as active_today,
    COUNT(CASE WHEN first_seen > CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week,
    ROUND(
        COUNT(CASE WHEN last_seen > CURRENT_DATE THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as retention_rate
FROM users;

CREATE OR REPLACE VIEW analytics_summaries AS
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN created_at > CURRENT_DATE THEN 1 END) as today,
    ROUND(AVG(duration) / 1000.0, 2) as avg_time,
    ROUND(COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM summaries;
