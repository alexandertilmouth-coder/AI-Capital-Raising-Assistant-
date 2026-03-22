import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

const BrandVisibility = React.lazy(() => import('@/pages/dashboard/BrandVisibility'));
const ClosedFunds = React.lazy(() => import('@/pages/dashboard/ClosedFunds'));
const InvestmentMaterials = React.lazy(() => import('@/pages/dashboard/InvestmentMaterials'));
const InvestorDatabase = React.lazy(() => import('@/pages/dashboard/InvestorDatabase'));
const InvestorFeedback = React.lazy(() => import('@/pages/dashboard/InvestorFeedback'));
const TranscriptAnalyser = React.lazy(() => import('@/pages/dashboard/TranscriptAnalyser'));
const StrategyCategorisation = React.lazy(() => import('@/pages/dashboard/StrategyCategorisation'));
const ActiveRaises = React.lazy(() => import('@/pages/dashboard/ActiveRaises'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
          <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
            <p className="text-red-600 text-sm font-mono break-all">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Navigate to="/dashboard/brand-visibility" replace />} />
                <Route path="/dashboard/brand-visibility" element={<Suspense fallback={<PageLoader />}><BrandVisibility /></Suspense>} />
                <Route path="/dashboard/closed-funds" element={<Suspense fallback={<PageLoader />}><ClosedFunds /></Suspense>} />
                <Route path="/dashboard/materials" element={<Suspense fallback={<PageLoader />}><InvestmentMaterials /></Suspense>} />
                <Route path="/dashboard/investor-database" element={<Suspense fallback={<PageLoader />}><InvestorDatabase /></Suspense>} />
                <Route path="/dashboard/feedback" element={<Suspense fallback={<PageLoader />}><InvestorFeedback /></Suspense>} />
                <Route path="/dashboard/transcripts" element={<Suspense fallback={<PageLoader />}><TranscriptAnalyser /></Suspense>} />
                <Route path="/dashboard/strategy" element={<Suspense fallback={<PageLoader />}><StrategyCategorisation /></Suspense>} />
                <Route path="/dashboard/active-raises" element={<Suspense fallback={<PageLoader />}><ActiveRaises /></Suspense>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
