import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If DATABASE_URL is not provided, fall back to individual params (optional)
  ...(process.env.DATABASE_URL ? {} : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ludocode',
  })
});

async function seedQuestions() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database');

    // 1. Clear existing questions
    console.log('🧹 Clearing existing questions...');
    await client.query('DELETE FROM questions');
    console.log('✅ Questions table cleared');

    // 2. Find questions directory
    // Assuming structure: /backend/scripts/seed-questions.ts -> /questions (root)
    const questionsDir = path.resolve(__dirname, '../../questions');
    
    if (!fs.existsSync(questionsDir)) {
      console.warn(`⚠️  Questions directory not found at: ${questionsDir}`);
      console.warn('Please create the "questions" folder in the project root and add .sql/.json files.');
      return;
    }

    // 3. Read all files recursively
    const getAllFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getAllFiles(res));
        } else {
          files.push(res);
        }
      }
      return files;
    };

    const allFiles = getAllFiles(questionsDir).filter(
      (f) => f.endsWith('.sql') || f.endsWith('.json'),
    );

    if (allFiles.length === 0) {
      console.log('ℹ️  No files found in questions directory.');
      return;
    }

    console.log(`📂 Found ${allFiles.length} files to process`);

    // Cache languages and concepts to avoid repeated queries
    const languagesRes = await client.query('SELECT id, name FROM languages');
    const languages = new Map(languagesRes.rows.map(r => [r.name.toLowerCase(), r.id]));

    const conceptsRes = await client.query('SELECT id, name FROM concepts');
    const concepts = new Map(conceptsRes.rows.map(r => [r.name.toLowerCase(), r.id]));

    let totalInserted = 0;

    for (const filePath of allFiles) {
      const fileName = path.basename(filePath);
      console.log(`📄 Processing ${fileName}...`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      let questionsData;
      try {
        questionsData = JSON.parse(fileContent);
      } catch (e) {
        console.error(`❌ Failed to parse JSON in ${fileName}:`, e);
        continue;
      }

      if (!Array.isArray(questionsData)) {
        console.warn(`⚠️  File ${fileName} does not contain an array of questions.`);
        continue;
      }

      for (const q of questionsData) {
        // Find Language ID
        const langName = q.language?.toLowerCase();
        const langId = languages.get(langName);

        if (!langId) {
          console.warn(`   ⚠️  Language '${q.language}' not found for question '${q.title}'. Skipping.`);
          continue;
        }

        // Calculate difficulty params (approximate IRT from ELO)
        const difficulty = q.difficulty_rating || 1000;
        const difficultyBeta = (difficulty - 1000.0) / 200.0;

        // Insert Question
        const insertQRes = await client.query(`
          INSERT INTO questions 
          (title, description, hint, q_type, difficulty_display, difficulty_beta, discrimination_alpha, language_id, content)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          q.title,
          q.description,
          q.hint,
          q.q_type,
          difficulty,
          difficultyBeta,
          1.0, // discrimination_alpha
          langId,
          q.content
        ]);

        const questionId = insertQRes.rows[0].id;

        // Handle Concepts
        // Support both old string format and new object format
        // Old: "concept": "loops"
        // New: "concept": { "loops": 1.0, "basics": 0.5 }
        
        let conceptMap: { [key: string]: number } = {};
        
        if (typeof q.concept === 'string') {
          conceptMap[q.concept] = 1.0;
        } else if (typeof q.concept === 'object' && q.concept !== null) {
          conceptMap = q.concept;
        }

        for (const [conceptName, weight] of Object.entries(conceptMap)) {
          const cName = conceptName.toLowerCase();
          const conceptId = concepts.get(cName);

          if (conceptId) {
            await client.query(`
              INSERT INTO question_concepts (question_id, concept_id, weight)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [questionId, conceptId, weight]);
          } else {
            console.warn(`   ⚠️  Concept '${conceptName}' not found in DB. Skipping link.`);
          }
        }
        
        totalInserted++;
      }
    }

    console.log(`✨ Successfully inserted ${totalInserted} questions from ${allFiles.length} files.`);

  } catch (err) {
    console.error('❌ Error seeding questions:', err);
  } finally {
    await client.release();
    await pool.end();
  }
}

seedQuestions();
