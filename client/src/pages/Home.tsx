import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { useAuth } from "@/hooks/use-auth";
import { useRealTimeChat } from "@/hooks/use-chat";
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // Initialize real-time connection
  useRealTimeChat(selectedGroupId);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Loading WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Sidebar - Always visible on desktop, hidden on mobile if chat selected */}
      <div className={`${selectedGroupId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
        <Sidebar 
          selectedGroupId={selectedGroupId} 
          onSelectGroup={setSelectedGroupId} 
        />
      </div>

      {/* Chat Area */}
      <div className={`${!selectedGroupId ? 'hidden md:flex' : 'flex'} flex-1 h-full flex-col relative`}>
        {selectedGroupId ? (
          <>
            {/* Mobile Back Button Overlay - handled inside ChatWindow usually or here */}
            <div className="md:hidden absolute top-4 left-4 z-50">
              <Button variant="ghost" size="sm" onClick={() => setSelectedGroupId(null)}>
                ← Back
              </Button>
            </div>
            <ChatWindow groupId={selectedGroupId} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card p-8 rounded-3xl shadow-2xl border border-border/50 text-center space-y-8 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            ChatApp
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Connect with friends and family in real-time with encrypted messaging.
          </p>

          <div className="pt-8">
            <Button 
              size="lg" 
              className="w-full h-12 text-base font-semibold shadow-xl shadow-primary/20"
              onClick={() => window.location.href = "/api/login"}
            >
              Log in with Replit
            </Button>
            <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Secure & Encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-secondary/10 text-center h-full">
      <div className="w-64 h-64 bg-secondary/20 rounded-full flex items-center justify-center mb-8 relative">
        <div className="absolute inset-0 border border-dashed border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
        <MessageSquare className="w-32 h-32 text-muted-foreground/20" />
      </div>
      <h2 className="text-3xl font-display font-bold text-foreground mb-2">
        Welcome to ChatApp
      </h2>
      <p className="text-muted-foreground max-w-md">
        Select a conversation from the sidebar or start a new group to begin messaging.
      </p>
      <div className="mt-8 flex gap-4 text-xs text-muted-foreground border-t border-border pt-8">
        <span className="flex items-center gap-2">
          <Lock className="w-3 h-3" /> End-to-end Encrypted
        </span>
      </div>
    </div>
  );
}
