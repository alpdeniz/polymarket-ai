import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { DeepSeekChatModel } from "@aigne/deepseek";

// ---------------------------------------------------------------------------
// Prompt types — supports both plain strings and system+user split
// ---------------------------------------------------------------------------

export type PromptInput = { system: string; user: string } | string;

function splitPrompt(prompt: PromptInput): { system?: string; user: string } {
  if (typeof prompt === "string") return { user: prompt };
  return { system: prompt.system, user: prompt.user };
}

type QueryFn = (prompt: PromptInput) => Promise<string>;

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

function claudeProvider(): QueryFn {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return async (prompt) => {
    const { system, user } = splitPrompt(prompt);
    const msg = await client.messages.create({
      max_tokens: 16384,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: user }],
      model: "claude-opus-4-5-20251101",
    });
    if (msg.content[0].type === "text") return msg.content[0].text;
    throw new Error("Unexpected content type from Anthropic API");
  };
}

function geminiProvider(): QueryFn {
  const client = new GoogleGenAI({});
  return async (prompt) => {
    const { system, user } = splitPrompt(prompt);
    const res = await client.models.generateContent({
      model: "gemini-2.5-flash",
      ...(system ? { config: { systemInstruction: system } } : {}),
      contents: user,
    });
    return res.text || "";
  };
}

function deepseekProvider(): QueryFn {
  const client = new DeepSeekChatModel({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    modelOptions: { temperature: 0.7 },
  });
  return async (prompt) => {
    const { system, user } = splitPrompt(prompt);
    const messages: { role: "system" | "user"; content: string }[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: user });
    const res = await client.invoke({ messages, max_tokens: 16384 } as any);
    if (!res.text) throw new Error("Empty response from DeepSeek");
    return res.text;
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const PROVIDERS: Record<string, () => QueryFn> = {
  claude: claudeProvider,
  anthropic: claudeProvider,
  gemini: geminiProvider,
  deepseek: deepseekProvider,
};

function createModel(name = "claude") {
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(`Unknown model: ${name}. Available: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  console.log(`Using model: ${name}`);
  return { query: factory() };
}

const model = createModel(process.env.ACTIVE_MODEL);
export default model;
