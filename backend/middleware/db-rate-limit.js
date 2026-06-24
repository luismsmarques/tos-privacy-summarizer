// Middleware de rate limiting com store partilhado (Postgres).
// Ao contrário do express-rate-limit em memória, o limite é partilhado entre
// instâncias serverless — essencial num ambiente onde cada pedido pode atingir
// uma função diferente.
import db from '../utils/database.js';

export function dbRateLimit({ windowMs, max, keyGenerator }) {
    return async (req, res, next) => {
        try {
            const key = keyGenerator(req);
            const { allowed, remaining, resetMs } = await db.hitRateLimit(key, windowMs, max);

            res.set('X-RateLimit-Limit', String(max));
            res.set('X-RateLimit-Remaining', String(remaining));

            if (!allowed) {
                const retryAfter = Math.ceil(resetMs / 1000);
                res.set('Retry-After', String(retryAfter));
                return res.status(429).json({
                    error: 'Demasiados pedidos. Tente novamente mais tarde.',
                    retryAfterSeconds: retryAfter
                });
            }

            next();
        } catch (error) {
            // Fail-open: não bloquear tráfego por causa do limitador.
            console.warn('⚠️ dbRateLimit falhou (ignorado):', error.message);
            next();
        }
    };
}

export default dbRateLimit;
