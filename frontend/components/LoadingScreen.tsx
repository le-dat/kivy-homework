interface LoadingScreenProps {
  message: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[#EDEADE] flex flex-col items-center justify-center gap-4 font-body text-[#111827]">
      <div className="animate-spin-ring w-10 h-10 border-4 border-[#072C2C]/20 border-t-[#072C2C] rounded-full" />
      <p className="text-sm tracking-wide">{message}</p>
    </div>
  );
}
