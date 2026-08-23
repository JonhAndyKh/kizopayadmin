import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from 'wouter';

import LoginPage from '@/pages/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import GamesPage from '@/pages/admin/Games';
import SlidesPage from '@/pages/admin/Slides';
import PromosPage from '@/pages/admin/Promos';
import ProductsPage from '@/pages/admin/Products';
import UploadPage from '@/pages/Upload';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const queryClient = new QueryClient();

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // Wait for session restore
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/">
          <Redirect to="/admin" />
        </Route>
        <Route path="/login" component={LoginPage} />
        <Route path="/admin">
          {() => <PrivateRoute component={AdminDashboard} />}
        </Route>
        <Route path="/admin/games">
          {() => <PrivateRoute component={GamesPage} />}
        </Route>
        <Route path="/admin/slides">
          {() => <PrivateRoute component={SlidesPage} />}
        </Route>
        <Route path="/admin/promos">
          {() => <PrivateRoute component={PromosPage} />}
        </Route>
        <Route path="/admin/products">
          {() => <PrivateRoute component={ProductsPage} />}
        </Route>
        <Route path="/upload">
          {() => <PrivateRoute component={UploadPage} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
