var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"));
var import_path = __toESM(require("path"));
var import_url = require("url");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"));
var import_cors = __toESM(require("cors"));
var import_meta = {};
var currentDirname = "";
try {
  if (import_meta && import_meta.url) {
    currentDirname = (0, import_path.dirname)((0, import_url.fileURLToPath)(import_meta.url));
  } else {
    currentDirname = __dirname;
  }
} catch (e) {
  currentDirname = __dirname;
}
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT || 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json());
var ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new import_genai.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function generateWithRetry(ai2, params, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai2.models.generateContent(params);
    } catch (error) {
      const is503 = error?.status === 503 || error?.message?.includes("503");
      if (is503 && i < retries - 1) {
        const delay = Math.pow(2, i) * 2e3;
        console.warn(`Gemini 503 error. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
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
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const viteModule = "vite";
      const vitePkg = await import(viteModule);
      const createViteServer = vitePkg.createServer;
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite dev server not found, skipping.");
    }
  } else {
    const distPath = import_path.default.join(currentDirname, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
setupServer();
