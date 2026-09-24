import { Request, Response } from 'express';
import prisma from '../config/prisma';

/**
 * GET /api/slack/connect?userId=...
 * Initiates Slack OAuth 2.0 flow by redirecting to Slack's authorization server.
 */
export async function connectSlack(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: userId',
      });
    }

    const clientId = process.env.SLACK_CLIENT_ID || 'mock_slack_client_id';
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

    const slackAuthUrl =
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `scope=incoming-webhook&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(userId)}`;

    return res.redirect(slackAuthUrl);
  } catch (error) {
    console.error('[Slack Connect Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate Slack OAuth flow.',
    });
  }
}

/**
 * GET /api/slack/callback?code=...&state=...
 * Receives OAuth authorization code, exchanges it for access token & webhook URL, and persists in DB.
 */
export async function slackCallback(req: Request, res: Response) {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required code or state (userId) parameter in callback.',
      });
    }

    const clientId = process.env.SLACK_CLIENT_ID || '';
    const clientSecret = process.env.SLACK_CLIENT_SECRET || '';
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

    // 1. Exchange OAuth authorization code for Slack access token & incoming webhook URL
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (!tokenData.ok) {
      console.error('[Slack Callback OAuth Error]:', tokenData);
      return res.status(400).json({
        success: false,
        error: `Slack OAuth exchange failed: ${tokenData.error || 'Unknown error'}`,
      });
    }

    const teamId = tokenData.team?.id || tokenData.team_id || 'unknown_team';
    const accessToken = tokenData.access_token || tokenData.authed_user?.access_token || '';
    const webhookUrl = tokenData.incoming_webhook?.url || '';

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Slack OAuth response did not include an incoming webhook URL.',
      });
    }

    // 2. Persist or upsert SlackIntegration record in PostgreSQL
    const integration = await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        teamId,
        accessToken,
        webhookUrl,
        connectedAt: new Date(),
      },
      create: {
        userId,
        teamId,
        accessToken,
        webhookUrl,
        connectedAt: new Date(),
      },
    });

    console.log(`[Slack Integration Success] Connected Slack workspace for user ${userId} (Team: ${teamId})`);

    return res.status(200).json({
      success: true,
      message: 'Slack workspace connected successfully!',
      integration: {
        id: integration.id,
        userId: integration.userId,
        teamId: integration.teamId,
        connectedAt: integration.connectedAt,
      },
    });
  } catch (error) {
    console.error('[Slack Callback Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete Slack OAuth callback.',
    });
  }
}
