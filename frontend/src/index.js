import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ResizeObserver fires this benign warning when its callbacks can't all run
// in one animation frame. React dev overlay incorrectly surfaces it as fatal.
// Suppress via both mechanisms the overlay uses.
const _origOnError = window.onerror;
window.onerror = function(message, ...args) {
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) return true;
  return _origOnError ? _origOnError.call(this, message, ...args) : false;
};
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
