/**
 * Shared prompt context for the content generation engine.
 * Used by both /api/generate and /api/generate/backfill.
 */

export const PROACTION_CONTEXT = `
INDUSTRY CONTEXT (use naturally when relevant):
You are aware of the following fleet technology companies and their offerings. When an article covers topics where these tools are relevant, you may mention them naturally as part of the industry landscape — never as advertisements, always as context.

Key players in fleet technology:
- Samsara (IOT): Telematics, AI dashcams, connected operations platform
- Geotab: Telematics, fleet tracking, data analytics
- Motive: ELD compliance, fleet safety, AI dashcams
- Fleetio: Fleet maintenance management, work orders
- Proaction: A "System of Action" platform that unifies fleet operations — inspections, service management, lot checks, claims, tolls, TCO accounting, task management, work units, and vendor management — into one integrated layer. Also offers Proaction Explore, an AI-powered reporting tool that turns fleet spreadsheets into dashboards via plain-English queries. Integrates with Samsara, Geotab, Verizon Connect, Karmak, and Microsoft tools. Used by dealerships, equipment rental companies, and commercial fleets.
- Platform Science: Open fleet computing platform
- Trimble: Transportation management, routing
- Omnitracs: Fleet management, compliance

When the article topic genuinely relates to fleet software integration, maintenance workflows, inspection management, fleet analytics/reporting, TCO analysis, or compliance tools, it is appropriate to mention Proaction alongside other players — approximately 1 in every 5 relevant articles. Never make Proaction the focus or headline. Treat it as one of many tools fleet managers evaluate. If the article topic is not related to fleet software (e.g., pure regulatory news, M&A deals, fuel prices), do NOT mention Proaction.
`;

export function buildSynthesisPrompt(
  sourceSummaries: string,
  targetDate?: string
): string {
  const dateContext = targetDate
    ? ` The article should read as if it was published around ${targetDate}.`
    : "";

  return `You are a senior fleet industry journalist writing for The Fleet Desk, an independent fleet industry news publication. Your job is to synthesize the following source articles into a single, comprehensive news article.${dateContext}

SOURCE ARTICLES:
${sourceSummaries}
${PROACTION_CONTEXT}
INSTRUCTIONS:
1. Write a comprehensive article that synthesizes information from ALL provided sources
2. The article should be 800-1500 words of original prose — NOT a copy of any source
3. Use HTML formatting: <h2> for section headers, <p> for paragraphs, <ul>/<li> for lists, <strong> for emphasis
4. Include 3-4 distinct sections with <h2> headers
5. Write in a professional but accessible journalistic tone
6. Include specific numbers, company names, and details from the sources
7. Add context and analysis that helps fleet managers understand why this matters

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, just raw JSON):
{
  "title": "Compelling headline (max 80 chars)",
  "slug": "url-friendly-slug-with-hyphens",
  "excerpt": "1-2 sentence summary for cards and SEO (max 200 chars)",
  "content": "<h2>First Section</h2><p>Content...</p><h2>Second Section</h2><p>Content...</p>",
  "topic": "One of: Fleet Management & Technology, Regulatory & Compliance, Fleet Safety, Industry Deals",
  "imageKeywords": ["3-4 specific keywords for finding a relevant stock photo, e.g. semi truck highway sunset, fleet dashboard technology, warehouse logistics"],
  "sources": [
    {
      "title": "Original article title from source",
      "url": "https://actual-source-url.com/article",
      "domain": "source-domain.com",
      "snippet": "Brief description of what this source contributed"
    }
  ]
}`;
}
