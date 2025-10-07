// 🚨 SISTEMA DE ALERTAS E NOTIFICAÇÕES
// ToS & Privacy Summarizer - Alert System v1.4.0

class AlertSystem {
    constructor(options = {}) {
        this.alertChannels = [];
        this.alertHistory = [];
        this.thresholds = {
            responseTime: 2000, // 2 seconds
            errorRate: 5, // 5%
            healthScore: 80, // 80%
            cacheHitRate: 50, // 50%
            uptime: 99.9 // 99.9%
        };
        this.alertCooldown = 300000; // 5 minutes
        this.lastAlerts = new Map();
    }

    // Add alert channel
    addChannel(channel) {
        this.alertChannels.push(channel);
        console.log(`📢 Alert channel added: ${channel.name}`);
    }

    // Remove alert channel
    removeChannel(channelName) {
        this.alertChannels = this.alertChannels.filter(c => c.name !== channelName);
        console.log(`📢 Alert channel removed: ${channelName}`);
    }

    // Send alert
    async sendAlert(alert) {
        // Check cooldown
        const lastAlert = this.lastAlerts.get(alert.type);
        if (lastAlert && Date.now() - lastAlert < this.alertCooldown) {
            console.log(`⏰ Alert ${alert.type} in cooldown, skipping`);
            return;
        }

        // Add to history
        this.alertHistory.push({
            ...alert,
            timestamp: new Date().toISOString(),
            sent: false
        });

        // Send to all channels
        const results = [];
        for (const channel of this.alertChannels) {
            try {
                const result = await channel.send(alert);
                results.push({ channel: channel.name, success: true, result });
                console.log(`📢 Alert sent via ${channel.name}`);
            } catch (error) {
                results.push({ channel: channel.name, success: false, error: error.message });
                console.error(`❌ Failed to send alert via ${channel.name}:`, error.message);
            }
        }

        // Update history
        const lastAlertIndex = this.alertHistory.length - 1;
        this.alertHistory[lastAlertIndex].sent = results.some(r => r.success);
        this.alertHistory[lastAlertIndex].results = results;

        // Update cooldown
        this.lastAlerts.set(alert.type, Date.now());

        return results;
    }

    // Check metrics and send alerts
    async checkMetrics(metrics) {
        const alerts = [];

        // Check response time
        if (metrics.avgResponseTime > this.thresholds.responseTime) {
            alerts.push({
                type: 'performance',
                severity: 'warning',
                title: 'High Response Time',
                message: `Average response time is ${Math.round(metrics.avgResponseTime)}ms (threshold: ${this.thresholds.responseTime}ms)`,
                metrics: { responseTime: metrics.avgResponseTime }
            });
        }

        // Check error rate
        const errorRate = parseFloat(metrics.errorRate || '0');
        if (errorRate > this.thresholds.errorRate) {
            alerts.push({
                type: 'reliability',
                severity: errorRate > 10 ? 'critical' : 'warning',
                title: 'High Error Rate',
                message: `Error rate is ${errorRate}% (threshold: ${this.thresholds.errorRate}%)`,
                metrics: { errorRate }
            });
        }

        // Check health score
        if (metrics.healthScore < this.thresholds.healthScore) {
            alerts.push({
                type: 'health',
                severity: metrics.healthScore < 50 ? 'critical' : 'warning',
                title: 'Low Health Score',
                message: `Health score is ${metrics.healthScore}% (threshold: ${this.thresholds.healthScore}%)`,
                metrics: { healthScore: metrics.healthScore }
            });
        }

        // Check cache hit rate
        const cacheHitRate = parseFloat(metrics.cacheHitRate || '0');
        if (cacheHitRate < this.thresholds.cacheHitRate) {
            alerts.push({
                type: 'performance',
                severity: 'info',
                title: 'Low Cache Hit Rate',
                message: `Cache hit rate is ${cacheHitRate}% (threshold: ${this.thresholds.cacheHitRate}%)`,
                metrics: { cacheHitRate }
            });
        }

        // Send alerts
        for (const alert of alerts) {
            await this.sendAlert(alert);
        }

        return alerts;
    }

