import { useState } from 'react';
import { analyzeProfile, ApiError, regenerateRoast } from './api/client';
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

  const [isSwitchingBrutality, setIsSwitchingBrutality] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [roastVariant, setRoastVariant] = useState(0);
  const [isRegeneratingRoast, setIsRegeneratingRoast] = useState(false);

  const handleRegenerateRoast = async () => {
    if (!analysisData || isRegeneratingRoast) return;
    const nextVariant = roastVariant + 1;
    setIsRegeneratingRoast(true);
    try {
      const result = await regenerateRoast(username, role, brutality, nextVariant);
      setRoastVariant(nextVariant);
      setAnalysisData((prev) => {
        if (!prev || !prev.ai) return prev;
        return {
          ...prev,
          ai: {
            ...prev.ai,
            roast: result.roast,
            roast_explanation: result.roast_explanation,
            grounding_repos: result.grounding_repos,
            comic_device: result.comic_device || prev.ai.comic_device,
          },
        };
      });
    } catch (err) {
      console.error('Failed to regenerate roast:', err);
    } finally {
      setIsRegeneratingRoast(false);
    }
  };

  const handleBrutalityChange = async (newBrutality: BrutalityLevel) => {
    if (newBrutality === brutality || isSwitchingBrutality) return;
    setBrutality(newBrutality);
    setRoastVariant(0);
    setIsSwitchingBrutality(true);
    try {
      const response = await analyzeProfile(username, role, newBrutality);
      setAnalysisData(response);
    } catch {
      // In case of error, preserve the current analysis data to avoid interrupting user session
    } finally {
      setIsSwitchingBrutality(false);
    }
  };

  const handleRoleChange = async (newRole: TargetRole) => {
    if (newRole === role || isSwitchingRole) return;
    setRole(newRole);
    setRoastVariant(0);
    setIsSwitchingRole(true);
    try {
      const response = await analyzeProfile(username, newRole, brutality);
      setAnalysisData(response);
    } catch {
      // In case of error, preserve existing analysis data
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleReset = () => {
    setView('landing');
    setRoastVariant(0);
    setErrorState(null);
  };

  const handleRetry = () => {
    if (username) {
      setRoastVariant(0);
      executeAnalysis(username, role, brutality);
    } else {
      setView('landing');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans">
      {view === 'landing' && (
        <Landing onAnalyze={executeAnalysis} isLoading={false} />
      )}

      {view === 'loading' && (
        <LoadingScreen username={username} onCancel={handleReset} />
      )}

      {view === 'dashboard' && analysisData && (
        <Dashboard
          data={analysisData}
          currentRole={role}
          currentBrutality={brutality}
          onReset={handleReset}
          onRetryAi={handleRetry}
          onBrutalityChange={handleBrutalityChange}
          isSwitchingBrutality={isSwitchingBrutality}
          onRoleChange={handleRoleChange}
          isSwitchingRole={isSwitchingRole}
          onRegenerateRoast={handleRegenerateRoast}
          isRegeneratingRoast={isRegeneratingRoast}
          roastVariant={roastVariant}
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
