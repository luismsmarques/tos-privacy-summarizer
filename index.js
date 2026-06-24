// Entrypoint para Vercel — reexporta a app Express do backend.
// Import estático (não dinâmico) para que o file-tracer da Vercel inclua
// backend/server.js e as suas dependências no bundle da função.
export { default } from './backend/server.js';
