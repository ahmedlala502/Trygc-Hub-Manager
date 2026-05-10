import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LocalDataProvider } from './components/LocalDataContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocalDataProvider>
      <App />
    </LocalDataProvider>
  </StrictMode>,
);
