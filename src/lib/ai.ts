// Cloudflare Workers AI client
const ACCOUNT_ID = process.env.CLOUDFLARE_AI_ACCOUNT_ID;
const API_KEY = process.env.CLOUDFLARE_AI_API_KEY;
const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run`;

interface AIResponse {
  result: {
    response?: string;
    [key: string]: unknown;
  };
  success: boolean;
  errors: unknown[];
}

export async function runAIModel(model: string, prompt: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare AI error:", errorText);
      return `AI service error: ${response.status}`;
    }

    const data: AIResponse = await response.json();
    if (!data.success) {
      return `AI service error: ${JSON.stringify(data.errors)}`;
    }

    return data.result.response || JSON.stringify(data.result);
  } catch (error) {
    console.error("Cloudflare AI call failed:", error);
    return "AI service is currently unavailable. Please try again later.";
  }
}

export async function analyzeShipmentStatus(trackingNumber: string): Promise<string> {
  const prompt = `Analyze the shipment with tracking number ${trackingNumber}. What is the current status? Is there any risk of delay? Provide a concise response in 2-3 sentences.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function optimizeRoute(origin: string, destination: string, constraints: string[]): Promise<string> {
  const prompt = `Suggest the optimal route from ${origin} to ${destination}. Consider these constraints: ${constraints.join(", ")}. Provide 2-3 recommendations.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function analyzeSentiment(text: string): Promise<string> {
  const prompt = `Analyze the sentiment of this customer message: "${text}". Classify as positive, neutral, or negative. Provide reasoning in one sentence.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function generateTaskReasoning(taskType: string, context: string): Promise<string> {
  const prompt = `As a logistics AI agent, provide reasoning for this ${taskType} task: ${context}. Keep it under 100 words.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}
