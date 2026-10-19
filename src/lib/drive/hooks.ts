/**
 * React Hooks for Drive Content
 *
 * Client-side hooks for fetching and using Greg Caseley's Drive content.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParsedContent, ContentItem, CarouselItem, GraphicItem, VideoItem } from "./types";

interface DriveContentResponse {
  success: boolean;
  data?: {
    items: ContentItem[];
    carousels?: CarouselItem[];
    graphics?: GraphicItem[];
    videos?: VideoItem[];
    metadata: ParsedContent["metadata"] & {
      filteredCount: number;
      filters: {
        type: string | null;
        preview: string | null;
      };
    };
  };
  error?: string;
}

interface UseGregCaseleyContentOptions {
  type?: "carousel" | "graphic" | "video";
  preview?: boolean;
  autoFetch?: boolean;
}

interface UseGregCaseleyContentReturn {
  content: DriveContentResponse["data"] | null;
  isLoading: boolean;
  error: string | null;
  refetch: (bustCache?: boolean) => Promise<void>;
}

/**
 * Hook to fetch Greg Caseley's Drive content
 */
export function useGregCaseleyContent(
  options: UseGregCaseleyContentOptions = {}
): UseGregCaseleyContentReturn {
  const { type, preview, autoFetch = true } = options;

  const [content, setContent] = useState<DriveContentResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (bustCache = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (bustCache) params.set("bustCache", "true");
      if (type) params.set("type", type);
      if (preview !== undefined) params.set("preview", String(preview));

      const queryString = params.toString();
      const url = `/api/drive/greg-caseley${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      const data: DriveContentResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch content");
      }

      setContent(data.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [type, preview]);

  useEffect(() => {
    if (autoFetch) {
      fetchContent();
    }
  }, [autoFetch, fetchContent]);

  return {
    content,
    isLoading,
    error,
    refetch: fetchContent,
  };
}

/**
 * Hook to get a specific content item by ID
 */
export function useContentItem(itemId: string | null): {
  item: ContentItem | null;
  isLoading: boolean;
  error: string | null;
} {
  const { content, isLoading, error } = useGregCaseleyContent();

  const item = content?.items.find(i => i.id === itemId) || null;

  return { item, isLoading, error };
}

/**
 * Hook to get carousels only
 */
export function useCarousels(options: { preview?: boolean } = {}): {
  carousels: CarouselItem[];
  isLoading: boolean;
  error: string | null;
  refetch: (bustCache?: boolean) => Promise<void>;
} {
  const { content, isLoading, error, refetch } = useGregCaseleyContent({
    type: "carousel",
    preview: options.preview,
  });

  return {
    carousels: (content?.items as CarouselItem[]) || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get graphics only
 */
export function useGraphics(options: { preview?: boolean } = {}): {
  graphics: GraphicItem[];
  isLoading: boolean;
  error: string | null;
  refetch: (bustCache?: boolean) => Promise<void>;
} {
  const { content, isLoading, error, refetch } = useGregCaseleyContent({
    type: "graphic",
    preview: options.preview,
  });

  return {
    graphics: (content?.items as GraphicItem[]) || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get videos only
 */
export function useVideos(options: { preview?: boolean } = {}): {
  videos: VideoItem[];
  isLoading: boolean;
  error: string | null;
  refetch: (bustCache?: boolean) => Promise<void>;
} {
  const { content, isLoading, error, refetch } = useGregCaseleyContent({
    type: "video",
    preview: options.preview,
  });

  return {
    videos: (content?.items as VideoItem[]) || [],
    isLoading,
    error,
    refetch,
  };
}
