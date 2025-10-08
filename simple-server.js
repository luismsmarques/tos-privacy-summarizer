#!/usr/bin/env node

// Servidor local simples para servir arquivos HTML
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // Configurar CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    let filePath = req.url === '/' ? '/history.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Security check
    if (filePath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.html' ? 'text/html' : 
                           ext === '.js' ? 'text/javascript' : 
                           ext === '.css' ? 'text/css' : 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado em http://localhost:${PORT}`);
    console.log(`📁 Diretório: ${__dirname}`);
    console.log(`🌐 Teste: http://localhost:${PORT}/history.html`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Parando servidor...');
    server.close(() => {
        console.log('✅ Servidor parado');
        process.exit(0);
    });
});
