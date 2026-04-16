"use client";

import ChatHeader from "./components/ChatHeader";
import ChatInput from "./components/ChatInput";
import ChatStatus from "./components/ChatStatus";
import MessageList from "./components/MessageList";
import { useChatFlow } from "./hooks/useChatFlow";

export default function Home() {
  const {
    input,
    setInput,
    messages,
    loading,
    avatarTone,
    avatarIntensity,
    conversationComplete,
    awaitingSubIssue,
    conversationMode,
    pendingSelectedThread,
    resolvedThread,
    sendMessage,
    inputPlaceholder,
    statusText,
  } = useChatFlow();

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 flex flex-col h-[80vh]">
        <ChatHeader avatarTone={avatarTone} />

        <ChatStatus
          statusText={statusText}
          avatarTone={avatarTone}
          avatarIntensity={avatarIntensity}
        />

        <MessageList messages={messages} />

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          loading={loading}
          placeholder={inputPlaceholder}
        />
      </div>
    </main>
  );
}