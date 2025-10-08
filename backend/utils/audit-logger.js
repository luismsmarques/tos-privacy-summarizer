// Advanced Audit Logging System for ToS & Privacy Summarizer
// Implements comprehensive audit trails for security, compliance, and debugging

import db from './database.js';
import { performanceMonitor } from './performance.js';

class AuditLogger {
    constructor() {
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };
        
        this.currentLevel = this.logLevels.INFO;
        this.buffer = [];
        this.bufferSize = 100;
        this.flushInterval = 30000; // 30 seconds
        
        // Start periodic flush
        this.startPeriodicFlush();
        
        console.log('📋 Advanced Audit Logger initialized');
    }

    // Log user actions
    async logUserAction(userId, action, details = {}, metadata = {}) {
        const auditEntry = {
            type: 'user_action',
            userId,
            action,
            details: JSON.stringify(details),
            metadata: JSON.stringify(metadata),
            timestamp: new Date().toISOString(),
            severity: this.getActionSeverity(action)
        };

        await this.writeAuditLog(auditEntry);
    }

    // Log security events
    async logSecurityEvent(event, severity, details = {}, metadata = {}) {
        const auditEntry = {
            type: 'security_event',
            userId: details.userId || null,
            action: event,
            details: JSON.stringify(details),
            metadata: JSON.stringify(metadata),
            timestamp: new Date().toISOString(),
            severity: severity
        };

        await this.writeAuditLog(auditEntry);
        
        // Log to console for immediate attention
        if (severity >= this.logLevels.WARN) {
            console.warn(`🚨 Security Event: ${event}`, details);
        }
    }

    // Log data changes
    async logDataChange(table, operation, recordId, oldData, newData, userId, metadata = {}) {
        const auditEntry = {
            type: 'data_change',
            userId,
            action: `${operation}_${table}`,
            tableName: table,
            recordId: recordId.toString(),
            oldValues: JSON.stringify(oldData),
            newValues: JSON.stringify(newData),
            metadata: JSON.stringify(metadata),
            timestamp: new Date().toISOString(),
            severity: this.getDataChangeSeverity(operation)
        };

        await this.writeAuditLog(auditEntry);
    }

    // Log API requests
    async logApiRequest(req, res, responseTime, error = null) {
        const auditEntry = {
            type: 'api_request',
            userId: req.user?.id || null,
            action: `${req.method} ${req.path}`,
            details: JSON.stringify({
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                query: req.query,
                body: this.sanitizeRequestBody(req.body)
            }),
            metadata: JSON.stringify({
                error: error ? error.message : null,
                stack: error ? error.stack : null
            }),
            timestamp: new Date().toISOString(),
            severity: this.getApiRequestSeverity(res.statusCode, error)
        };

        await this.writeAuditLog(auditEntry);
    }

    // Log authentication events
    async logAuthEvent(event, userId, details = {}, metadata = {}) {
        const auditEntry = {
            type: 'auth_event',
            userId,
            action: event,
            details: JSON.stringify(details),
            metadata: JSON.stringify(metadata),
            timestamp: new Date().toISOString(),
            severity: this.getAuthEventSeverity(event)
        };

        await this.writeAuditLog(auditEntry);
    }

    // Log payment events
    async logPaymentEvent(event, userId, amount, details = {}, metadata = {}) {
        const auditEntry = {
            type: 'payment_event',
            userId,
            action: event,
            details: JSON.stringify({
                ...details,
                amount,
                currency: details.currency || 'USD'
            }),
            metadata: JSON.stringify(metadata),
            timestamp: new Date().toISOString(),
            severity: this.getPaymentEventSeverity(event)
        };

        await this.writeAuditLog(auditEntry);
    }

    // Log system events
    async logSystemEvent(event, details = {}, metadata = {}) {
        const auditEntry = {
            type: 'system_event',
            userId: null,
            action: event,
            details: JSON.stringify(details),
            metadata: JSON.stringify(metadata),
            timestamp: new Date().toISOString(),
            severity: this.getSystemEventSeverity(event)
        };

        await this.writeAuditLog(auditEntry);
    }

    // Write audit log to database
    async writeAuditLog(auditEntry) {
        try {
            // Add to buffer for batch processing
            this.buffer.push(auditEntry);
            
            // Flush if buffer is full
            if (this.buffer.length >= this.bufferSize) {
                await this.flushBuffer();
            }
            
            // Immediate write for critical events
            if (auditEntry.severity >= this.logLevels.ERROR) {
                await this.flushBuffer();
            }
        } catch (error) {
            console.error('❌ Failed to write audit log:', error);
            // Fallback to console logging
            console.log('📋 Audit Log (Fallback):', auditEntry);
        }
    }

    // Flush buffer to database
    async flushBuffer() {
        if (this.buffer.length === 0) return;
        
        try {
            const entries = [...this.buffer];
            this.buffer = [];
            
            // Batch insert
            const values = entries.map(entry => [
                entry.type,
                entry.userId,
                entry.action,
                entry.tableName || null,
                entry.recordId || null,
                entry.oldValues || null,
                entry.newValues || null,
                entry.details,
                entry.metadata,
                entry.severity,
                entry.timestamp
            ]);
            
            const query = `
                INSERT INTO audit_logs (
                    type, user_id, action, table_name, record_id, 
                    old_values, new_values, details, metadata, 
                    severity, timestamp
                ) VALUES ${values.map((_, i) => 
                    `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, 
                     $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, 
                     $${i * 11 + 10}, $${i * 11 + 11})`
                ).join(', ')}
            `;
            
            const flatValues = values.flat();
            await db.query(query, flatValues);
            
            console.log(`📋 Flushed ${entries.length} audit logs to database`);
        } catch (error) {
            console.error('❌ Failed to flush audit buffer:', error);
            // Re-add to buffer for retry
            this.buffer.unshift(...entries);
        }
    }

    // Start periodic flush
    startPeriodicFlush() {
        setInterval(() => {
            this.flushBuffer();
        }, this.flushInterval);
    }

    // Get severity levels
    getActionSeverity(action) {
        const criticalActions = ['delete_user', 'change_password', 'admin_access'];
        const warningActions = ['login', 'logout', 'update_profile'];
        
        if (criticalActions.includes(action)) return this.logLevels.CRITICAL;
        if (warningActions.includes(action)) return this.logLevels.WARN;
        return this.logLevels.INFO;
    }

    getDataChangeSeverity(operation) {
        if (operation === 'DELETE') return this.logLevels.CRITICAL;
        if (operation === 'UPDATE') return this.logLevels.WARN;
        return this.logLevels.INFO;
    }

    getApiRequestSeverity(statusCode, error) {
        if (error || statusCode >= 500) return this.logLevels.ERROR;
        if (statusCode >= 400) return this.logLevels.WARN;
        return this.logLevels.INFO;
    }

    getAuthEventSeverity(event) {
        const criticalEvents = ['failed_login', 'suspicious_activity', 'account_locked'];
        const warningEvents = ['login', 'logout', 'password_change'];
        
        if (criticalEvents.includes(event)) return this.logLevels.CRITICAL;
        if (warningEvents.includes(event)) return this.logLevels.WARN;
        return this.logLevels.INFO;
    }

    getPaymentEventSeverity(event) {
        const criticalEvents = ['payment_failed', 'refund', 'chargeback'];
        const warningEvents = ['payment_success', 'subscription_change'];
        
        if (criticalEvents.includes(event)) return this.logLevels.CRITICAL;
        if (warningEvents.includes(event)) return this.logLevels.WARN;
        return this.logLevels.INFO;
    }

    getSystemEventSeverity(event) {
        const criticalEvents = ['system_error', 'database_error', 'service_down'];
        const warningEvents = ['maintenance', 'configuration_change'];
        
        if (criticalEvents.includes(event)) return this.logLevels.CRITICAL;
        if (warningEvents.includes(event)) return this.logLevels.WARN;
        return this.logLevels.INFO;
    }

    // Sanitize request body for logging
    sanitizeRequestBody(body) {
        if (!body) return null;
        
        const sanitized = { ...body };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    // Query audit logs
    async queryAuditLogs(filters = {}) {
        try {
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];
            let paramCount = 0;
            
            if (filters.userId) {
                paramCount++;
                query += ` AND user_id = $${paramCount}`;
                params.push(filters.userId);
            }
            
            if (filters.type) {
                paramCount++;
                query += ` AND type = $${paramCount}`;
                params.push(filters.type);
            }
            
            if (filters.action) {
                paramCount++;
                query += ` AND action ILIKE $${paramCount}`;
                params.push(`%${filters.action}%`);
            }
            
            if (filters.severity) {
                paramCount++;
                query += ` AND severity >= $${paramCount}`;
                params.push(filters.severity);
            }
            
            if (filters.startDate) {
                paramCount++;
                query += ` AND timestamp >= $${paramCount}`;
                params.push(filters.startDate);
            }
            
            if (filters.endDate) {
                paramCount++;
                query += ` AND timestamp <= $${paramCount}`;
                params.push(filters.endDate);
            }
            
            query += ' ORDER BY timestamp DESC';
            
            if (filters.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
            }
            
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Failed to query audit logs:', error);
            throw error;
        }
    }

    // Get audit statistics
    async getAuditStats(timeframe = '24h') {
        try {
            const timeCondition = this.getTimeCondition(timeframe);
            
            const query = `
                SELECT 
                    type,
                    severity,
                    COUNT(*) as count,
                    COUNT(DISTINCT user_id) as unique_users
                FROM audit_logs 
                WHERE timestamp >= $1
                GROUP BY type, severity
                ORDER BY count DESC
            `;
            
            const result = await db.query(query, [timeCondition]);
            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get audit stats:', error);
            throw error;
        }
    }

    getTimeCondition(timeframe) {
        const now = new Date();
        switch (timeframe) {
            case '1h':
                return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            default:
                return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        }
    }
}

// Singleton instance
const auditLogger = new AuditLogger();

// Export convenience functions
export const logUserAction = (userId, action, details, metadata) => 
    auditLogger.logUserAction(userId, action, details, metadata);

export const logSecurityEvent = (event, severity, details, metadata) => 
    auditLogger.logSecurityEvent(event, severity, details, metadata);

export const logDataChange = (table, operation, recordId, oldData, newData, userId, metadata) => 
    auditLogger.logDataChange(table, operation, recordId, oldData, newData, userId, metadata);

export const logApiRequest = (req, res, responseTime, error) => 
    auditLogger.logApiRequest(req, res, responseTime, error);

export const logAuthEvent = (event, userId, details, metadata) => 
    auditLogger.logAuthEvent(event, userId, details, metadata);

export const logPaymentEvent = (event, userId, amount, details, metadata) => 
    auditLogger.logPaymentEvent(event, userId, amount, details, metadata);

export const logSystemEvent = (event, details, metadata) => 
    auditLogger.logSystemEvent(event, details, metadata);

export const queryAuditLogs = (filters) => auditLogger.queryAuditLogs(filters);
export const getAuditStats = (timeframe) => auditLogger.getAuditStats(timeframe);

export default auditLogger;
