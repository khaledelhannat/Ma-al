import { useRoutes } from 'react-router-dom';
import { routes } from './routes/routes';

export function App() {
  return useRoutes(routes);
}
