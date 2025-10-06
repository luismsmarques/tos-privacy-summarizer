#!/usr/bin/env node

// Script de teste completo - ToS Privacy Summarizer
// 
// Este script executa todos os testes de debug disponíveis
// para verificar o estado completo do sistema.
//
// Uso: node run-all-tests.js
// Requisitos: Backend rodando e dependências instaladas

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllTests() {
    console.log('🚀 Executando todos os testes de debug...');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-PT'));
    console.log('=' .repeat(60));
    
    try {
        // Teste 1: Base de dados
        console.log('\n1️⃣ TESTE DE BASE DE DADOS');
        console.log('-'.repeat(40));
        
        try {
            const { stdout: dbOutput, stderr: dbError } = await execAsync(
                'node test-database.js',
                { cwd: __dirname }
            );
            
            if (dbError) {
                console.log('❌ Erro no teste de base de dados:');
                console.log(dbError);
            } else {
                console.log('✅ Teste de base de dados concluído');
                console.log(dbOutput);
            }
        } catch (error) {
            console.log('❌ Falha no teste de base de dados:', error.message);
        }
        
        // Teste 2: API
        console.log('\n2️⃣ TESTE DE API');
        console.log('-'.repeat(40));
        
        try {
            const { stdout: apiOutput, stderr: apiError } = await execAsync(
                'node test-api.js',
                { cwd: __dirname }
            );
            
            if (apiError) {
                console.log('❌ Erro no teste de API:');
                console.log(apiError);
            } else {
                console.log('✅ Teste de API concluído');
                console.log(apiOutput);
            }
        } catch (error) {
            console.log('❌ Falha no teste de API:', error.message);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Todos os testes executados');
        console.log('📊 Verifique os resultados acima para identificar problemas');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

// Verificar se estamos no diretório correto
const currentDir = process.cwd();
const expectedDir = path.join(__dirname);

if (currentDir !== expectedDir) {
    console.log('⚠️ Executando de diretório incorreto');
    console.log('📁 Diretório atual:', currentDir);
    console.log('📁 Diretório esperado:', expectedDir);
    console.log('🔄 Mudando para o diretório correto...');
    process.chdir(expectedDir);
}

runAllTests().catch(console.error);
