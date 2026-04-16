type ChatStatusProps = {
    statusText: string;
    avatarTone: string;
    avatarIntensity: number;
  };
  
  export default function ChatStatus({
    statusText,
    avatarTone,
    avatarIntensity,
  }: ChatStatusProps) {
    return (
      <div className="mb-3 text-xs text-gray-500">
        mode: {statusText}
        {" | "}
        avatar_emotion: {avatarTone}
        {" | "}
        avatar_intensity: {avatarIntensity.toFixed(2)}
      </div>
    );
  }