/**
 * Fleet industry RSS/news sources for the content engine.
 * Each source has a name, RSS feed URL, and domain for attribution.
 */
export interface RSSSource {
  name: string;
  feedUrl: string;
  domain: string;
  category: "general" | "regulatory" | "safety" | "technology" | "deals";
}

export const RSS_SOURCES: RSSSource[] = [
  // Major fleet publications (trucking + commercial)
  {
    name: "FleetOwner",
    feedUrl: "https://www.fleetowner.com/rss",
    domain: "fleetowner.com",
    category: "general",
  },
  {
    name: "Transport Topics",
    feedUrl: "https://www.ttnews.com/rss.xml",
    domain: "ttnews.com",
    category: "general",
  },
  {
    name: "FreightWaves",
    feedUrl: "https://www.freightwaves.com/news/feed",
    domain: "freightwaves.com",
    category: "general",
  },
  {
    name: "CCJ Digital",
    feedUrl: "https://www.ccjdigital.com/rss",
    domain: "ccjdigital.com",
    category: "general",
  },
  {
    name: "Heavy Duty Trucking",
    feedUrl: "https://www.truckinginfo.com/rss",
    domain: "truckinginfo.com",
    category: "general",
  },
  // Automotive / passenger fleet publications
  {
    name: "Automotive Fleet",
    feedUrl: "https://www.automotive-fleet.com/rss",
    domain: "automotive-fleet.com",
    category: "general",
  },
  {
    name: "NAFA Fleet Management Association",
    feedUrl: "https://www.nafa.org/feed/",
    domain: "nafa.org",
    category: "general",
  },
  {
    name: "Fleet Management Weekly",
    feedUrl: "https://www.fleetmanagementweekly.com/feed/",
    domain: "fleetmanagementweekly.com",
    category: "general",
  },
  // Regulatory
  {
    name: "FMCSA News",
    feedUrl: "https://www.fmcsa.dot.gov/newsroom/rss",
    domain: "fmcsa.dot.gov",
    category: "regulatory",
  },
  // Technology
  {
    name: "Samsara Blog",
    feedUrl: "https://www.samsara.com/blog/rss.xml",
    domain: "samsara.com",
    category: "technology",
  },
  // Google News - fleet management (broad)
  {
    name: "Google News - Fleet Management",
    feedUrl:
      "https://news.google.com/rss/search?q=fleet+management+software+vehicles&hl=en-US&gl=US&ceid=US:en",
    domain: "news.google.com",
    category: "general",
  },
  {
    name: "Google News - Trucking Industry",
    feedUrl:
      "https://news.google.com/rss/search?q=trucking+industry+carrier&hl=en-US&gl=US&ceid=US:en",
    domain: "news.google.com",
    category: "general",
  },
  {
    name: "Google News - Corporate Fleet",
    feedUrl:
      "https://news.google.com/rss/search?q=corporate+fleet+vehicles+management&hl=en-US&gl=US&ceid=US:en",
    domain: "news.google.com",
    category: "general",
  },
  {
    name: "Google News - EV Fleet",
    feedUrl:
      "https://news.google.com/rss/search?q=electric+vehicle+fleet+commercial&hl=en-US&gl=US&ceid=US:en",
    domain: "news.google.com",
    category: "technology",
  },
];
