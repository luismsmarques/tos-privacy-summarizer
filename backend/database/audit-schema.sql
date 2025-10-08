-- Audit Logs Schema for ToS & Privacy Summarizer
-- Comprehensive audit trail for security, compliance, and debugging

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'user_action', 'security_event', 'data_change', 'api_request', 'auth_event', 'payment_event', 'system_event'
    user_id VARCHAR(255), -- ID do utilizador (pode ser null para eventos do sistema)
    action VARCHAR(100) NOT NULL, -- Ação específica realizada
    table_name VARCHAR(50), -- Nome da tabela afetada (para data_change)
    record_id VARCHAR(255), -- ID do registro afetado (para data_change)
    old_values JSONB, -- Valores antigos (para data_change)
    new_values JSONB, -- Valores novos (para data_change)
    details JSONB NOT NULL, -- Detalhes específicos da ação
    metadata JSONB, -- Metadados adicionais (IP, User-Agent, etc.)
    severity INTEGER NOT NULL DEFAULT 1, -- 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=CRITICAL
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para performance
    CONSTRAINT audit_logs_severity_check CHECK (severity >= 0 AND severity <= 4)
);

-- Índices para performance de queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type_severity ON audit_logs(type, severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity_timestamp ON audit_logs(severity, timestamp);

-- Índice para queries de data change
CREATE INDEX IF NOT EXISTS idx_audit_logs_data_change ON audit_logs(table_name, record_id, timestamp) 
WHERE type = 'data_change';

-- Índice para queries de segurança
CREATE INDEX IF NOT EXISTS idx_audit_logs_security ON audit_logs(type, severity, timestamp) 
WHERE type = 'security_event' AND severity >= 2;

-- Índice para queries de API
CREATE INDEX IF NOT EXISTS idx_audit_logs_api ON audit_logs(type, timestamp) 
WHERE type = 'api_request';

-- Tabela de configurações de auditoria
CREATE TABLE IF NOT EXISTS audit_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurações padrão
INSERT INTO audit_config (config_key, config_value, description) VALUES
('retention_days', '90', 'Número de dias para manter logs de auditoria'),
('log_level', '1', 'Nível mínimo de log (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=CRITICAL)'),
('batch_size', '100', 'Tamanho do batch para inserção de logs'),
('flush_interval', '30000', 'Intervalo de flush em milissegundos'),
('enable_data_change_logging', 'true', 'Habilitar logging de mudanças de dados'),
('enable_api_logging', 'true', 'Habilitar logging de requests API'),
('enable_security_logging', 'true', 'Habilitar logging de eventos de segurança'),
('sensitive_fields', '["password", "token", "secret", "key", "apiKey"]', 'Campos sensíveis para redação')
ON CONFLICT (config_key) DO NOTHING;

-- Tabela de alertas de auditoria
CREATE TABLE IF NOT EXISTS audit_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    alert_name VARCHAR(100) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- Condições para trigger do alerta
    severity INTEGER NOT NULL DEFAULT 2,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alertas padrão
INSERT INTO audit_alerts (alert_type, alert_name, description, conditions, severity) VALUES
('security', 'Multiple Failed Logins', 'Detecta múltiplas tentativas de login falhadas', 
 '{"type": "auth_event", "action": "failed_login", "count": 5, "timeframe": "1h"}', 3),
('security', 'Suspicious API Usage', 'Detecta uso suspeito da API', 
 '{"type": "api_request", "error_rate": 0.8, "timeframe": "1h"}', 3),
('data', 'Mass Data Deletion', 'Detecta exclusão em massa de dados', 
 '{"type": "data_change", "operation": "DELETE", "count": 10, "timeframe": "1h"}', 4),
('system', 'High Error Rate', 'Detecta alta taxa de erros no sistema', 
 '{"type": "api_request", "severity": 3, "rate": 0.1, "timeframe": "15m"}', 3),
('payment', 'Payment Failures', 'Detecta falhas de pagamento', 
 '{"type": "payment_event", "action": "payment_failed", "count": 3, "timeframe": "1h"}', 3)
ON CONFLICT DO NOTHING;

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    retention_days INTEGER;
BEGIN
    -- Obter configuração de retenção
    SELECT (config_value->>'value')::INTEGER INTO retention_days
    FROM audit_config 
    WHERE config_key = 'retention_days';
    
    -- Default para 90 dias se não configurado
    IF retention_days IS NULL THEN
        retention_days := 90;
    END IF;
    
    -- Deletar logs antigos
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO audit_logs (type, action, details, severity)
    VALUES ('system_event', 'audit_cleanup', 
            json_build_object('deleted_count', deleted_count, 'retention_days', retention_days), 
            1);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_audit_config_updated_at BEFORE UPDATE ON audit_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_alerts_updated_at BEFORE UPDATE ON audit_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View para estatísticas de auditoria
CREATE OR REPLACE VIEW audit_stats AS
SELECT 
    type,
    severity,
    COUNT(*) as total_logs,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as first_log,
    MAX(timestamp) as last_log,
    AVG(CASE WHEN details ? 'responseTime' THEN (details->>'responseTime')::NUMERIC END) as avg_response_time
FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY type, severity
ORDER BY total_logs DESC;

-- View para eventos de segurança
CREATE OR REPLACE VIEW security_events AS
SELECT 
    id,
    user_id,
    action,
    details,
    metadata,
    severity,
    timestamp
FROM audit_logs 
WHERE type = 'security_event' 
    AND severity >= 2
    AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- View para mudanças de dados
CREATE OR REPLACE VIEW data_changes AS
SELECT 
    id,
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    timestamp
FROM audit_logs 
WHERE type = 'data_change'
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- Função para obter estatísticas de auditoria por período
CREATE OR REPLACE FUNCTION get_audit_stats_by_period(
    start_date TIMESTAMP,
    end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    type VARCHAR(50),
    severity INTEGER,
    count BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.type,
        al.severity,
        COUNT(*) as count,
        COUNT(DISTINCT al.user_id) as unique_users
    FROM audit_logs al
    WHERE al.timestamp BETWEEN start_date AND end_date
    GROUP BY al.type, al.severity
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Logs de auditoria para rastreamento de ações e eventos do sistema';
COMMENT ON COLUMN audit_logs.type IS 'Tipo de evento: user_action, security_event, data_change, api_request, auth_event, payment_event, system_event';
COMMENT ON COLUMN audit_logs.severity IS 'Nível de severidade: 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=CRITICAL';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes específicos da ação em formato JSON';
COMMENT ON COLUMN audit_logs.metadata IS 'Metadados adicionais como IP, User-Agent, etc.';

COMMENT ON TABLE audit_config IS 'Configurações do sistema de auditoria';
COMMENT ON TABLE audit_alerts IS 'Configuração de alertas de auditoria';

COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Remove logs de auditoria antigos baseado na configuração de retenção';
COMMENT ON FUNCTION get_audit_stats_by_period(TIMESTAMP, TIMESTAMP) IS 'Retorna estatísticas de auditoria para um período específico';
