import { Navigate, type RouteObject } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { TransactionsPage } from '../../features/transactions/TransactionsPage';
import { AssetsPage } from '../../features/assets/AssetsPage';
import { GoalsPage } from '../../features/goals/GoalsPage';
import { WishlistPage } from '../../features/wishlist/WishlistPage';
import { BudgetsPage } from '../../features/budgets/BudgetsPage';
import { SettingsPage } from '../../features/settings/SettingsPage';

/**
 * Application route table. Dashboard is the default route; unknown paths
 * redirect back to it.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
];
