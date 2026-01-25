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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
            maxOutputTokens: 150,
            temperature: 0.7,
          },
        }),
      }
    )

    const data = await response.json()
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!result) {
      throw new Error('AI returned an empty response')
    }

    return new Response(
      JSON.stringify({ explanation: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

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