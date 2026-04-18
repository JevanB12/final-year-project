"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatHeader from "./components/ChatHeader";
import ChatInput from "./components/ChatInput";
import ChatStatus from "./components/ChatStatus";
import MessageList from "./components/MessageList";
import { useChatFlow } from "./hooks/useChatFlow";
import { clearAuthSession, getAuthUser, isAuthenticated, type AuthUser } from "./lib/auth";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const {
    input,
    setInput,
    messages,
    loading,
    avatarTone,
    avatarIntensity,
    sendMessage,
    inputPlaceholder,
    statusText,
  } = useChatFlow();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/signin");
      return;
    }

    setUser(getAuthUser());
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearAuthSession();
    router.replace("/signin");
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
          <aside className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-5 lg:sticky lg:top-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-[0.2em]">
              Navigation
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Chat</p>
                <p className="text-xs text-slate-500 mt-1">
                  Daily check-in conversation
                </p>
              </div>

              <Link
                href="/analytics"
                className="block rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50 transition"
              >
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-slate-500 mt-1">
                  View your recent progress
                </p>
              </Link>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-900">
                {user?.username || "Signed in"}
              </p>
              <p className="text-xs text-slate-500 mt-1">{user?.email}</p>

              <button
                onClick={handleLogout}
                className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Log out
              </button>
            </div>
          </aside>

          <section className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-6 md:p-7 flex flex-col h-[82vh]">
            <div className="mb-5">
              <ChatHeader avatarTone={avatarTone} />
            </div>

            <div className="mb-5">
              <ChatStatus
                statusText={statusText}
                avatarTone={avatarTone}
                avatarIntensity={avatarIntensity}
              />
            </div>

            <div className="flex-1 min-h-0">
              <MessageList messages={messages} />
            </div>

            <div className="mt-5">
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={sendMessage}
                loading={loading}
                placeholder={inputPlaceholder}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}