// index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // Updated import
import App from './App';
import './index.css';
import './styles/App.css';

const root = ReactDOM.createRoot(document.getElementById('root')); // Use createRoot
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
