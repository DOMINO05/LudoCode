import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

    // Questions Root Directory
    // backend/scripts/seed-questions.ts -> ../../questions
    const questionsRootDir = path.resolve(__dirname, '../../questions');
    
    if (!fs.existsSync(questionsRootDir)) {
      console.warn(`⚠️  Questions directory not found at: ${questionsRootDir}`);
      return;
    }

    // Cache languages and concepts
    const languagesRes = await client.query('SELECT id, name FROM languages');
    const languages = new Map(languagesRes.rows.map(r => [r.name.toLowerCase(), r.id]));

    const conceptsRes = await client.query('SELECT id, name FROM concepts');
    const concepts = new Map(conceptsRes.rows.map(r => [r.name.toLowerCase(), r.id]));

    // Check for arguments (Single File Mode)
    const targetArg = process.argv[2];
    let filesToProcess: string[] = [];

    if (targetArg) {
      // SINGLE FILE MODE
      console.log(`🎯 Single file mode: ${targetArg}`);
      
      // Resolve file path. Try absolute, relative to CWD, or relative to questions dir
      let targetPath = path.resolve(targetArg); // Relative to CWD
      if (!fs.existsSync(targetPath)) {
        targetPath = path.resolve(questionsRootDir, targetArg); // Relative to questions dir
      }

      if (!fs.existsSync(targetPath)) {
        console.error(`❌ File not found: ${targetArg}`);
        console.error(`Searched at: ${targetPath}`);
        return;
      }

      // Parse metadata for selective delete
      // Expected structure: questions_root / [TYPE] / [LANG]_[CONCEPT].json
      const relativePath = path.relative(questionsRootDir, targetPath);
      const pathParts = relativePath.split(path.sep);

      if (pathParts.length < 2) {
        console.error(`❌ Invalid file structure. Expected inside a subfolder (e.g. theory/python_oop.json). Got: ${relativePath}`);
        return;
      }

      const qType = pathParts[0]; // e.g. 'theory'
      const fileName = pathParts[pathParts.length - 1]; // e.g. 'python_oop.json'
      const nameWithoutExt = path.parse(fileName).name; // 'python_oop'
      
      // Parse lang and concept (assuming 'lang_concept')
      const nameParts = nameWithoutExt.split('_');
      const langKey = nameParts[0];
      const conceptKey = nameParts.slice(1).join('_');

      console.log(`ℹ️  Scope - Type: ${qType}, Lang: ${langKey}, Concept: ${conceptKey}`);

      const langId = languages.get(langKey.toLowerCase());
      const conceptId = concepts.get(conceptKey.toLowerCase());

      if (!langId) {
        console.error(`❌ Language '${langKey}' not found in DB.`);
        return;
      }
      if (!conceptId) {
        console.error(`❌ Concept '${conceptKey}' not found in DB.`);
        return;
      }

      // Perform Selective Delete
      console.log(`🧹 Deleting existing questions for this scope...`);
      const deleteQuery = `
        DELETE FROM questions q
        USING question_concepts qc
        WHERE q.id = qc.question_id
        AND q.q_type::text = $1
        AND q.language_id = $2
        AND qc.concept_id = $3
      `;
      // Note: Cast q_type to text to match folder name string if enum issues arise, 
      // but Postgres usually handles string-to-enum if valid.

      const deleteRes = await client.query(deleteQuery, [qType, langId, conceptId]);
      console.log(`✅ Deleted ${deleteRes.rowCount} questions.`);

      filesToProcess = [targetPath];

    } else {
      // FULL MODE
      console.log('🚀 Full seed mode');
      console.log('🧹 Clearing ALL existing questions...');
      await client.query('DELETE FROM questions');
      console.log('✅ Questions table cleared');

      // Find all files recursively
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

      filesToProcess = getAllFiles(questionsRootDir).filter(
        (f) => f.endsWith('.sql') || f.endsWith('.json'),
      );
    }

    if (filesToProcess.length === 0) {
      console.log('ℹ️  No files to process.');
      return;
    }

    console.log(`📂 Processing ${filesToProcess.length} files...`);

    let totalInserted = 0;

    for (const filePath of filesToProcess) {
      const relativePath = path.relative(questionsRootDir, filePath);
      console.log(`📄 Processing ${relativePath}...`);
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      let questionsData;
      try {
        questionsData = JSON.parse(fileContent);
      } catch (e) {
        console.error(`❌ Failed to parse JSON in ${relativePath}:`, e);
        continue;
      }

      if (!Array.isArray(questionsData)) {
        console.warn(`⚠️  File ${relativePath} does not contain an array of questions.`);
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

        // Calculate difficulty params
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
          1.0, 
          langId,
          q.content
        ]);

        const questionId = insertQRes.rows[0].id;

        // Handle Concepts
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

    console.log(`✨ Successfully inserted ${totalInserted} questions.`);

  } catch (err) {
    console.error('❌ Error seeding questions:', err);
  } finally {
    await client.release();
    await pool.end();
  }
}

seedQuestions();
