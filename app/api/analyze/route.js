export async function POST(request) {
  try {
    const { image, goal } = await request.json();
    if (!image || !goal) return Response.json({ error: "Missing fields" }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 500 });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert UI navigation assistant. Output ONLY a single, short instruction (under 10 words) for the next click/tap. No extra text.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Goal: ${goal}\nScreenshot below.` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 30,
      }),
    });

    const data = await response.json();
    const instruction = data.choices?.[0]?.message?.content?.trim() || "";
    return Response.json({ instruction });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}