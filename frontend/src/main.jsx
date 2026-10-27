import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ServerOfflineProvider } from './contexts/ServerOfflineContext';
import { registerServiceWorker } from './registerServiceWorker';

// Registro del Service Worker para PWA y soporte offline
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ServerOfflineProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ServerOfflineProvider>
    </ThemeProvider>
  </React.StrictMode>
);
