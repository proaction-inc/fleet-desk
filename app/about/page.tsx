import type { Metadata } from "next";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";

export const metadata: Metadata = {
  title: "About",
  description:
    "The Fleet Desk is an independent publication covering fleet management, transportation technology, safety, and regulatory news.",
};

export default function AboutPage() {
  return (
    <main className="pt-24 pb-16">
      <article className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Opening statement */}
        <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight leading-tight mb-8">
          The fleet industry moves fast.<br />
          The information should move faster.
        </h1>

        <div className="font-serif text-lg leading-relaxed text-foreground/90 space-y-6">
          <p>
            Every day, decisions worth millions are made by fleet managers, executives, and operators
            working with incomplete information. Trade publications are slow. PR-driven content is
            biased. And the stories that actually matter get buried under noise.
          </p>

          <p>
            <strong className="text-foreground">The Fleet Desk</strong> was built to change that. We are an
            independent publication dedicated to covering the fleet and transportation industry with
            the speed, depth, and editorial rigor it deserves.
          </p>

          {/* Content pillars */}
          <h2 className="text-2xl font-bold font-serif tracking-tight pt-4">
            What we cover
          </h2>

          <p>
            Our coverage spans the issues that define the modern fleet landscape. We track the
            technology reshaping fleet operations -- from telematics platforms and connected vehicles
            to the software stack powering the next generation of fleet management. We follow the
            regulatory shifts from FMCSA, DOT, and state agencies that change how fleets operate
            overnight. We report on the safety programs, compliance standards, and emerging technologies
            that protect drivers and reduce risk. And we cover the deals -- the mergers, acquisitions,
            funding rounds, and partnerships that signal where the industry is headed.
          </p>

          {/* Distribution */}
          <h2 className="text-2xl font-bold font-serif tracking-tight pt-4">
            How we deliver it
          </h2>

          <p>
            <strong className="text-foreground">Fleet Desk Daily</strong> is our LinkedIn digest -- a
            quick-hit morning scan of the top fleet industry stories, published every weekday. It is
            the fastest way to stay current without the noise.
          </p>

          <p>
            <strong className="text-foreground">Fleet Desk Weekly</strong> goes deeper. Delivered to your
            inbox every Friday, it brings extended analysis, original reporting, and the stories you
            might have missed during the week. It is the newsletter fleet professionals actually read.
          </p>

          {/* Team */}
          <h2 className="text-2xl font-bold font-serif tracking-tight pt-4">
            Who we are
          </h2>

          <p>
            The Fleet Desk is built by a team of fleet industry insiders and technology professionals
            who believe this industry deserves better coverage. We combine deep domain expertise with
            modern editorial practices to deliver information that is timely, accurate, and useful.
          </p>

          <p className="text-muted text-base italic">
            No press releases rewritten as news. No pay-to-play coverage. Just the stories
            that matter, reported independently.
          </p>
        </div>

        {/* Newsletter signup */}
        <div id="newsletter" className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold font-serif tracking-tight mb-2">
            Subscribe to Fleet Desk Weekly
          </h2>
          <p className="text-sm text-muted mb-6">
            The top fleet industry stories, analysis, and insights -- delivered every Friday.
          </p>
          <div className="max-w-md">
            <NewsletterSignup />
          </div>
        </div>
      </article>
    </main>
  );
}
