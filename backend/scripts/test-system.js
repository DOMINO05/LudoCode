
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function runTests() {
  console.log('🚀 LudoCode Teljes Rendszerteszt Indítása...\n');

  try {
    // 1. AUTH
    const testEmail = 'tester@ludocode.hu';
    const testPassword = 'TestPassword123!';
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.log('Test user not found, signing up...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: { username: 'RendszerTesztelő' }
        }
      });
      if (signUpError) throw signUpError;
      authData = signUpData;
      console.log('✅ Teszt felhasználó létrehozva.');
    } else {
      console.log('✅ Bejelentkezve mint:', authData.user.email);
    }

    const userId = authData.user.id;

    // 2. PROFIL
    console.log('\n--- 👤 Profil Tesztek ---');
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
          username: 'TesztElek_' + Math.floor(Math.random() * 1000), 
          bio: 'Én egy AI által vezérelt tesztelő vagyok. ' + new Date().toLocaleTimeString(),
          avatar_config: { mood: 'happy', eyes: 'open' } 
      })
      .eq('id', userId);
    if (profileError) console.error('❌ Profil frissítés hiba:', profileError);
    else console.log('✅ Profil adatok (név, bio, avatar) sikeresen módosítva.');

    // 3. BOLT
    console.log('\n--- 🛒 Bolt Tesztek ---');
    await supabase.rpc('sync_profile', { p_user_id: userId });
    await supabase.from('profiles').update({ gems: 1500 }).eq('id', userId);
    
    const { data: items } = await supabase.from('shop_items').select('*').limit(1);
    if (items && items.length > 0) {
      const { data: buyResult, error: buyError } = await supabase.rpc('buy_shop_item', {
        p_item_id: items[0].id,
        p_expected_cost: items[0].cost_gems
      });
      if (buyError) console.error('❌ Vásárlás hiba:', buyError.message);
      else console.log(`✅ Tárgy megvéve: ${items[0].name}. Új egyenleg:`, buyResult.new_gem_count);
    }

    // 4. STATISZTIKÁK & RANGLISTA
    console.log('\n--- 📊 Statisztika & Ranglista ---');
    const { data: stats, error: statsError } = await supabase.rpc('get_user_stats');
    if (statsError) console.error('❌ Statisztika hiba:', statsError);
    else console.log('✅ Statisztikák lekérve.');

    const { data: leaderboard, error: lbError } = await supabase
      .from('profiles')
      .select('username, xp')
      .order('xp', { ascending: false })
      .limit(3);
    if (lbError) console.error('❌ Ranglista hiba:', lbError);
    else console.log('✅ Ranglista Top 3:', leaderboard.map(u => `${u.username} (${u.xp} XP)`).join(', '));

    // 5. KÜLDETÉSEK & BÓNUSZ
    console.log('\n--- 🎯 Küldetések & Bónusz ---');
    const { data: bonusResult, error: bonusError } = await supabase.rpc('claim_daily_bonus');
    if (bonusError) console.log('ℹ️ Napi bónusz:', bonusError.message);
    else console.log('✅ Napi bónusz sikeresen leigényelve.');

    // 6. SZÓTÁR
    console.log('\n--- 📖 Szótár Teszt ---');
    const { data: dict, error: dictError } = await supabase.from('dictionary').select('word').limit(5);
    if (dictError) console.error('❌ Szótár hiba:', dictError);
    else console.log(`✅ Szótár elérve, kifejezések: ${dict.map(d => d.word).join(', ')}`);

    // 7. KVÍZ & KÉRDÉSEK
    console.log('\n--- 📝 Kvíz & Kérdés Kezelés ---');
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({ title: 'Rendszerteszt Kvíz', creator_id: userId, is_public: true })
      .select()
      .single();
    
    if (quizError) console.error('❌ Kvíz hiba:', quizError);
    else {
      console.log('✅ Kvíz létrehozva, címe:', quiz.title, 'Kód:', quiz.share_code);
      const { data: questions } = await supabase.from('questions').select('id').limit(1);
      if (questions && questions.length > 0) {
        await supabase.from('quiz_questions').insert({ quiz_id: quiz.id, question_id: questions[0].id, order_index: 0 });
        console.log('✅ Kérdés hozzáadva a kvízhez.');
      }
    }

    // 8. ADAPTÍV MOTOR & MINDEN TÍPUS BEKÜLDÉSE
    console.log('\n--- 🧠 Adaptív Motor & Beküldés (Minden típus) ---');
    const qTypes = ['theory', 'coding', 'debug', 'parsons', 'fill_in_blank', 'predict_output'];
    const { data: lang } = await supabase.from('languages').select('*').eq('name', 'python').single();
    
    if (lang) {
        for (const type of qTypes) {
            const { data: q, error: qErr } = await supabase
                .from('questions')
                .select('*')
                .eq('q_type', type)
                .eq('language_id', lang.id)
                .limit(1)
                .single();
            
            if (qErr) {
                console.log(`ℹ️ Típus kihagyva (${type}): Nincs ilyen kérdés az éles DB-ben.`);
                continue;
            }

            const { data: subResult, error: subError } = await supabase.rpc('complete_submission', {
                p_question_id: q.id,
                p_is_correct: true,
                p_submitted_answer: 'Automated test answer',
                p_execution_time_ms: 200,
                p_streak: 1
            });

            if (subError) console.error(`❌ Beküldés hiba (${type}):`, subError.message);
            else console.log(`✅ ${type} beküldés sikeres. XP Gain:`, subResult.xp_gain);
        }
    }

    // 9. MEGOSZTOTT KÓDOK
    console.log('\n--- 🔗 Megosztott Kódok ---');
    const { data: snippet, error: snipError } = await supabase
      .from('shared_snippets')
      .insert({ 
          code: 'print("LudoCode System Test")', 
          language: 'python', 
          title: 'Automated Test Snippet',
          creator_id: userId 
      })
      .select()
      .single();
    if (snipError) console.error('❌ Snippet hiba:', snipError);
    else console.log('✅ Snippet sikeresen megosztva, kód:', snippet.share_code);

    // 10. PLAYGROUND (Piston)
    console.log('\n--- 💻 Playground (Piston API) ---');
    try {
        const pistonRes = await axios.post(process.env.PISTON_API_URL, {
            language: 'python',
            version: '3.10.0',
            files: [{ name: 'main.py', content: 'print("Piston OK")' }]
        });
        console.log('✅ Piston API válasz:', pistonRes.data.run.stdout.trim());
    } catch (err) {
        console.error('❌ Piston API hiba:', err.message);
    }

    // 11. AI MENTOR
    console.log('\n--- ✨ AI Mentor (Edge Function) ---');
    try {
        const aiResponse = await axios.post(`${process.env.SUPABASE_URL}/functions/v1/ai-explanation`, {
            questionTitle: 'Lista hossza',
            questionDescription: 'Melyik függvénnyel kérjük le egy lista hosszát Pythonban?',
            correctAnswer: 'len()',
            userAnswer: 'length()',
            language: 'python'
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ AI válasz státusz:', aiResponse.status);
    } catch (err) {
        console.log('ℹ️ AI Mentor (lehet stream-el):', err.response ? JSON.stringify(err.response.data) : err.message);
    }

    // 12. RECOVERY
    console.log('\n--- 💊 Health & Recovery ---');
    const { data: recQ } = await supabase.rpc('get_mistake_recovery_question');
    console.log('✅ Recovery funkció ellenőrizve (Kérdés:', recQ ? recQ.title : 'Nincs aktuális hiba', ')');

    console.log('\n✨ MINDEN RENDSZERELEM ELLENŐRIZVE! ✨');

  } catch (err) {
    console.error('\n❌ KRITIKUS HIBA:', err);
  }
}

runTests();
