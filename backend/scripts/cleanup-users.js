require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function cleanUsers() {
  const usernames = [
    ''
  ];

  console.log(`🗑️ Törlés megkezdése (${usernames.length} név)...`);
  let count = 0;

  for (const name of usernames) {
    try {
      const { data: success, error } = await supabase.rpc('debug_delete_user_by_name', { 
        p_username: name 
      });

      if (error) {
        console.error(`  - ${name}: ❌ Hiba: ${error.message}`);
      } else if (success) {
        console.log(`  - ${name}: ✅ Törölve`);
        count++;
      }
    } catch (e) {
      console.error(`  - ${name}: ❌ Kivétel: ${e.message}`);
    }
  }

  console.log(`\n🧹 Összesen ${count} felhasználó adatai letisztítva.`);
}

cleanUsers();
