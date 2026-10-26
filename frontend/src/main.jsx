import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ServerOfflineProvider } from './contexts/ServerOfflineContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ServerOfflineProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ServerOfflineProvider>
    </ThemeProvider>
  </React.StrictMode>
);
