import { useState } from 'react';
import { analyzeProfile, ApiError } from './api/client';
import { ErrorState } from './components/ErrorState';
import { LoadingScreen } from './components/LoadingScreen';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import type { AnalyzeResponse, BrutalityLevel, TargetRole } from './types';

export function App() {
  const [view, setView] = useState<'landing' | 'loading' | 'dashboard' | 'error'>('landing');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<TargetRole>('software_engineer');
  const [brutality, setBrutality] = useState<BrutalityLevel>('honest');

  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
  const [errorState, setErrorState] = useState<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null>(null);

  const executeAnalysis = async (
    targetUser: string,
    targetRole: TargetRole,
    targetBrutality: BrutalityLevel
  ) => {
    setUsername(targetUser);
    setRole(targetRole);
    setBrutality(targetBrutality);
    setView('loading');
    setErrorState(null);

    try {
      const response = await analyzeProfile(targetUser, targetRole, targetBrutality);
      setAnalysisData(response);
      setView('dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorState({
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setErrorState({
          code: 'INTERNAL',
          message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        });
      }
      setView('error');
    }
  };

  const handleReset = () => {
    setView('landing');
    setErrorState(null);
  };

  const handleRetry = () => {
    if (username) {
      executeAnalysis(username, role, brutality);
    } else {
      setView('landing');
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
      {view === 'landing' && (
        <Landing onAnalyze={executeAnalysis} isLoading={false} />
      )}

      {view === 'loading' && <LoadingScreen username={username} />}

      {view === 'dashboard' && analysisData && (
        <Dashboard
          data={analysisData}
          currentRole={role}
          currentBrutality={brutality}
          onReset={handleReset}
          onRetryAi={handleRetry}
        />
      )}

      {view === 'error' && errorState && (
        <ErrorState
          code={errorState.code}
          message={errorState.message}
          details={errorState.details}
          onRetry={handleRetry}
          onBack={handleReset}
        />
      )}
    </div>
  );
}

export default App;
