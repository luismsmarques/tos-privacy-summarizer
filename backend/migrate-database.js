#!/usr/bin/env node

// Script para migrar a base de dados e adicionar colunas em falta
// Execute este script para corrigir o problema das colunas em falta

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migração da base de dados...');
    
    // Verificar se as colunas já existem
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'summaries' 
      AND column_name IN ('url', 'summary', 'updated_at')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('Colunas existentes:', existingColumns);
    
    // Adicionar colunas em falta
    if (!existingColumns.includes('url')) {
      console.log('➕ Adicionando coluna url...');
      await client.query('ALTER TABLE summaries ADD COLUMN url TEXT');
    }
    
    if (!existingColumns.includes('summary')) {
      console.log('➕ Adicionando coluna summary...');
      await client.query('ALTER TABLE summaries ADD COLUMN summary TEXT');
    }
    
    if (!existingColumns.includes('updated_at')) {
      console.log('➕ Adicionando coluna updated_at...');
      await client.query('ALTER TABLE summaries ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    }
    
    // Verificar se a função update_updated_at_column existe
    const checkFunction = await client.query(`
      SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    `);
    
    if (checkFunction.rows.length === 0) {
      console.log('➕ Criando função update_updated_at_column...');
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
    }
    
    // Verificar se o trigger existe
    const checkTrigger = await client.query(`
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_summaries_updated_at'
    `);
    
    if (checkTrigger.rows.length === 0) {
      console.log('➕ Criando trigger update_summaries_updated_at...');
      await client.query(`
        CREATE TRIGGER update_summaries_updated_at 
        BEFORE UPDATE ON summaries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    // Atualizar registros existentes
    console.log('🔄 Atualizando registros existentes...');
    await client.query(`
      UPDATE summaries 
      SET updated_at = created_at 
      WHERE updated_at IS NULL
    `);
    
    console.log('✅ Migração concluída com sucesso!');
    
    // Verificar a estrutura final da tabela
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'summaries' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura final da tabela summaries:');
    finalCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar migração
runMigration()
  .then(() => {
    console.log('\n🎉 Migração executada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na migração:', error);
    process.exit(1);
  });
