// Entrypoint para Vercel - redireciona para o servidor do backend
// Usar import dinâmico para resolver caminhos relativos corretamente
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar o app do backend
const backendPath = join(__dirname, 'backend', 'server.js');
const backendModule = await import(backendPath);
export default backendModule.default;

