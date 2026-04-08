"use client";

import { useState } from "react";

type ChatResponse = {
  reply: string;
  emotion: string;
  intensity: number;
};

type Message = {
  sender: "user" | "assistant";
  text: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data: ChatResponse = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: `${data.reply} | emotion: ${data.emotion} | intensity: ${data.intensity}`,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Error: could not connect to backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 flex flex-col h-[80vh]">
        <h1 className="text-2xl font-bold mb-4">FYP Chat Prototype</h1>

        <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl max-w-[75%] ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white ml-auto"
                      : "bg-gray-200 text-black mr-auto"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 placeholder-gray-500 text-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}

//test version