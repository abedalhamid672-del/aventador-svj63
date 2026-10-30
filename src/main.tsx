import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/unbounded/800.css';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/global.css';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
