export interface GeneratedArticleSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function normalizeGeneratedArticleSources(
  input: unknown
): GeneratedArticleSource[] | null {
  if (!Array.isArray(input) || input.length === 0) {
    return null;
  }

  const sources: GeneratedArticleSource[] = [];
  for (const source of input) {
    if (!source || typeof source !== "object") {
      return null;
    }

    const rawSource = source as Record<string, unknown>;
    if (
      typeof rawSource.title !== "string" ||
      typeof rawSource.url !== "string" ||
      typeof rawSource.domain !== "string" ||
      typeof rawSource.snippet !== "string"
    ) {
      return null;
    }

    const title = rawSource.title.trim();
    const url = rawSource.url.trim();
    const parsedUrl = parseHttpUrl(url);
    const domain = rawSource.domain.trim() || parsedUrl?.hostname || "";
    const snippet = rawSource.snippet.trim();

    if (!title || !parsedUrl || !domain) {
      return null;
    }

    sources.push({
      title,
      url: parsedUrl.href,
      domain,
      snippet,
    });
  }

  return sources;
}
