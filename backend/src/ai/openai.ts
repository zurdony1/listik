import "dotenv/config";
import OpenAI from "openai";

const apiKey =
  process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Falta OPENAI_API_KEY en backend/.env",
  );
}

export const openai =
  new OpenAI({
    apiKey,
  });