import { describe, it, expect } from 'vitest';
import { detectDocumentType } from '../utils/document-type.js';

describe('detectDocumentType', () => {
    it('deteta política de privacidade', () => {
        expect(detectDocumentType(
            'This Privacy Policy explains how we collect your personal data and our data protection practices.'
        )).toBe('privacy_policy');
    });

    it('deteta termos de serviço', () => {
        expect(detectDocumentType(
            'These Terms of Service and user agreement limit our liability and describe acceptable use.'
        )).toBe('terms_of_service');
    });

    it('deteta em português', () => {
        expect(detectDocumentType(
            'Esta Política de Privacidade descreve como tratamos os seus dados pessoais e a proteção de dados.'
        )).toBe('privacy_policy');
    });

    it('devolve unknown para texto irrelevante', () => {
        expect(detectDocumentType('hello world')).toBe('unknown');
    });

    it('devolve unknown para entrada vazia', () => {
        expect(detectDocumentType('')).toBe('unknown');
        expect(detectDocumentType(null)).toBe('unknown');
    });
});
