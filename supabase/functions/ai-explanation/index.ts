import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { questionTitle, questionDescription, correctAnswer, userAnswer, language } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const prompt = `
      You are a helpful programming mentor. A student made a mistake in a ${language} task.
      Task: ${questionTitle} - ${questionDescription}
      Correct answer: ${correctAnswer}
      Student's answer: ${userAnswer}

      Explain in max 2 simple, clear sentences in Hungarian why their answer is wrong.
      DO NOT give the correct answer directly. Instead, guide them to find it.
      DO NOT use greetings like "Szia" or "Üdvözöllek". Start directly with the explanation.
      Don't use complex jargon. Be encouraging.
    `;

    // Call Gemini with streaming support
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      }
    )

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${err}`);
    }

    // Set up a transform stream to extract text from Gemini's JSON chunks
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // Gemini sends a JSON array stream. We need to parse it part by part.
                // Simplified approach: just look for the "text" fields in the chunks
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

                for (const line of lines) {
                    if (line.trim().startsWith('"text":')) {
                        const match = line.match(/"text":\s*"(.*)"/);
                        if (match && match[1]) {
                            // Basic unescape for the JSON string
                            const text = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                            await writer.write(encoder.encode(text));
                        }
                    } else if (line.includes('"text":')) {
                        // Sometimes it's not at the start
                        try {
                            const json = JSON.parse('{' + line.trim().replace(/,$/, '') + '}');
                            if (json.text) await writer.write(encoder.encode(json.text));
                        } catch (e) {
                            // If parsing fails, try regex fallback
                            const match = line.match(/"text":\s*"(.*)"/);
                            if (match && match[1]) {
                                const text = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                                await writer.write(encoder.encode(text));
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Stream error:", e);
        } finally {
            writer.close();
        }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      status: 200,
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})