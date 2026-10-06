/**
 * Graphics App Service
 *
 * Handles communication with the Graphics App for rendering carousels.
 */

import type {
  CreateRenderSessionRequest,
  CreateRenderSessionResponse,
  AgentProfile,
} from "@/lib/types/carousel-content";
import type { ScheduledCarousel, CarouselBrief } from "@/lib/types/graphic-package";

const GRAPHICS_APP_URL =
  process.env.NEXT_PUBLIC_GRAPHICS_APP_URL || "http://localhost:3003";

/**
 * Create a render session in Graphics App
 */
export async function createRenderSession(
  request: CreateRenderSessionRequest
): Promise<CreateRenderSessionResponse> {
  const response = await fetch(`${GRAPHICS_APP_URL}/api/render-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create render session");
  }

  return response.json();
}

/**
 * Build render session request from a scheduled carousel
 */
export function buildRenderSessionRequest(
  carousel: ScheduledCarousel,
  agent: AgentProfile,
  content: Record<string, unknown>,
  baseUrl: string
): CreateRenderSessionRequest {
  const callbackUrl = `${baseUrl}/api/calendar/${agent.name.toLowerCase().replace(/\s+/g, "-")}/posts/${carousel.id}/link-graphic`;

  return {
    postId: carousel.id,
    agentId: agent.name.toLowerCase().replace(/\s+/g, "-"),
    format: carousel.suggestedFormat || "ClientQuestionsCarousel",
    callbackUrl,
    content,
    agent,
    question: carousel.question,
    level: carousel.level,
    isEvergreen: carousel.isEvergreen,
    mode: carousel.clientFeedback ? "revision" : "render",
    version: (carousel.revisionHistory?.length || 0) + 1,
    feedback: carousel.clientFeedback,
  };
}

/**
 * Get full embed URL for a session
 */
export function getEmbedUrl(embedPath: string): string {
  return `${GRAPHICS_APP_URL}${embedPath}`;
}

/**
 * Fetch available formats from Graphics App
 */
export async function getAvailableFormats(): Promise<
  Array<{
    id: string;
    name: string;
    slideCount: number;
    description: string;
  }>
> {
  try {
    const response = await fetch(`${GRAPHICS_APP_URL}/api/formats`);
    if (!response.ok) {
      throw new Error("Failed to fetch formats");
    }
    const data = await response.json();
    return data.formats || [];
  } catch (error) {
    console.error("Failed to fetch formats from Graphics App:", error);
    return [];
  }
}

/**
 * Check Graphics App health
 */
export async function checkGraphicsHealth(): Promise<{
  healthy: boolean;
  latency?: number;
}> {
  const start = Date.now();
  try {
    const response = await fetch(`${GRAPHICS_APP_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    return { healthy: response.ok, latency };
  } catch {
    return { healthy: false };
  }
}
