"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  articleTitle: string;
  articlePlainText: string;
  highlightPlainStart: number | null;
  highlightPlainEnd: number | null;
  disabled?: boolean;
};

export default function ArticleChatPanel({
  articleTitle,
  articlePlainText,
  highlightPlainStart,
  highlightPlainEnd,
  disabled,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending || disabled) {
      return;
    }
    const snapshot = messages;
    setError(null);
    setPending(true);
    const nextMsgs: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMsgs);
    setInput("");

    try {
      const res = await fetch("/api/article-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs,
          articleTitle,
          articlePlainText,
          highlightPlainStart,
          highlightPlainEnd,
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(j?.error ?? res.statusText);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let assistant = "";
      setMessages([...nextMsgs, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        assistant += decoder.decode(value, { stream: true });
        setMessages([
          ...nextMsgs,
          { role: "assistant", content: assistant },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
      setMessages(snapshot);
    } finally {
      setPending(false);
    }
  }, [
    articlePlainText,
    articleTitle,
    disabled,
    highlightPlainEnd,
    highlightPlainStart,
    input,
    messages,
    pending,
  ]);

  return (
    <Card className="flex h-[min(70vh,36rem)] flex-col p-4">
      <h2 className="text-sm font-medium">Article chat</h2>
      <p className="text-muted-foreground mt-1 text-xs">
        {highlightPlainStart != null && highlightPlainEnd != null
          ? "Scoped to your selected highlight."
          : "Ask about the whole article."}
      </p>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
        <div className="border-border flex min-h-[8rem] flex-1 flex-col gap-2 overflow-y-auto rounded-md border bg-muted/20 p-2 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Ask a question to get a personalized explanation.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-4 rounded-md bg-primary/10 px-2 py-1.5"
                    : "mr-4 rounded-md bg-background px-2 py-1.5"
                }
              >
                <span className="text-muted-foreground text-[0.65rem] uppercase">
                  {m.role === "user" ? "You" : "Assistant"}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
        </div>
        {error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : null}
        <div className="flex gap-2">
          <textarea
            className="border-border min-h-[4rem] flex-1 resize-y rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            placeholder="Type a question…"
            value={input}
            disabled={pending || disabled}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button
            type="button"
            className="self-end"
            disabled={pending || disabled || !input.trim()}
            onClick={() => void send()}
          >
            {pending ? "…" : "Send"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
