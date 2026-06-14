import { ChatWindow } from "@/components/chat/ChatWindow";

export default function Home() {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center pt-8 pb-4">
      <div className="text-center mb-8 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Document <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Intelligence</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Upload messy PDFs, reports, and handwritten notes. Ask questions and get exact, grounded citations instantly.
        </p>
      </div>
      
      <ChatWindow />
    </div>
  );
}
