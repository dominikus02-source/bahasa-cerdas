const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const path = require('path');

const env = readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
const lines = env.split('\n').filter(l => l && !l.startsWith('#'));
const vars = {};
for (const line of lines) {
  const [k, ...v] = line.split('=');
  vars[k.trim()] = v.join('=').trim();
}

const supabase = createClient(vars['NEXT_PUBLIC_SUPABASE_URL'], vars['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  for (const bucket of ['documents', 'videos', 'images']) {
    const { data: existing } = await supabase.storage.getBucket(bucket);
    if (existing) {
      console.log(bucket, 'already exists');
      continue;
    }
    const { error } = await supabase.storage.createBucket(bucket, { public: true });
    console.log(bucket, error ? error.message : 'created');
  }
}
main().catch(console.error);
