// Database utilities for Neon Postgres
import pkg from 'pg';
const { Pool } = pkg;

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            // Verificar se as variáveis de ambiente estão configuradas
            const databaseUrl = process.env.ANALYTICS_URL || process.env.DATABASE_URL;
            if (!databaseUrl) {
                console.warn('⚠️ ANALYTICS_URL não configurada - usando fallback');
                return false;
            }
            
            // Criar pool de conexões
            this.pool = new Pool({
                connectionString: databaseUrl,
                ssl: {
                    rejectUnauthorized: false
                },
                // Configurações para ambientes serverless
                max: 1, // Máximo 1 conexão por função
                idleTimeoutMillis: 30000, // 30 segundos
                connectionTimeoutMillis: 10000, // 10 segundos
                allowExitOnIdle: true // Permitir sair quando idle
            });
            
            // Test connection
            const client = await this.pool.connect();
            const result = await client.query('SELECT 1 as test');
            client.release();
            
            this.isConnected = true;
            console.log('✅ Database connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    async query(text, params) {
        try {
            // Verificar se temos uma conexão válida
            if (!this.pool || !this.isConnected) {
                console.log('🔄 Reconectando à base de dados...');
                await this.connect();
            }
            
            return await this.pool.query(text, params);
        } catch (error) {
            // Se a conexão foi perdida, tentar reconectar uma vez
            if (error.message.includes('Connection terminated') || 
                error.message.includes('connection') ||
                error.message.includes('ECONNRESET')) {
                
                console.log('⚠️ Conexão perdida, tentando reconectar...');
                this.isConnected = false;
                
                try {
                    await this.connect();
                    return await this.pool.query(text, params);
                } catch (retryError) {
                    console.error('❌ Falha na reconexão:', retryError);
                    throw retryError;
                }
            }
            
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

    async getUserCredits(userId) {
        try {
            const result = await this.query(
                'SELECT credits FROM users WHERE user_id = $1',
                [userId]
            );
            return result.rows[0]?.credits || 5;
        } catch (error) {
            console.error('Error getting user credits:', error);
            return 5; // Default credits
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
            return result.rows[0]?.credits || 0;
        } catch (error) {
            console.error('Error decrementing credits:', error);
            throw error;
        }
    }

    // Summary operations
    async createSummary(summaryId, userId, success, duration, documentType = 'unknown', textLength = 0, url = null, summary = null, title = null, focus = 'privacy') {
        try {
            console.log(`🗄️ createSummary chamado: summaryId=${summaryId}, userId=${userId}, success=${success}, duration=${duration}, documentType=${documentType}, textLength=${textLength}, url=${url}, title=${title}, focus=${focus}`);
            console.log(`🗄️ Summary content length: ${summary ? summary.length : 0}`);
            
            // Calcular word_count baseado no summary
            const wordCount = summary ? summary.split(/\s+/).length : 0;
            const processingTime = Math.round(duration / 1000.0 * 100) / 100; // Arredondar para 2 casas decimais
            
            console.log(`🗄️ Calculated wordCount: ${wordCount}, processingTime: ${processingTime}`);
            
            const query = `
                INSERT INTO summaries (summary_id, user_id, success, duration, document_type, text_length, url, summary)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            const params = [summaryId, userId, success, duration, documentType, textLength, url, summary];
            
            console.log(`🗄️ Executando query: ${query}`);
            console.log(`🗄️ Parâmetros:`, params);
            
            const result = await this.query(query, params);
            console.log(`🗄️ Query executada com sucesso. Resultado:`, result);
            
            // Update user summary count
            if (success) {
                console.log(`🗄️ Atualizando contador de resumos para userId: ${userId}`);
                await this.query(`
                    UPDATE users 
                    SET summaries_generated = summaries_generated + 1
                    WHERE user_id = $1
                `, [userId]);
                console.log(`🗄️ Contador de resumos atualizado`);
            }
            
            console.log(`🗄️ createSummary concluído com sucesso. Retornando:`, result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error creating summary:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                summaryId,
                userId,
                query: `
                    INSERT INTO summaries (summary_id, user_id, success, duration, document_type, text_length, url, summary, title, word_count, processing_time, focus)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `,
                params: [summaryId, userId, success, duration, documentType, textLength, url, summary, title, (summary ? summary.split(/\s+/).length : 0), Math.round(duration / 1000.0 * 100) / 100, focus]
            });
            throw error;
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

    // Obter histórico de resumos de um utilizador
    async getUserSummaries(userId, limit = 50, offset = 0) {
        try {
            const result = await this.query(`
                SELECT 
                    id,
                    summary_id,
                    user_id,
                    url,
                    title,
                    document_type,
                    success,
                    duration,
                    text_length,
                    word_count,
                    summary,
                    processing_time,
                    focus,
                    created_at,
                    updated_at
                FROM summaries 
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

    async getUserSummaries(userId, limit = 10) {
        try {
            const result = await this.query(`
                SELECT * FROM summaries 
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [userId, limit]);
            return result.rows;
        } catch (error) {
            console.error('Error getting user summaries:', error);
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
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('Database connection closed');
        }
    }
}

// Singleton instance
const db = new Database();
export default db;