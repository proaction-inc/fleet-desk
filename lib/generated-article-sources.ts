export interface GeneratedArticleSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
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
    const domain = rawSource.domain.trim() || domainFromUrl(url);
    const snippet = rawSource.snippet.trim();

    if (!title || !url || !domain) {
      return null;
    }

    sources.push({
      title,
      url,
      domain,
      snippet,
    });
  }

  return sources;
}
