import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/hooks/NavigationTracker';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from '@/hooks/PageNotFound';
import { AuthProvider, useAuth } from '@/hooks/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SuperAdminBar from '@/components/SuperAdminBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoaders';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show skeleton loading state while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <DashboardSkeleton />;
  }

  // Handle authentication errors
  const currentPath = window.location.pathname.toLowerCase();
  const isPublicPage = currentPath === '/login' || 
                       currentPath === '/register' || 
                       currentPath === '/' ||
                       currentPath === '/roleselection' ||
                       currentPath === '/parentlogin';

  if (authError && !isPublicPage) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app with ErrorBoundary and Suspense code-splitting fallback
  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-indigo-600 focus:text-white focus:rounded-lg shadow-xl font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        Skip to main content
      </a>
      <SuperAdminBar />
      <ErrorBoundary>
        <Suspense fallback={<DashboardSkeleton />}>
          <Routes>
            <Route path="/" element={
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            } />
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path.toLowerCase()}`}
                element={
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                }
              />
            ))}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
