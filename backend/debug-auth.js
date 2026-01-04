require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.SUPABASE_JWT_SECRET;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log('--- JWT Diagnostic ---');
console.log('Secret (first 10 chars):', secret ? secret.substring(0, 10) + '...' : 'MISSING');
console.log('Anon Key (first 10 chars):', anonKey ? anonKey.substring(0, 10) + '...' : 'MISSING');

if (!secret || !anonKey) {
    console.error('Missing env vars!');
    process.exit(1);
}

// Check 1: Verify Anon Key with Secret (String)
try {
    jwt.verify(anonKey, secret);
    console.log('[SUCCESS] Anon Key verified with Secret (STRING).');
} catch (e) {
    console.log('[FAIL] Anon Key NOT verified with Secret (STRING):', e.message);
}

// Check 2: Verify Anon Key with Secret (Base64 Buffer)
try {
    const secretBuffer = Buffer.from(secret, 'base64');
    jwt.verify(anonKey, secretBuffer);
    console.log('[SUCCESS] Anon Key verified with Secret (BUFFER/BASE64).');
} catch (e) {
    console.log('[FAIL] Anon Key NOT verified with Secret (BUFFER/BASE64):', e.message);
}

console.log('----------------------');
