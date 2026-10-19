/**
 * Chat Orchestrator
 *
 * Manages the conversation flow:
 * 1. Retrieves relevant content (RAG)
 * 2. Builds context-aware prompts (Voss phases)
 * 3. Calls Claude for responses
 * 4. Extracts discoveries and updates state
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  createConversation,
  getConversationById,
  addMessage,
  addDiscovery,
  updatePhase,
  type Conversation,
  type ChatMessage,
  type ConversationPhase,
} from "@/lib/mongodb/conversations";
import { getRAGContext, type PostContext } from "./rag";
import {
  getSystemPrompt,
  shouldAdvancePhase,
  extractDiscoveries,
  type PromptContext,
} from "./prompts";
import { getAccountById } from "@/lib/mongodb/accounts";

export interface ChatRequest {
  accountId: string;
  sessionId: string;
  conversationId?: string;
  message: string;
  topic?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  citations: {
    instagramId: string;
    caption?: string;
    permalink: string;
  }[];
  phase: ConversationPhase;
}

/**
 * Process a chat message and return a response
 */
export async function processChat(request: ChatRequest): Promise<ChatResponse> {
  const { accountId, sessionId, message, topic } = request;

  // Get or create conversation
  let conversation: Conversation;
  if (request.conversationId) {
    const existing = await getConversationById(request.conversationId);
    if (existing) {
      conversation = existing;
    } else {
      conversation = await createConversation({ accountId, sessionId, topic });
    }
  } else {
    conversation = await createConversation({ accountId, sessionId, topic });
  }

  // Add user message
  await addMessage(conversation.id, { role: "user", content: message });

  // Get account info for prompts
  const account = await getAccountById(accountId);
  const accountName = account?.name || accountId;

  // Get RAG context
  const ragResult = await getRAGContext(accountId, conversation.topic, message);

  // Extract any discoveries from the user message
  const newDiscoveries = extractDiscoveries(message);
  for (const discovery of newDiscoveries) {
    if (discovery.category && discovery.value) {
      await addDiscovery(conversation.id, {
        category: discovery.category,
        value: discovery.value,
      });
    }
  }

  // Refresh conversation to get updated discoveries
  const updatedConversation = await getConversationById(conversation.id);
  const discoveries = updatedConversation?.discoveries || conversation.discoveries;

  // Check if we should advance phase
  const messageCount = (updatedConversation?.messages.length || conversation.messages.length) + 1;
  const newPhase = shouldAdvancePhase(conversation.phase, discoveries, messageCount);

  if (newPhase !== conversation.phase) {
    await updatePhase(conversation.id, newPhase);
    conversation.phase = newPhase;
  }

  // Build prompt context
  const promptContext: PromptContext = {
    accountName,
    topic: conversation.topic,
    ragContext: ragResult.context,
    discoveries,
    messageCount,
  };

  // Get system prompt for current phase
  const systemPrompt = getSystemPrompt(conversation.phase, promptContext);

  // Build message history
  const messages = buildMessageHistory(updatedConversation?.messages || conversation.messages, message);

  // Call Claude
  const response = await callClaude(systemPrompt, messages);

  // Extract citations from response
  const citations = extractCitations(response, ragResult.posts);

  // Add assistant message
  await addMessage(conversation.id, {
    role: "assistant",
    content: response,
    citations: citations.map((c) => ({
      instagramId: c.instagramId,
      caption: c.caption,
    })),
  });

  return {
    conversationId: conversation.id,
    message: response,
    citations,
    phase: conversation.phase,
  };
}

/**
 * Build message history for Claude
 */
function buildMessageHistory(
  messages: ChatMessage[],
  currentMessage: string
): { role: "user" | "assistant"; content: string }[] {
  // Take last 10 messages for context
  const recentMessages = messages.slice(-10);

  const history = recentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add current message
  history.push({ role: "user", content: currentMessage });

  return history;
}

/**
 * Call Claude API
 */
async function callClaude(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const anthropic = new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No response from AI");
  }

  return textContent.text;
}

/**
 * Extract citations from response based on RAG posts
 */
function extractCitations(
  response: string,
  posts: PostContext[]
): { instagramId: string; caption?: string; permalink: string }[] {
  const citations: { instagramId: string; caption?: string; permalink: string }[] = [];
  const seenIds = new Set<string>();

  for (const post of posts) {
    // Check if the response contains a link to this post
    if (response.includes(post.permalink)) {
      if (!seenIds.has(post.instagramId)) {
        citations.push({
          instagramId: post.instagramId,
          caption: post.caption?.substring(0, 100),
          permalink: post.permalink,
        });
        seenIds.add(post.instagramId);
      }
    }

    // Also check if it references the post's subject or core message
    if (post.subject && response.toLowerCase().includes(post.subject.toLowerCase())) {
      if (!seenIds.has(post.instagramId)) {
        citations.push({
          instagramId: post.instagramId,
          caption: post.caption?.substring(0, 100),
          permalink: post.permalink,
        });
        seenIds.add(post.instagramId);
      }
    }
  }

  return citations;
}

/**
 * Stream a chat response (for real-time UI)
 */
export async function streamChat(
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onComplete: (response: ChatResponse) => void
): Promise<void> {
  const { accountId, sessionId, message, topic } = request;

  // Get or create conversation
  let conversation: Conversation;
  if (request.conversationId) {
    const existing = await getConversationById(request.conversationId);
    if (existing) {
      conversation = existing;
    } else {
      conversation = await createConversation({ accountId, sessionId, topic });
    }
  } else {
    conversation = await createConversation({ accountId, sessionId, topic });
  }

  // Add user message
  await addMessage(conversation.id, { role: "user", content: message });

  // Get account info
  const account = await getAccountById(accountId);
  const accountName = account?.name || accountId;

  // Get RAG context
  const ragResult = await getRAGContext(accountId, conversation.topic, message);

  // Extract discoveries
  const newDiscoveries = extractDiscoveries(message);
  for (const discovery of newDiscoveries) {
    if (discovery.category && discovery.value) {
      await addDiscovery(conversation.id, {
        category: discovery.category,
        value: discovery.value,
      });
    }
  }

  // Refresh conversation
  const updatedConversation = await getConversationById(conversation.id);
  const discoveries = updatedConversation?.discoveries || conversation.discoveries;

  // Check phase advancement
  const messageCount = (updatedConversation?.messages.length || conversation.messages.length) + 1;
  const newPhase = shouldAdvancePhase(conversation.phase, discoveries, messageCount);

  if (newPhase !== conversation.phase) {
    await updatePhase(conversation.id, newPhase);
    conversation.phase = newPhase;
  }

  // Build prompts
  const promptContext: PromptContext = {
    accountName,
    topic: conversation.topic,
    ragContext: ragResult.context,
    discoveries,
    messageCount,
  };
  const systemPrompt = getSystemPrompt(conversation.phase, promptContext);
  const messages = buildMessageHistory(updatedConversation?.messages || conversation.messages, message);

  // Stream from Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const anthropic = new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });

  let fullResponse = "";

  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  stream.on("text", (text) => {
    fullResponse += text;
    onChunk(text);
  });

  await stream.finalMessage();

  // Extract citations
  const citations = extractCitations(fullResponse, ragResult.posts);

  // Add assistant message
  await addMessage(conversation.id, {
    role: "assistant",
    content: fullResponse,
    citations: citations.map((c) => ({
      instagramId: c.instagramId,
      caption: c.caption,
    })),
  });

  onComplete({
    conversationId: conversation.id,
    message: fullResponse,
    citations,
    phase: conversation.phase,
  });
}