    // Get alert history
    getHistory(limit = 50) {
        return this.alertHistory.slice(-limit);
    }

    // Get alert statistics
    getStats() {
        const total = this.alertHistory.length;
        const sent = this.alertHistory.filter(a => a.sent).length;
        const byType = {};
        const bySeverity = {};

        this.alertHistory.forEach(alert => {
            byType[alert.type] = (byType[alert.type] || 0) + 1;
            bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
        });

        return {
            total,
            sent,
            failed: total - sent,
            successRate: total > 0 ? (sent / total * 100).toFixed(1) + '%' : '0%',
            byType,
            bySeverity
        };
    }

    // Update thresholds
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('📊 Alert thresholds updated:', this.thresholds);
    }
}

// Console alert channel
class ConsoleAlertChannel {
    constructor() {
        this.name = 'console';
    }

    async send(alert) {
        const timestamp = new Date().toLocaleString();
        const severity = alert.severity.toUpperCase();
        
        console.log(`\n🚨 ALERT [${severity}] - ${timestamp}`);
        console.log(`📋 Type: ${alert.type}`);
        console.log(`📝 Title: ${alert.title}`);
        console.log(`💬 Message: ${alert.message}`);
        
        if (alert.metrics) {
            console.log(`📊 Metrics:`, alert.metrics);
        }
        
        console.log('─'.repeat(50));
        
        return { success: true, timestamp };
    }
}

// Email alert channel
class EmailAlertChannel {
    constructor(options = {}) {
        this.name = 'email';
        this.recipients = options.recipients || [];
        this.smtpConfig = options.smtp || null;
    }

    async send(alert) {
        if (!this.smtpConfig || this.recipients.length === 0) {
            throw new Error('Email configuration not set');
        }

        // In a real implementation, you would use nodemailer or similar
        console.log(`📧 Email alert would be sent to: ${this.recipients.join(', ')}`);
        console.log(`📝 Subject: [${alert.severity.toUpperCase()}] ${alert.title}`);
        console.log(`💬 Body: ${alert.message}`);
        
        return { success: true, recipients: this.recipients.length };
    }
}

// Webhook alert channel
class WebhookAlertChannel {
    constructor(options = {}) {
        this.name = 'webhook';
        this.url = options.url;
        this.headers = options.headers || {};
    }

    async send(alert) {
        if (!this.url) {
            throw new Error('Webhook URL not configured');
        }

        const payload = {
            timestamp: new Date().toISOString(),
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            metrics: alert.metrics
        };

        // In a real implementation, you would use fetch or axios
        console.log(`🔗 Webhook alert would be sent to: ${this.url}`);
        console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
        
        return { success: true, url: this.url };
    }
}

// Slack alert channel
class SlackAlertChannel {
    constructor(options = {}) {
        this.name = 'slack';
        this.webhookUrl = options.webhookUrl;
        this.channel = options.channel || '#alerts';
    }

    async send(alert) {
        if (!this.webhookUrl) {
            throw new Error('Slack webhook URL not configured');
        }

        const color = {
            critical: '#FF0000',
            warning: '#FFA500',
            info: '#0080FF'
        }[alert.severity] || '#808080';

        const payload = {
            channel: this.channel,
            username: 'ToS Summarizer Bot',
            icon_emoji: ':robot_face:',
            attachments: [{
                color: color,
                title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
                text: alert.message,
                fields: [
                    {
                        title: 'Type',
                        value: alert.type,
                        short: true
                    },
                    {
                        title: 'Severity',
                        value: alert.severity,
                        short: true
                    },
                    {
                        title: 'Timestamp',
                        value: new Date().toLocaleString(),
                        short: false
                    }
                ],
                footer: 'ToS & Privacy Summarizer',
                ts: Math.floor(Date.now() / 1000)
            }]
        };

        // In a real implementation, you would use fetch or axios
        console.log(`💬 Slack alert would be sent to: ${this.channel}`);
        console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
        
        return { success: true, channel: this.channel };
    }
}

// Export classes
export { 
    AlertSystem, 
    ConsoleAlertChannel, 
    EmailAlertChannel, 
    WebhookAlertChannel, 
    SlackAlertChannel 
};

// Default export
export default AlertSystem;
