import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import catalogHandler from './api/catalog.js';
import metadataHandler from './api/metadata.js';
import seriesHandler from './api/metadata/series.js';
import streamHandler from './api/stream.js';
import statsHandler from './api/stats.js';
import chatHandler from './api/chat.js';
import watchProgressHandler from './api/watch-progress.js';

function serverlessApiPlugin() {
  const routes = {
    '/api/catalog': catalogHandler,
    '/api/metadata': metadataHandler,
    '/api/metadata/series': seriesHandler,
    '/api/stream': streamHandler,
    '/api/stats': statsHandler,
    '/api/chat': chatHandler,
    '/api/watch-progress': watchProgressHandler
  };

  return {
    name: 'serverless-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, 'http://localhost:5173');
        const pathname = urlObj.pathname;

        const handler = routes[pathname];
        if (handler) {
          req.query = Object.fromEntries(urlObj.searchParams);
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = {};
              }
              try {
                await handler(req, res);
              } catch (err) {
                console.error('[Serverless Dev Plugin Error]:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          try {
            await handler(req, res);
          } catch (err) {
            console.error('[Serverless Dev Plugin Error]:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serverlessApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
});
