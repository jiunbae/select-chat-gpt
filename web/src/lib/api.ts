export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  html: string;
}

export interface ShareData {
  id: string;
  title: string;
  sourceUrl: string;
  messages: Message[];
  createdAt: string;
  viewCount: number;
}

// 서버 사이드 (SSR)에서는 Docker 내부 URL 사용, 클라이언트에서는 외부 URL 사용
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }
  // Client-side: use public URL
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export async function getShare(id: string): Promise<ShareData | null> {
  try {
    const apiUrl = getApiBaseUrl();
    console.log(`[API] Fetching share ${id} from ${apiUrl}`);
    const response = await fetch(`${apiUrl}/api/shares/${id}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch share:", error);
    return null;
  }
}
