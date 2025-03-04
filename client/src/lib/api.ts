import { apiRequest } from "./queryClient";

export async function searchWeb(query: string) {
  const res = await apiRequest("GET", `/api/search?query=${encodeURIComponent(query)}`);
  return res.json();
}

export async function generateImage(prompt: string) {
  const res = await apiRequest("POST", "/api/generate-image", { prompt });
  return res.json();
}
