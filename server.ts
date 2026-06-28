import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

let currentDirname = "";
try {
  // @ts-ignore
  if (import.meta && import.meta.url) {
    // @ts-ignore
    currentDirname = dirname(fileURLToPath(import.meta.url));
  } else {
    currentDirname = __dirname;
  }
} catch (e) {
  currentDirname = __dirname;
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini
let ai: any = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(ai: any, params: any, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const is503 = error?.status === 503 || error?.message?.includes("503");
      if (is503 && i < retries - 1) {
        const delay = Math.pow(2, i) * 2000;
        console.warn(`Gemini 503 error. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

// Gemini Report Analysis
app.post("/api/reports/analyze", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  const { data, context } = req.body;
  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-1.5-flash",
      contents: `Analyze the following milk business data and provide insights and recommendations in human-friendly text.
      Context: ${context}
      Data: ${JSON.stringify(data)}`,
      config: {
        systemInstruction: "You are a specialized consultant for dairy businesses. Provide professional, actionable insights in both Hindi and English. Focus on profit maximization and wastage reduction."
      }
    });
    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Setup Server
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = eval('require("vite")');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite dev server not found, skipping.");
    }
  } else {
    const distPath = path.join(currentDirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupServer();
