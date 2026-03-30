import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { articleId, sessionId, message } = await request.json();

    if (!articleId || !sessionId || !message) {
      return new Response(
        JSON.stringify({ error: "articleId, sessionId, and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the article for context
    const { data: article } = await supabaseAdmin
      .from("articles")
      .select("title, content, excerpt, topic")
      .eq("id", articleId)
      .single();

    if (!article) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch article sources for additional context
    const { data: sources } = await supabaseAdmin
      .from("article_sources")
      .select("title, url, domain, snippet")
      .eq("article_id", articleId);

    // Fetch previous chat messages for this session
    const { data: previousMessages } = await supabaseAdmin
      .from("article_chats")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Store the user message
    await supabaseAdmin.from("article_chats").insert({
      article_id: articleId,
      session_id: sessionId,
      role: "user",
      content: message,
    });

    // Build the conversation for Claude
    const systemPrompt = `You are a knowledgeable fleet industry analyst assistant for The Fleet Desk, an independent fleet industry news publication. You are helping a reader understand an article they just read.

Article title: ${article.title}
Article topic: ${article.topic}
Article excerpt: ${article.excerpt}

Article content:
${article.content.replace(/<[^>]*>/g, "")}

${sources && sources.length > 0 ? `Sources referenced:\n${sources.map((s) => `- ${s.title} (${s.domain}): ${s.snippet || ""}`).join("\n")}` : ""}

Instructions:
- Answer questions about this article and the broader fleet industry topic it covers
- Be concise but thorough — aim for 2-4 paragraphs unless the question is simple
- Reference specific data points, companies, or regulations mentioned in the article when relevant
- If the user asks something not covered in the article, provide your general fleet industry knowledge but note that it goes beyond the article
- Use a professional but accessible tone — you're talking to fleet managers and industry professionals
- Do not make up statistics or specific numbers that aren't in the article`;

    const messages: Anthropic.MessageParam[] = [
      ...(previousMessages || []).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Stream the response
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }

          // Store the complete assistant response
          await supabaseAdmin.from("article_chats").insert({
            article_id: articleId,
            session_id: sessionId,
            role: "assistant",
            content: fullResponse,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
