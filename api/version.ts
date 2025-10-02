import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Version API Endpoint
 * 
 * Returns current build version information for cache-busting and version verification.
 * This endpoint is called by the client to detect when a new version is deployed.
 * 
 * Cache headers are set to "no-cache" to ensure clients always get the latest version info.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get version info from environment variables
    // These are set during build time in vite.config.ts
    const versionInfo = {
      version: process.env.BUILD_VERSION || 
               process.env.VERCEL_GIT_COMMIT_SHA || 
               'unknown',
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
      timestamp: Date.now(),
      environment: process.env.VERCEL_ENV || 'development',
      // Additional metadata
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
      deploymentUrl: process.env.VERCEL_URL
    };

    // Set aggressive no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(versionInfo);
  } catch (error) {
    console.error('Error in version endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve version information',
      version: 'error'
    });
  }
}
