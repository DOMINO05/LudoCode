import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    console.log("Request Prompt:", prompt);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        }),
      }
    )

    const data = await response.json();
    console.log("Gemini Raw Response:", JSON.stringify(data));

    if (!response.ok) {
        throw new Error(`Gemini API error: ${JSON.stringify(data)}`);
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sajnos nem sikerült magyarázatot generálnom. Próbáld újra később!";

    return new Response(JSON.stringify({ text: aiText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("AI Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})
