#!/usr/bin/env node

// Script de teste completo - ToS Privacy Summarizer v1.4.0
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
    console.log('🚀 Executando todos os testes de debug v1.4.0...');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-PT'));
    console.log('=' .repeat(60));
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0
    };
    
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
                results.failed++;
            } else {
                console.log('✅ Teste de base de dados concluído');
                console.log(dbOutput);
                results.passed++;
            }
        } catch (error) {
            console.log('❌ Falha no teste de base de dados:', error.message);
            results.failed++;
        }
        results.total++;
        
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
                results.failed++;
            } else {
                console.log('✅ Teste de API concluído');
                console.log(apiOutput);
                results.passed++;
            }
        } catch (error) {
            console.log('❌ Falha no teste de API:', error.message);
            results.failed++;
        }
        results.total++;
        
        // Teste 3: Test Suite Completo (NOVO)
        console.log('\n3️⃣ TEST SUITE COMPLETO');
        console.log('-'.repeat(40));
        
        try {
            const { stdout: suiteOutput, stderr: suiteError } = await execAsync(
                'node test-suite.js',
                { cwd: __dirname }
            );
            
            if (suiteError) {
                console.log('❌ Erro no test suite:');
                console.log(suiteError);
                results.failed++;
            } else {
                console.log('✅ Test suite concluído');
                console.log(suiteOutput);
                results.passed++;
            }
        } catch (error) {
            console.log('❌ Falha no test suite:', error.message);
            results.failed++;
        }
        results.total++;
        
        // Resumo final
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO FINAL DOS TESTES');
        console.log('='.repeat(60));
        console.log(`✅ Passou: ${results.passed}`);
        console.log(`❌ Falhou: ${results.failed}`);
        console.log(`📊 Total: ${results.total}`);
        
        const successRate = (results.passed / results.total * 100).toFixed(1);
        console.log(`🎯 Taxa de sucesso: ${successRate}%`);
        
        if (results.failed === 0) {
            console.log('\n🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ Sistema está saudável e pronto para deploy');
        } else {
            console.log('\n⚠️ ALGUNS TESTES FALHARAM');
            console.log('🔧 Corrija os problemas antes do deploy');
        }
        
        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('• Execute "node continuous-monitor.js" para monitorização contínua');
        console.log('• Verifique os logs do backend para detalhes');
        console.log('• Consulte a documentação para troubleshooting');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
        results.failed++;
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
