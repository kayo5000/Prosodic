import { BrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import './styles/theme.css';
import './styles/globals.css';

export default function App() {
  return (
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}
