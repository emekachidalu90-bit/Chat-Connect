import { useState, useRef, useEffect } from "react";
import { useGroup, useMessages, useSendMessage } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Smile, MoreVertical, Phone, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWindowProps {
  groupId: number;
}

export function ChatWindow({ groupId }: ChatWindowProps) {
  const { data: group } = useGroup(groupId);
  const { data: messages, isLoading } = useMessages(groupId);
  const { user } = useAuth();
  const sendMessage = useSendMessage();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    sendMessage.mutate({
      groupId,
      content: inputValue,
    });
    setInputValue("");
  };

  const handleEmojiClick = (emojiObject: any) => {
    setInputValue((prev) => prev + emojiObject.emoji);
    setShowEmoji(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-full">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-secondary"></div>
          <div className="h-4 w-32 rounded bg-secondary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-secondary/10 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {group?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-base">{group?.name}</h2>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {group?.description || `${group?.members?.length || 0} members`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex hover:text-primary">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex hover:text-primary">
            <Phone className="h-5 w-5" />
          </Button>
          <div className="w-px h-6 bg-border mx-2 hidden sm:block"></div>
          <Button variant="ghost" size="icon" className="hover:text-primary">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-primary">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 chat-bg relative"
        ref={scrollRef}
      >
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages?.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%] sm:max-w-[75%]",
                  isMe ? "ml-auto flex-row-reverse" : ""
                )}
              >
                {!isMe && (
                  <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                    {showAvatar ? (
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={msg.sender?.profileImageUrl} />
                        <AvatarFallback className="text-xs bg-secondary">
                          {msg.sender?.firstName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : <div className="w-8" />}
                  </div>
                )}

                <div className={cn(
                  "relative p-3 shadow-sm text-sm group",
                  isMe 
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                    : "bg-card border border-border rounded-2xl rounded-tl-sm"
                )}>
                  {!isMe && showAvatar && (
                    <p className="text-xs font-bold mb-1 opacity-70 text-primary">
                      {msg.sender?.firstName}
                    </p>
                  )}
                  
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  
                  <div className={cn(
                    "text-[10px] mt-1 text-right opacity-70",
                    isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.createdAt!), "h:mm a")}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border">
        <form 
          onSubmit={handleSend}
          className="max-w-4xl mx-auto flex items-end gap-2 bg-secondary/30 p-2 rounded-2xl border border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
        >
          <div className="flex gap-1 pb-1">
            <Popover open={showEmoji} onOpenChange={setShowEmoji}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary hover:bg-secondary">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-full p-0 border-none bg-transparent shadow-none mb-2">
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  width={300}
                  height={400}
                />
              </PopoverContent>
            </Popover>
            
            <Button type="button" variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary hover:bg-secondary">
              <ImageIcon className="h-5 w-5" />
            </Button>
          </div>

          <Input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3 h-auto min-h-[44px] max-h-32"
          />

          <Button 
            type="submit" 
            disabled={!inputValue.trim() || sendMessage.isPending}
            size="icon"
            className={cn(
              "rounded-xl h-10 w-10 shrink-0 transition-all duration-200",
              inputValue.trim() 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90" 
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
