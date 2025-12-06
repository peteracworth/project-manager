"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface ChatPanelProps {
  entityType: "project" | "user" | "item" | "static_info";
  entityId: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ChatPanel({ entityType, entityId, className = "", style }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages when entity changes
  useEffect(() => {
    if (entityId) {
      fetchMessages();
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [entityType, entityId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messages?entityType=${entityType}&entityId=${entityId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send message:", errorData);

        let errorMessage = "Failed to send message.";
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        alert(errorMessage);
        return;
      }

      const data = await response.json();
      setMessages([...messages, data.message]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex flex-col bg-gray-50 ${className}`} style={style}>
      {/* Chat Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Comments</h3>
          <Badge variant="outline" className="ml-auto">
            {messages.length}
          </Badge>
        </div>
      </div>

      {/* Messages List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">
              Loading comments...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No comments yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {message.user?.name || "Unknown User"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Leave a comment..."
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newMessage.trim() || sendingMessage}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

