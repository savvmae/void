import { createClient } from "@supabase/supabase-js";

// Create React App inlines anything prefixed REACT_APP_ at build time.
// The anon key is meant to be public: row level security on the `answers`
// table is what actually enforces access. The Anthropic key is never here -
// it lives only as a Supabase secret, read by the edge function.
const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured ? createClient(url, anonKey) : null;

export const supabaseAnonKey = anonKey;

export const submitAnswerUrl = isConfigured
  ? `${url.replace(/\/+$/, "")}/functions/v1/submit-answer`
  : null;
