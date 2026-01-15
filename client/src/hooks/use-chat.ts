import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useWebSocket } from "./use-websocket";
import { useEffect } from "react";
import type { CreateGroupRequest, SendMessageRequest } from "@shared/schema";

export function useGroups() {
  return useQuery({
    queryKey: [api.groups.list.path],
    queryFn: async () => {
      const res = await fetch(api.groups.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return api.groups.list.responses[200].parse(await res.json());
    },
  });
}

export function useGroup(id: number | null) {
  return useQuery({
    queryKey: [api.groups.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.groups.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch group");
      return api.groups.get.responses[200].parse(await res.json());
    },
  });
}

export function useMessages(groupId: number | null) {
  return useQuery({
    queryKey: [api.messages.list.path, groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      const url = buildUrl(api.messages.list.path, { groupId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGroupRequest) => {
      const res = await fetch(api.groups.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create group");
      return api.groups.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.groups.list.path] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SendMessageRequest) => {
      const url = buildUrl(api.messages.send.path, { groupId: data.groupId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.messages.send.responses[201].parse(await res.json());
    },
    // We don't necessarily need to invalidate here if we rely on WS for updates,
    // but it's good practice for consistency or if WS fails.
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, variables.groupId] });
    },
  });
}

// Hook to manage real-time updates
export function useRealTimeChat(activeGroupId: number | null) {
  const { on, emit } = useWebSocket("/ws");
  const queryClient = useQueryClient();

  useEffect(() => {
    // Join room when active group changes
    if (activeGroupId) {
      emit("joinRoom", { groupId: activeGroupId });
    }
  }, [activeGroupId, emit]);

  useEffect(() => {
    // Listen for new messages
    on("message", (newMessage) => {
      // Update cache optimistically or invalidate
      queryClient.setQueryData(
        [api.messages.list.path, newMessage.groupId],
        (oldData: any[]) => {
          if (!oldData) return [newMessage];
          // Prevent duplicates
          if (oldData.some((msg: any) => msg.id === newMessage.id)) return oldData;
          return [...oldData, newMessage];
        }
      );
    });
  }, [on, queryClient]);

  return { emit };
}
