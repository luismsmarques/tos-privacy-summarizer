// Database utilities for Neon Postgres (serverless-friendly).
//
// Em serverless (Vercel) cada função é efémera e congela entre invocações,
// por isso pools resilientes com retry/keep-alive, caches em memória e
// otimizadores de queries não persistem nem trazem benefício real. Usamos
// um Pool `pg` simples, de escopo de módulo, reaproveitado entre invocações
// "quentes" da mesma instância.
import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

function getPool() {
    if (pool) return pool;

    const databaseUrl = process.env.ANALYTICS_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('Database URL not configured (defina ANALYTICS_URL ou DATABASE_URL)');
    }

    pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 1,                          // uma ligação por instância serverless
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true
    });

    // Evita que erros de ligação inativa derrubem o processo.
    pool.on('error', (err) => {
        console.error('❌ Erro inesperado no pool da base de dados:', err.message);
    });

    return pool;
}

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.pool = getPool();
            // Validar conectividade com uma query leve
            await this.pool.query('SELECT 1');
            this.isConnected = true;
            console.log('✅ Database connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    async query(text, params) {
        try {
            return await getPool().query(text, params);
        } catch (error) {
            console.error('❌ Database query failed:', error.message);
            throw error;
        }
    }

    // User operations
    async createUser(userId, deviceId = null) {
        try {
            const result = await this.query(`
                INSERT INTO users (user_id, device_id, credits)
                VALUES ($1, $2, 5)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    last_seen = CURRENT_TIMESTAMP,
                    device_id = COALESCE($2, users.device_id)
                RETURNING *
            `, [userId, deviceId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUser(userId) {
        try {
            const result = await this.query(
                'SELECT * FROM users WHERE user_id = $1',
                [userId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async updateUserLastSeen(userId) {
        try {
            await this.query(`
                UPDATE users 
                SET last_seen = CURRENT_TIMESTAMP, total_requests = total_requests + 1
                WHERE user_id = $1
            `, [userId]);
        } catch (error) {
            console.error('Error updating user last seen:', error);
            throw error;
        }
    }

    async decrementUserCredits(userId) {
        try {
            const result = await this.query(`
                UPDATE users 
                SET credits = GREATEST(credits - 1, 0)
                WHERE user_id = $1
                RETURNING credits
            `, [userId]);
            
            const newCredits = result.rows[0]?.credits || 0;
            return newCredits;
        } catch (error) {
            console.error('Error decrementing credits:', error);
            throw error;
        }
    }

    // Summary operations
    async createSummary(summaryId, userId, success, duration, textLength, url, summary, title = null, providedRatings = null) {
        try {
            console.log(`🗄️ createSummary chamado: summaryId=${summaryId}, userId=${userId}, success=${success}, duration=${duration}, textLength=${textLength}, url=${url}, summary=${summary ? summary.substring(0, 100) + '...' : 'null'}`);
            console.log(`🗄️ Summary content length: ${summary ? summary.length : 0}`);
            
            // Calcular word_count baseado no summary
            const wordCount = summary ? summary.split(/\s+/).length : 0;
            const processingTime = Math.round(duration / 1000.0 * 100) / 100; // Arredondar para 2 casas decimais
            
            console.log(`🗄️ Calculated wordCount: ${wordCount}, processingTime: ${processingTime}`);
            
            // Detectar tipo de documento baseado no conteúdo
            const documentType = this.detectDocumentType(summary || '');
            
            // Preferir os ratings fornecidos pelo Gemini; recorrer à
            // heurística apenas se não vierem scores válidos.
            const ratings = this.normalizeRatings(providedRatings)
                || this.calculateRatings(summary || '', textLength, documentType);
            
            // Primeiro, tentar inserir com todas as colunas (schema completo)
            try {
                const query = `
                    INSERT INTO summaries (
                        summary_id, user_id, success, duration, text_length, 
                        url, summary, title, document_type, word_count, 
                        processing_time, rating_complexidade, rating_boas_praticas, risk_score
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *
                `;
                const params = [
                    summaryId, userId, success, duration, textLength, 
                    url, summary, title, documentType, wordCount, 
                    processingTime, ratings.complexidade, ratings.boas_praticas, ratings.risk_score
                ];
                
                console.log(`🗄️ Tentando inserção completa com todas as colunas`);
                const result = await this.query(query, params);
                console.log(`🗄️ Inserção completa bem-sucedida`);
                
                // Update user summary count
                if (success) {
                    await this.updateUserSummaryCount(userId);
                }
                
                return result.rows[0];
                
            } catch (fullInsertError) {
                console.log(`⚠️ Inserção completa falhou, tentando inserção básica: ${fullInsertError.message}`);
                
                // Se falhar, tentar inserção básica (schema mínimo)
                const basicQuery = `
                    INSERT INTO summaries (summary_id, user_id, success, duration, text_length)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `;
                const basicParams = [summaryId, userId, success, duration, textLength];
                
                console.log(`🗄️ Tentando inserção básica`);
                const result = await this.query(basicQuery, basicParams);
                console.log(`🗄️ Inserção básica bem-sucedida`);
                
                // Update user summary count
                if (success) {
                    await this.updateUserSummaryCount(userId);
                }
                
                return result.rows[0];
            }
            
        } catch (error) {
            console.error('❌ Error creating summary:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                summaryId,
                userId,
                url,
                summary: summary ? summary.substring(0, 100) + '...' : 'null'
            });
            throw error;
        }
    }
    
    // Função auxiliar para detectar tipo de documento
    detectDocumentType(text) {
        if (!text) return 'unknown';
        
        const lowerText = text.toLowerCase();
        
        // Palavras-chave para Política de Privacidade
        const privacyKeywords = [
            'privacy policy', 'política de privacidade', 'privacidade',
            'personal data', 'dados pessoais', 'data protection',
            'cookie policy', 'política de cookies', 'gdpr'
        ];
        
        // Palavras-chave para Termos de Serviço
        const termsKeywords = [
            'terms of service', 'termos de serviço', 'terms and conditions',
            'user agreement', 'contrato de utilizador', 'service agreement',
            'terms of use', 'condições de uso'
        ];
        
        const privacyCount = privacyKeywords.reduce((count, keyword) => {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            return count + (lowerText.match(regex) || []).length;
        }, 0);
        
        const termsCount = termsKeywords.reduce((count, keyword) => {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            return count + (lowerText.match(regex) || []).length;
        }, 0);
        
        if (privacyCount > termsCount && privacyCount > 0) {
            return 'privacy_policy';
        } else if (termsCount > privacyCount && termsCount > 0) {
            return 'terms_of_service';
        }
        
        return 'unknown';
    }
    
    // Função auxiliar para atualizar contador de resumos
    async updateUserSummaryCount(userId) {
        try {
            console.log(`🗄️ Atualizando contador de resumos para userId: ${userId}`);
            await this.query(`
                UPDATE users 
                SET summaries_generated = summaries_generated + 1
                WHERE user_id = $1
            `, [userId]);
            console.log(`🗄️ Contador de resumos atualizado`);
        } catch (error) {
            console.error('❌ Erro ao atualizar contador de resumos:', error);
            // Não falhar o processo principal por causa deste erro
        }
    }

    async getSummary(summaryId) {
        try {
            const result = await this.query(
                'SELECT * FROM summaries WHERE summary_id = $1',
                [summaryId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting summary:', error);
            throw error;
        }
    }

    // Obter histórico de resumos de um utilizador (com paginação)
    async getUserSummaries(userId, limit = 50, offset = 0) {
        try {
            const result = await this.query(`
                SELECT * FROM summaries
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);
            return result.rows;
        } catch (error) {
            console.error('Error getting user summaries:', error);
            throw error;
        }
    }

    // Obter estatísticas de resumos de um utilizador
    async getUserSummaryStats(userId) {
        try {
            const result = await this.query(`
                SELECT 
                    COUNT(*) as total_summaries,
                    COUNT(CASE WHEN success = true THEN 1 END) as successful_summaries,
                    COUNT(CASE WHEN document_type = 'privacy_policy' THEN 1 END) as privacy_policies,
                    COUNT(CASE WHEN document_type = 'terms_of_service' THEN 1 END) as terms_of_service,
                    COUNT(CASE WHEN document_type = 'unknown' THEN 1 END) as unknown_docs,
                    ROUND(AVG(duration) / 1000.0, 2) as avg_processing_time,
                    ROUND(AVG(word_count), 0) as avg_word_count,
                    MAX(created_at) as last_summary_date
                FROM summaries 
                WHERE user_id = $1
            `, [userId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error getting user summary stats:', error);
            throw error;
        }
    }

    // Request logging
    async logRequest(method, path, statusCode, duration, userAgent, ipAddress, userId = null) {
        try {
            await this.query(`
                INSERT INTO requests (method, path, status_code, duration, user_agent, ip_address, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [method, path, statusCode, duration, userAgent, ipAddress, userId]);
        } catch (error) {
            console.error('Error logging request:', error);
            // Don't throw - logging shouldn't break the app
        }
    }

    // Performance tracking
    async updatePerformanceMetrics(hour, requests, avgResponseTime, errors, totalDuration) {
        try {
            await this.query(`
                INSERT INTO performance_hourly (hour, date, requests, avg_response_time, errors, total_duration)
                VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
                ON CONFLICT (hour, date)
                DO UPDATE SET
                    requests = performance_hourly.requests + $2,
                    total_duration = performance_hourly.total_duration + $5,
                    avg_response_time = (performance_hourly.avg_response_time * performance_hourly.requests + $3 * $2) / (performance_hourly.requests + $2),
                    errors = performance_hourly.errors + $4
            `, [hour, requests, avgResponseTime, errors, totalDuration]);
        } catch (error) {
            console.error('Error updating performance metrics:', error);
            // Don't throw - metrics shouldn't break the app
        }
    }

    // Analytics queries
    async getAnalyticsOverview() {
        try {
            const result = await this.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM summaries WHERE success = true) as successful_summaries,
                    (SELECT COUNT(*) FROM summaries WHERE success = false) as failed_summaries,
                    (SELECT AVG(duration) FROM summaries WHERE success = true) as avg_duration,
                    (SELECT COUNT(*) FROM requests WHERE timestamp >= CURRENT_DATE) as today_requests
            `);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting analytics overview:', error);
            throw error;
        }
    }

    async getAnalyticsUsers() {
        try {
            const result = await this.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today,
                    COUNT(CASE WHEN last_seen >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_week,
                    COUNT(CASE WHEN last_seen >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_month,
                    AVG(total_requests) as avg_requests_per_user,
                    AVG(summaries_generated) as avg_summaries_per_user
                FROM users
            `);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting analytics users:', error);
            throw error;
        }
    }

    async getAnalyticsSummaries() {
        try {
            const result = await this.query(`
                SELECT 
                    COUNT(*) as total_summaries,
                    COUNT(CASE WHEN success = true THEN 1 END) as successful,
                    COUNT(CASE WHEN success = false THEN 1 END) as failed,
                    AVG(CASE WHEN success = true THEN duration END) as avg_duration,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_summaries,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_summaries
                FROM summaries
            `);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting analytics summaries:', error);
            throw error;
        }
    }

    async getAnalyticsPerformance() {
        try {
            const result = await this.query(`
                SELECT 
                    AVG(duration) as avg_response_time,
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_requests
                FROM requests
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting analytics performance:', error);
            throw error;
        }
    }

    async getAnalyticsHourly() {
        try {
            const result = await this.query(`
                SELECT 
                    hour,
                    requests,
                    avg_response_time,
                    errors
                FROM performance_hourly
                WHERE date >= CURRENT_DATE - INTERVAL '7 days'
                ORDER BY date DESC, hour DESC
                LIMIT 168
            `);
            return result.rows;
        } catch (error) {
            console.error('Error getting analytics hourly:', error);
            throw error;
        }
    }

    async getAnalyticsDaily() {
        try {
            const result = await this.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as requests,
                    AVG(duration) as avg_response_time,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors
                FROM requests
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);
            return result.rows;
        } catch (error) {
            console.error('Error getting analytics daily:', error);
            throw error;
        }
    }

    // Atualizar créditos do utilizador
    async updateUserCredits(userId, creditsToAdd) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const query = `
                INSERT INTO users (user_id, credits, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    credits = users.credits + $2,
                    updated_at = NOW()
                RETURNING credits
            `;

            const result = await this.query(query, [userId, creditsToAdd]);
            
            if (result.rows.length > 0) {
                const newBalance = result.rows[0].credits;
                console.log(`✅ Créditos atualizados: ${creditsToAdd} adicionados ao utilizador ${userId}. Novo saldo: ${newBalance}`);
                return newBalance;
            } else {
                throw new Error('Falha ao atualizar créditos');
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar créditos:', error);
            throw error;
        }
    }

    // Obter créditos do utilizador
    async getUserCredits(userId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const query = 'SELECT credits FROM users WHERE user_id = $1';
            const result = await this.query(query, [userId]);
            
            if (result.rows.length > 0) {
                return result.rows[0].credits;
            } else {
                // Utilizador não existe, retornar créditos padrão
                return 5;
            }

        } catch (error) {
            console.error('❌ Erro ao obter créditos:', error);
            return 5; // Fallback para créditos padrão
        }
    }

    async close() {
        if (pool) {
            await pool.end();
            pool = null;
            this.pool = null;
            this.isConnected = false;
            console.log('Database connection closed');
        }
    }

    // Normalizar ratings fornecidos externamente (ex.: pelo Gemini).
    // Devolve null se não forem números válidos, para acionar o fallback.
    normalizeRatings(ratings) {
        if (!ratings) return null;
        const clamp = (v) => Math.min(Math.max(Math.round(Number(v)), 1), 10);
        const complexidade = clamp(ratings.complexidade);
        const boas_praticas = clamp(ratings.boas_praticas);
        const risk_score = clamp(ratings.risk_score);
        if (![complexidade, boas_praticas, risk_score].every(Number.isFinite)) {
            return null;
        }
        return { complexidade, boas_praticas, risk_score };
    }

    // Calcular ratings de complexidade e boas práticas (heurística de fallback)
    calculateRatings(summary, textLength, documentType) {
        // Rating de Complexidade (1-10)
        let complexidade = 1;
        
        // Baseado no tamanho do texto
        if (textLength > 10000) complexidade += 3;
        else if (textLength > 5000) complexidade += 2;
        else if (textLength > 2000) complexidade += 1;
        
        // Baseado no tipo de documento
        if (documentType === 'privacy_policy') complexidade += 2;
        else if (documentType === 'terms_of_service') complexidade += 1;
        
        // Baseado no conteúdo do resumo (palavras-chave complexas)
        const complexKeywords = ['jurisdição', 'arbitragem', 'litígio', 'responsabilidade', 'indenização', 'cláusula', 'penalidade', 'multa'];
        const complexCount = complexKeywords.filter(keyword => 
            summary.toLowerCase().includes(keyword)
        ).length;
        complexidade += Math.min(complexCount, 3);
        
        // Limitar entre 1-10
        complexidade = Math.min(Math.max(complexidade, 1), 10);
        
        // Rating de Boas Práticas (1-10, onde 10 é melhor)
        let boas_praticas = 5; // Base neutra
        
        // Indicadores de boas práticas
        const goodPractices = ['transparência', 'clareza', 'direitos do utilizador', 'proteção de dados', 'consentimento'];
        const goodCount = goodPractices.filter(practice => 
            summary.toLowerCase().includes(practice)
        ).length;
        boas_praticas += goodCount;
        
        // Indicadores de más práticas
        const badPractices = ['alteração unilateral', 'responsabilidade limitada', 'dados pessoais', 'terceiros', 'marketing'];
        const badCount = badPractices.filter(practice => 
            summary.toLowerCase().includes(practice)
        ).length;
        boas_praticas -= badCount;
        
        // Limitar entre 1-10
        boas_praticas = Math.min(Math.max(boas_praticas, 1), 10);
        
        // Risk Score (1-10, onde 10 é mais arriscado)
        // Combinação de alta complexidade e baixas boas práticas
        const risk_score = Math.round((complexidade + (10 - boas_praticas)) / 2);
        
        console.log(`📊 Ratings calculados: complexidade=${complexidade}, boas_praticas=${boas_praticas}, risk_score=${risk_score}`);
        
        return {
            complexidade,
            boas_praticas,
            risk_score: Math.min(Math.max(risk_score, 1), 10)
        };
    }
}

// Singleton instance
const db = new Database();
export default db;