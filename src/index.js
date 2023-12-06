import React from 'react';
import ReactDOM from 'react-dom/client';
import WebGLCanvas from './WebGLCanvas'

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  // <React.StrictMode>
  <WebGLCanvas style="width: 100%; height: 100%" />
  // </React.StrictMode>
);
