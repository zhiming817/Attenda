// Polyfills for browser compatibility
import { Buffer } from 'buffer';

window.Buffer = Buffer;

// Process polyfill
if (typeof window.process === 'undefined') {
  window.process = {
    env: {},
    argv: [],
    browser: true,
    version: '',
    versions: {},
    platform: 'browser',
    nextTick: (fn) => setTimeout(fn, 0),
    cwd: () => '/',
    chdir: () => {},
    umask: () => 0,
    hrtime: () => [0, 0],
    uptime: () => 0,
    kill: () => {},
    exit: () => {},
    on: () => {},
    addListener: () => {},
    once: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    setMaxListeners: () => {},
    getMaxListeners: () => 10,
    listeners: () => [],
    emit: () => false,
    listenerCount: () => 0,
    prependListener: () => {},
    prependOnceListener: () => {},
    eventNames: () => []
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import '@mysten/dapp-kit/dist/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);