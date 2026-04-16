import Avatar from "./Avatar";

type ChatHeaderProps = {
  avatarTone: string;
};

export default function ChatHeader({ avatarTone }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-2">
      <Avatar tone={avatarTone} size={58} />
      <div>
        <h1 className="text-2xl font-semibold mb-1">Your wellbeing assistant</h1>
        <p className="text-gray-500 text-sm">
          Talk about your day, your energy, or anything on your mind.
        </p>
      </div>
    </div>
  );
}