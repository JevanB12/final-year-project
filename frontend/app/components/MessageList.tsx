import { Message } from "../types/chat";

type MessageListProps = {
  messages: Message[];
};

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
      <div className="space-y-3">
        {messages.map((msg, index) => (
          <div key={index} className="space-y-1">
            <div
              className={`p-3 rounded-xl max-w-[75%] ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-200 text-black mr-auto whitespace-pre-line"
              }`}
            >
              {msg.text}
            </div>

            {msg.sender === "assistant" && msg.meta && (
              <div className="mr-auto max-w-[75%] rounded-lg bg-black text-green-400 text-xs p-3 whitespace-pre-wrap">
                {msg.meta}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}