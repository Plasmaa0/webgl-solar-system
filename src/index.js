import React from 'react';
import ReactDOM from 'react-dom/client';
import WebGLCanvas from './WebGLCanvas'

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  // <React.StrictMode>
      <WebGLCanvas height={400} width={400}/>
  // </React.StrictMode>
);
