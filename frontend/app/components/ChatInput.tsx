type ChatInputProps = {
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    loading: boolean;
    placeholder: string;
  };
  
  export default function ChatInput({
    input,
    setInput,
    onSend,
    loading,
    placeholder,
  }: ChatInputProps) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border rounded-lg px-4 py-2 placeholder-gray-500 text-gray-700"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
        />
        <button
          onClick={onSend}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    );
  }