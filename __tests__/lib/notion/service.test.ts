/**
 * Notion Service Tests
 *
 * Tests the Notion service with mocked API responses.
 * Run with: npm run test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NotionConfig } from "../types";

// Mock the Notion client
vi.mock("../client", () => ({
  getNotionClient: vi.fn(() => ({
    dataSources: {
      query: vi.fn(),
    },
    pages: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
  })),
}));

// Import after mocking
import { getNotionClient } from "../client";
import {
  getPosts,
  getTopics,
  getPostById,
  getTopicById,
  getPostsSummary,
  updatePostStatus,
} from "../service";

// Test config matching Greg's setup
const testConfig: NotionConfig = {
  postsDataSourceId: "collection://test-posts-id",
  topicsDataSourceId: "collection://test-topics-id",
};

// Mock post data (simulates Notion API response)
const mockPostPage = {
  id: "post-1",
  properties: {
    Post: { title: [{ plain_text: "Test Post Title" }] },
    Status: { select: { name: "Ready for Review" } },
    Type: { select: { name: "Teaching Moment" } },
    Topic: { relation: [{ id: "topic-1" }] },
    "Question answered": { rich_text: [{ plain_text: "What is testing?" }] },
    "Decision stage": { select: { name: "1 - Good idea?" } },
    Level: { select: { name: "L5 - Expertise" } },
    "Belief before": { rich_text: [{ plain_text: "Testing is hard" }] },
    "Belief after": { rich_text: [{ plain_text: "Testing is essential" }] },
    Caption: { rich_text: [{ plain_text: "This is the caption" }] },
    CTA: { rich_text: [{ plain_text: "Comment below!" }] },
    Preview: { url: "https://example.com/preview.jpg" },
    "Answer check": { checkbox: true },
    "IG post link": { url: "https://instagram.com/p/abc123" },
  },
  created_time: "2026-01-01T00:00:00.000Z",
  last_edited_time: "2026-01-02T00:00:00.000Z",
};

// Mock topic data
const mockTopicPage = {
  id: "topic-1",
  properties: {
    Topic: { title: [{ plain_text: "Market Trends" }] },
    Audience: { select: { name: "Buyers" } },
    "Why it matters": { rich_text: [{ plain_text: "Understanding market helps decisions" }] },
    "Personal question (CTA)": { rich_text: [{ plain_text: "What's your timeline?" }] },
    "Local angle": { rich_text: [{ plain_text: "PEI specific trends" }] },
    "From library": { relation: [] },
    Source: { select: { name: "Greg (client questions)" } },
    Status: { select: { name: "Active" } },
    Priority: { select: { name: "High" } },
    Posts: { relation: [{ id: "post-1" }, { id: "post-2" }] },
  },
};

describe("Notion Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPosts", () => {
    it("fetches posts from Notion", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [mockPostPage],
        has_more: false,
      });

      const posts = await getPosts(testConfig);

      expect(mockClient.dataSources.query).toHaveBeenCalledWith({
        data_source_id: testConfig.postsDataSourceId,
        page_size: 100,
      });
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe("post-1");
      expect(posts[0].title).toBe("Test Post Title");
      expect(posts[0].status).toBe("Ready for Review");
    });

    it("filters posts by status", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [
          mockPostPage,
          {
            ...mockPostPage,
            id: "post-2",
            properties: {
              ...mockPostPage.properties,
              Status: { select: { name: "Idea" } },
            },
          },
        ],
        has_more: false,
      });

      const posts = await getPosts(testConfig, { status: "Ready for Review" });

      expect(posts).toHaveLength(1);
      expect(posts[0].status).toBe("Ready for Review");
    });

    it("filters posts by topicId", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [
          mockPostPage,
          {
            ...mockPostPage,
            id: "post-2",
            properties: {
              ...mockPostPage.properties,
              Topic: { relation: [{ id: "topic-2" }] },
            },
          },
        ],
        has_more: false,
      });

      const posts = await getPosts(testConfig, { topicId: "topic-1" });

      expect(posts).toHaveLength(1);
      expect(posts[0].topicId).toBe("topic-1");
    });
  });

  describe("getTopics", () => {
    it("fetches topics from Notion", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [mockTopicPage],
        has_more: false,
      });

      const topics = await getTopics(testConfig);

      expect(mockClient.dataSources.query).toHaveBeenCalledWith({
        data_source_id: testConfig.topicsDataSourceId,
        page_size: 100,
      });
      expect(topics).toHaveLength(1);
      expect(topics[0].id).toBe("topic-1");
      expect(topics[0].title).toBe("Market Trends");
      expect(topics[0].audience).toBe("Buyers");
      expect(topics[0].status).toBe("Active");
    });

    it("filters topics by status", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [
          mockTopicPage,
          {
            ...mockTopicPage,
            id: "topic-2",
            properties: {
              ...mockTopicPage.properties,
              Status: { select: { name: "Idea" } },
            },
          },
        ],
        has_more: false,
      });

      const topics = await getTopics(testConfig, { status: "Active" });

      expect(topics).toHaveLength(1);
      expect(topics[0].status).toBe("Active");
    });
  });

  describe("getPostById", () => {
    it("fetches a single post by ID", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.pages.retrieve).mockResolvedValue(mockPostPage);

      const post = await getPostById(testConfig, "post-1");

      expect(mockClient.pages.retrieve).toHaveBeenCalledWith({
        page_id: "post-1",
      });
      expect(post).not.toBeNull();
      expect(post?.id).toBe("post-1");
      expect(post?.title).toBe("Test Post Title");
    });

    it("returns null for non-existent post", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.pages.retrieve).mockRejectedValue(new Error("Not found"));

      const post = await getPostById(testConfig, "non-existent");

      expect(post).toBeNull();
    });
  });

  describe("getTopicById", () => {
    it("fetches a single topic by ID", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.pages.retrieve).mockResolvedValue(mockTopicPage);

      const topic = await getTopicById(testConfig, "topic-1");

      expect(mockClient.pages.retrieve).toHaveBeenCalledWith({
        page_id: "topic-1",
      });
      expect(topic).not.toBeNull();
      expect(topic?.id).toBe("topic-1");
      expect(topic?.title).toBe("Market Trends");
    });
  });

  describe("getPostsSummary", () => {
    it("calculates post summary statistics", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [
          mockPostPage,
          {
            ...mockPostPage,
            id: "post-2",
            properties: {
              ...mockPostPage.properties,
              Status: { select: { name: "Published" } },
              Level: { select: { name: "L3 - Process" } },
            },
          },
          {
            ...mockPostPage,
            id: "post-3",
            properties: {
              ...mockPostPage.properties,
              Status: { select: { name: "Idea" } },
              Level: { select: { name: "L5 - Expertise" } },
              "Decision stage": { select: { name: "2 - What's involved?" } },
            },
          },
        ],
        has_more: false,
      });

      const summary = await getPostsSummary(testConfig);

      expect(summary.total).toBe(3);
      expect(summary.readyForReview).toBe(1);
      expect(summary.published).toBe(1);
      expect(summary.byStatus["Ready for Review"]).toBe(1);
      expect(summary.byStatus["Published"]).toBe(1);
      expect(summary.byStatus["Idea"]).toBe(1);
      expect(summary.byLevel["L5 - Expertise"]).toBe(2);
      expect(summary.byLevel["L3 - Process"]).toBe(1);
    });
  });

  describe("updatePostStatus", () => {
    it("updates post status in Notion", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.pages.update).mockResolvedValue({});

      const result = await updatePostStatus(testConfig, "post-1", "Approved");

      expect(mockClient.pages.update).toHaveBeenCalledWith({
        page_id: "post-1",
        properties: {
          Status: {
            select: { name: "Approved" },
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.postId).toBe("post-1");
      expect(result.newStatus).toBe("Approved");
    });
  });

  describe("parsePost", () => {
    it("correctly extracts all post fields", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [mockPostPage],
        has_more: false,
      });

      const posts = await getPosts(testConfig);
      const post = posts[0];

      expect(post.id).toBe("post-1");
      expect(post.title).toBe("Test Post Title");
      expect(post.status).toBe("Ready for Review");
      expect(post.type).toBe("Teaching Moment");
      expect(post.topicId).toBe("topic-1");
      expect(post.questionAnswered).toBe("What is testing?");
      expect(post.decisionStage).toBe("1 - Good idea?");
      expect(post.level).toBe("L5 - Expertise");
      expect(post.beliefBefore).toBe("Testing is hard");
      expect(post.beliefAfter).toBe("Testing is essential");
      expect(post.caption).toBe("This is the caption");
      expect(post.cta).toBe("Comment below!");
      expect(post.previewUrl).toBe("https://example.com/preview.jpg");
      expect(post.answerCheck).toBe(true);
      expect(post.igPostLink).toBe("https://instagram.com/p/abc123");
      expect(post.createdAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
      expect(post.updatedAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    });
  });

  describe("parseTopic", () => {
    it("correctly extracts all topic fields", async () => {
      const mockClient = getNotionClient();
      vi.mocked(mockClient.dataSources.query).mockResolvedValue({
        results: [mockTopicPage],
        has_more: false,
      });

      const topics = await getTopics(testConfig);
      const topic = topics[0];

      expect(topic.id).toBe("topic-1");
      expect(topic.title).toBe("Market Trends");
      expect(topic.audience).toBe("Buyers");
      expect(topic.whyItMatters).toBe("Understanding market helps decisions");
      expect(topic.personalQuestion).toBe("What's your timeline?");
      expect(topic.localAngle).toBe("PEI specific trends");
      expect(topic.source).toBe("Greg (client questions)");
      expect(topic.status).toBe("Active");
      expect(topic.priority).toBe("High");
      expect(topic.postIds).toEqual(["post-1", "post-2"]);
    });
  });
});
