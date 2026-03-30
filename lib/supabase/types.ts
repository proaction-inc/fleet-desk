export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  topic: string;
  author: string;
  published: boolean;
  published_at: string | null;
  featured_image_url: string | null;
  source_count: number | null;
  sections: ArticleSection[] | null;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  rss_url: string | null;
  active: boolean;
  created_at: string;
}

export interface RawArticle {
  id: string;
  source_id: string;
  title: string;
  url: string;
  summary: string | null;
  content: string | null;
  published_at: string | null;
  topic_tags: string[];
  used: boolean;
  created_at: string;
}

export interface DailyPost {
  id: string;
  content: string;
  stories: Record<string, unknown>[];
  fleet_desk_article_id: string | null;
  posted: boolean;
  posted_at: string | null;
  created_at: string;
}

export interface NewsletterEdition {
  id: string;
  subject: string;
  content: string;
  edition_number: number;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface ArticleSource {
  id: string;
  article_id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string | null;
  section_index: number;
  created_at: string;
}

export interface ArticleSection {
  heading: string;
  content: string;
  source_domains: string[];
}

export const CATEGORIES = [
  "Fleet Management & Technology",
  "Regulatory & Compliance",
  "Fleet Safety",
  "Industry Deals",
] as const;

export type Category = (typeof CATEGORIES)[number];
