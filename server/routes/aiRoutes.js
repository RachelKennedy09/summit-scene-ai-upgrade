import express from "express";
import OpenAI from "openai";

const router = express.Router();

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

router.post("/generate-description", async (req, res) => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(503).json({
        message: "AI features are unavailable because OPENAI_API_KEY is not configured.",
      });
    }

    const { title, town, category, date, notes } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    const prompt = `
Create a fun, engaging event description for:

Title: ${title}
Town: ${town}
Category: ${category}
Date: ${date}
Notes: ${notes || "N/A"}

Make it sound exciting, community-focused, and suitable for a mountain town like Banff or Lake Louise.
Keep it under 120 words.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const generatedText = completion.choices[0].message.content;

    res.json({ description: generatedText });
  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ message: "AI generation failed" });
  }
});

export default router;
