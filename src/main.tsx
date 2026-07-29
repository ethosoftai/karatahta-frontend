import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/theme.css';

window.KARA_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || window.KARA_API_BASE_URL
  || (import.meta.env.DEV ? '' : 'https://karatahta-backend-production.up.railway.app')
).replace(/\/$/, '');

window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']]
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  }
};

const root = document.querySelector<HTMLDivElement>('#root');

if (!root) {
  throw new Error('Kara Tahta root elementi bulunamadı.');
}

createRoot(root).render(<App />);
