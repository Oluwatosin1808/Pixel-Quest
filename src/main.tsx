import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p';
import App from './App';
import './style.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
