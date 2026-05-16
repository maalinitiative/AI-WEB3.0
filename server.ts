import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Assistant Endpoint
  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `You are a futuristic AI Assistant for the "MAAL Initiative AI + WEB3.0 Workshop". 
      The workshop is hosted by Osman A. Mohamed, Founder of Maal Initiative & Web3 Mentor.
      The event date is 14 May 2026 at 4:00 PM. 
      Venue: MU Taleh Campus.
      
      Workshop Objectives:
      - Inspire participants to start building in the digital economy.
      - Explore AI & Web3 transformational forces (Blockchain, Automation, Decentralization).
      - Opportunities for youth: AI Creator, Web3 Developer, Content Creator, Community Manager.
      
      Key Topics:
      1. What is AI? (Learning from data, automating tasks).
      2. What is Web3.0? (Ownership, decentralization, blockchain).
      3. Synergy: AI agents executing payments via smart contracts, verifiable provenance for AI assets.
      4. Skills for the Future: Prompt Engineering, Wallet Security, Smart Contracts, Creativity & Innovation.
      
      Site Features:
      1. Workshop Tracker (Agenda)
      2. Registration Flow (Join Session)
      3. AI Prompt Playground (Module 2)
      4. Trivia Challenge (Quiz)
      5. Digital NFT Certificates (Proof of Knowledge).

      If the user is a beginner, guide them to the "No Wallet? No Problem" section.
      Keep your tone professional, energetic, and empower users to build in the digital economy.
      
      User message: ${message}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      res.json({ text: responseText });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
