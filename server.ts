import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeRouteHandler } from './api/routes/compute.ts';
import { createUserHandler } from './api/admin/create-user.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Rota de status de configuração de chaves (sem expor secrets)
  app.get('/api/config-status', (req, res) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    const googleServerKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    const googleBrowserKey = process.env.VITE_GOOGLE_MAPS_BROWSER_KEY;

    res.json({
      supabaseConfigured: Boolean(
        supabaseUrl &&
        supabaseKey &&
        !supabaseUrl.includes('seu-projeto') &&
        supabaseUrl.startsWith('https://')
      ),
      googleMapsServerConfigured: Boolean(
        googleServerKey &&
        !googleServerKey.startsWith('AIzaSy_EXEMPLO') &&
        googleServerKey.length > 20
      ),
      googleMapsBrowserConfigured: Boolean(
        googleBrowserKey &&
        !googleBrowserKey.startsWith('AIzaSy_EXEMPLO') &&
        googleBrowserKey.length > 20
      ),
    });
  });

  // Rota de cálculo de rotas (Google Maps computeRoutes)
  app.post('/api/routes/compute', (req, res) => {
    computeRouteHandler(req, res);
  });

  // Rota administrativa para criação direta de usuário e senha
  app.post('/api/admin/create-user', (req, res) => {
    createUserHandler(req, res);
  });

  // Em desenvolvimento, conecta os middlewares do Vite
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Em produção, serve os arquivos estáticos construídos
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Servidor IBEC Express rodando na porta ${PORT} (${isProduction ? 'produção' : 'desenvolvimento'})`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
});
