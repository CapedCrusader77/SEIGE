/*
  config.js — Centralized configuration for API and WebSocket URLs.

  This allows easy environment switching (local, staging, production).
  Set environment variables in .env file or use defaults for local development.
*/

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const rawApiKey = import.meta.env.VITE_API_KEY || "";
export const CONTROL_API_HEADERS = rawApiKey ? { "x-api-key": rawApiKey } : {};
