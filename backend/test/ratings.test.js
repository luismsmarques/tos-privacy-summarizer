import { describe, it, expect } from 'vitest';
import { extractRatings, stripClassificacao } from '../routes/gemini.js';
import db from '../utils/database.js';

describe('extractRatings', () => {
    it('usa a classificação do Gemini quando válida', () => {
        const json = JSON.stringify({
            resumo_conciso: 'x',
            classificacao: { complexidade: 9, boas_praticas: 3, risco: 8 }
        });
        expect(extractRatings(json, 5000, 'terms_of_service')).toEqual({
            complexidade: 9, boas_praticas: 3, risk_score: 8
        });
    });

    it('limita valores fora da gama 1-10 e arredonda', () => {
        const json = JSON.stringify({
            classificacao: { complexidade: 15, boas_praticas: -2, risco: 8.6 }
        });
        expect(extractRatings(json, 5000, 'terms_of_service')).toEqual({
            complexidade: 10, boas_praticas: 1, risk_score: 9
        });
    });

    it('recorre à heurística se faltar um campo', () => {
        const json = JSON.stringify({ classificacao: { complexidade: 5 } });
        const r = extractRatings(json, 5000, 'terms_of_service');
        // heurística devolve sempre os três campos como inteiros 1-10
        expect(Object.keys(r).sort()).toEqual(['boas_praticas', 'complexidade', 'risk_score']);
        for (const v of Object.values(r)) {
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThanOrEqual(10);
        }
    });

    it('recorre à heurística se a resposta não for JSON', () => {
        const r = extractRatings('isto não é json', 5000, 'privacy_policy');
        expect(r).toHaveProperty('complexidade');
        expect(r).toHaveProperty('boas_praticas');
        expect(r).toHaveProperty('risk_score');
    });
});

describe('stripClassificacao', () => {
    it('remove o bloco classificacao do JSON', () => {
        const json = JSON.stringify({ resumo_conciso: 'x', classificacao: { complexidade: 7 } });
        expect(JSON.parse(stripClassificacao(json))).toEqual({ resumo_conciso: 'x' });
    });

    it('devolve o texto inalterado se não for JSON', () => {
        expect(stripClassificacao('texto solto')).toBe('texto solto');
    });

    it('não altera JSON sem classificacao', () => {
        const json = JSON.stringify({ resumo_conciso: 'x' });
        expect(stripClassificacao(json)).toBe(json);
    });
});

describe('normalizeRatings', () => {
    it('limita e arredonda valores válidos', () => {
        expect(db.normalizeRatings({ complexidade: 12, boas_praticas: 0, risk_score: 5.4 }))
            .toEqual({ complexidade: 10, boas_praticas: 1, risk_score: 5 });
    });

    it('devolve null para entrada inválida', () => {
        expect(db.normalizeRatings({ complexidade: 'abc', boas_praticas: 5, risk_score: 5 })).toBeNull();
        expect(db.normalizeRatings(null)).toBeNull();
    });
});

describe('calculateRatings (heurística de fallback)', () => {
    it('devolve sempre três inteiros entre 1 e 10', () => {
        const r = db.calculateRatings('Política de privacidade com arbitragem e indenização.', 12000, 'privacy_policy');
        for (const k of ['complexidade', 'boas_praticas', 'risk_score']) {
            expect(Number.isInteger(r[k])).toBe(true);
            expect(r[k]).toBeGreaterThanOrEqual(1);
            expect(r[k]).toBeLessThanOrEqual(10);
        }
    });
});
