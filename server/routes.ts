import { Router, type Request, type Response } from 'express';
import { aiCache } from './cache';
import { fetchUserData } from './githubService';
import { ipRateLimiter, AppError } from './rateLimiter';
import { scoreProfile } from './scoringEngine';
import { generateRoastAndAnalysis } from './aiService';
import type {
  AnalyzeResponse,
  BrutalityLevel,
  RegenerateRoastResponse,
  TargetRole,
} from './types';

export const apiRouter = Router();

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'gitroast',
  });
});

// POST /api/analyze
apiRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    ipRateLimiter.check(req);

    const { username, role = 'software_engineer', brutality = 'honest', variant = 0 } = req.body;
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new AppError('INVALID_USERNAME', 'GitHub username is required.', 400);
    }

    const cleanUsername = username.trim();
    const validRole = role as TargetRole;
    const validBrutality = brutality as BrutalityLevel;
    const cleanVariant = Math.max(0, Number(variant) || 0);

    // 1. Fetch raw GitHub data
    const userData = await fetchUserData(cleanUsername);

    // 2. Deterministic scoring
    const scoringResult = scoreProfile(userData, validRole);

    // 3. AI roast cache
    const cacheKey = `ai_roast:${cleanUsername.toLowerCase()}:${validRole}:${validBrutality}:${cleanVariant}`;
    let aiResult = aiCache.get(cacheKey);
    let aiAvailable = true;

    if (!aiResult) {
      const aiResponse = await generateRoastAndAnalysis(
        userData,
        scoringResult,
        validRole,
        validBrutality,
        cleanVariant
      );
      aiResult = aiResponse.result;
      aiAvailable = aiResponse.aiAvailable;
      if (aiResult) {
        aiCache.set(cacheKey, aiResult);
      }
    }

    const dataNotes = [
      `Deep analyzed top ${userData.analyzed_repos_count} repositories out of ${userData.total_repos_count} total repos.`,
      'Events API is limited by GitHub to ~90 days and 300 public events.',
    ];
    if (userData.cached) {
      dataNotes.push('Serving cached GitHub profile data (10-min cache).');
    }
    if (!aiAvailable) {
      dataNotes.push('AI generation was unavailable; deterministic scores are fully intact.');
    }

    const responsePayload: AnalyzeResponse = {
      profile: userData.profile,
      scores: scoringResult.scores,
      repos: scoringResult.repos,
      ai: aiResult,
      ai_available: aiAvailable,
      meta: {
        analyzed_at: new Date().toISOString(),
        repos_analyzed: userData.analyzed_repos_count,
        repos_total: userData.total_repos_count,
        cached: userData.cached,
        data_notes: dataNotes,
      },
    };

    res.json(responsePayload);
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// POST /api/regenerate-roast
apiRouter.post('/regenerate-roast', async (req: Request, res: Response) => {
  try {
    ipRateLimiter.check(req);

    const { username, role = 'software_engineer', brutality = 'honest', variant = 1 } = req.body;
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new AppError('INVALID_USERNAME', 'GitHub username is required.', 400);
    }

    const cleanUsername = username.trim();
    const validRole = role as TargetRole;
    const validBrutality = brutality as BrutalityLevel;
    const cleanVariant = Math.max(0, Number(variant) || 1);

    const cacheKey = `ai_roast:${cleanUsername.toLowerCase()}:${validRole}:${validBrutality}:${cleanVariant}`;
    const cachedAi = aiCache.get(cacheKey);
    if (cachedAi) {
      const payload: RegenerateRoastResponse = {
        roast: cachedAi.roast,
        roast_explanation: cachedAi.roast_explanation,
        grounding_repos: cachedAi.grounding_repos || [],
        comic_device: cachedAi.comic_device || null,
        variant: cleanVariant,
        ai_available: true,
      };
      return res.json(payload);
    }

    const userData = await fetchUserData(cleanUsername);
    const scoringResult = scoreProfile(userData, validRole);

    const { result, aiAvailable } = await generateRoastAndAnalysis(
      userData,
      scoringResult,
      validRole,
      validBrutality,
      cleanVariant
    );

    if (result) {
      aiCache.set(cacheKey, result);
      const payload: RegenerateRoastResponse = {
        roast: result.roast,
        roast_explanation: result.roast_explanation,
        grounding_repos: result.grounding_repos || [],
        comic_device: result.comic_device || null,
        variant: cleanVariant,
        ai_available: aiAvailable,
      };
      return res.json(payload);
    }

    throw new AppError('AI_UNAVAILABLE', 'Unable to regenerate AI roast at this time.', 503);
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

function handleRouteError(err: any, res: Response) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'An unexpected error occurred while processing your request. Please try again.',
    },
  });
}
