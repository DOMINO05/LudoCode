export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Piston API configuration for code execution
export const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

// Helper to determine if we are using Supabase native logic
export const IS_SERVERLESS = true;