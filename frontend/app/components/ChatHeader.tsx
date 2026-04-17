import Avatar from "./Avatar";

type ChatHeaderProps = {
  avatarTone: string;
};

export default function ChatHeader({ avatarTone }: ChatHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center mb-6">
      {/* Avatar */}
      <div className="mb-4">
        <Avatar tone={avatarTone} size={96} />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold text-slate-900">
        Your wellbeing assistant
      </h1>

      {/* Subtitle */}
      <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
        Talk about your day, your energy, or anything on your mind.
      </p>
    </div>
  );
}