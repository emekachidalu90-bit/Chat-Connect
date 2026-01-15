import { useState } from "react";
import { useGroups, useCreateGroup } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, MessageSquare, Hash, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  selectedGroupId: number | null;
  onSelectGroup: (id: number) => void;
}

export function Sidebar({ selectedGroupId, onSelectGroup }: SidebarProps) {
  const { data: groups, isLoading } = useGroups();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const filteredGroups = groups?.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-border h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm">{user?.firstName} {user?.lastName}</h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="flex gap-1">
          <CreateGroupDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
            <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            className="pl-9 bg-secondary/50 border-transparent focus:bg-background transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Loading chats...</div>
        ) : filteredGroups?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <MessageSquare className="h-8 w-8 opacity-20" />
            <p>No groups found</p>
            <Button variant="link" onClick={() => setIsCreateOpen(true)} className="text-primary">
              Create one?
            </Button>
          </div>
        ) : (
          filteredGroups?.map((group) => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={cn(
                "w-full p-3 flex items-center gap-3 rounded-xl transition-all duration-200 text-left group",
                selectedGroupId === group.id 
                  ? "bg-primary/10 hover:bg-primary/15" 
                  : "hover:bg-secondary/50"
              )}
            >
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold transition-transform group-hover:scale-105",
                selectedGroupId === group.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "bg-secondary text-secondary-foreground"
              )}>
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.name} className="h-full w-full object-cover rounded-full" />
                ) : (
                  group.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={cn(
                    "font-semibold truncate",
                    selectedGroupId === group.id ? "text-primary" : "text-foreground"
                  )}>
                    {group.name}
                  </h3>
                  {/* Could add last message time here */}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {group.description || "No description"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createGroup = useCreateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup.mutate({ name, description }, {
      onSuccess: () => {
        onOpenChange(false);
        setName("");
        setDescription("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Plus className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Project Alpha"
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What's this group about?"
              className="bg-secondary/50"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createGroup.isPending || !name.trim()}>
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
