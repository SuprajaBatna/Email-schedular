/**
 * Centralized API Base URL configuration for ReachInbox Frontend.
 * Uses NEXT_PUBLIC_API_BASE_URL environment variable in production,
 * falling back to http://localhost:5000 for local development.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
