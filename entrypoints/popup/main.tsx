import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * React 应用入口文件
 * 初始化 React 应用并挂载到 DOM
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
