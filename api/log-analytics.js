// API de Logging Simples - Guarda dados em ficheiros JSON
import fs from 'fs';
import path from 'path';

// Caminho para dados
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : './data';

// Garantir que o diretório existe
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Carregar dados de um ficheiro JSON
function loadData(filename) {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`Erro ao carregar ${filename}:`, error);
    return [];
  }
}

// Guardar dados num ficheiro JSON
function saveData(filename, data) {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Erro ao guardar ${filename}:`, error);
    return false;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, url, documentType, textLength, responseTime, success, errorMessage } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];

    // Carregar dados existentes
    let users = loadData('users.json');
    let summaries = loadData('summaries.json');

    // Verificar se o utilizador existe, se não criar
    let user = users.find(u => u.deviceId === userId);
    if (!user) {
      user = {
        deviceId: userId,
        createdAt: date,
        lastActive: date,
        totalSummaries: 0,
        creditsUsed: 0
      };
      users.push(user);
    }

    // Atualizar utilizador
    user.lastActive = date;
    user.totalSummaries += 1;
    user.creditsUsed += 1;

    // Criar entrada de resumo
    const summary = {
      id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      url: url || null,
      documentType: documentType || 'other',
      textLength: textLength || 0,
      responseTime: responseTime || 0,
      success: success !== false,
      errorMessage: errorMessage || null,
      timestamp: timestamp,
      date: date
    };

    summaries.push(summary);

    // Manter apenas últimos 1000 resumos para evitar ficheiros muito grandes
    if (summaries.length > 1000) {
      summaries = summaries.slice(-1000);
    }

    // Guardar dados
    const usersSaved = saveData('users.json', users);
    const summariesSaved = saveData('summaries.json', summaries);

    if (!usersSaved || !summariesSaved) {
      return res.status(500).json({ error: 'Failed to save data' });
    }

    res.json({
      success: true,
      message: 'Analytics logged successfully',
      summaryId: summary.id,
      debug: {
        totalUsers: users.length,
        totalSummaries: summaries.length,
        dataDir: DATA_DIR
      }
    });

  } catch (error) {
    console.error('Logging API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log analytics',
      details: error.message
    });
  }
}
