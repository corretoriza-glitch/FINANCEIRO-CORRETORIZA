// Entry point that loads .env BEFORE any ES module imports
// This CJS wrapper ensures dotenv runs first
import { config } from 'dotenv';
const result = config();
if (result.error) {
  console.warn('⚠️  Could not load .env file:', result.error.message);
} else {
  console.log(`✅ .env loaded (${Object.keys(result.parsed || {}).length} variables)`);
}

// Re-check immediately
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set after dotenv load.');
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY loaded successfully.');
}
