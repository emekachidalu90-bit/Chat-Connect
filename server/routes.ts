import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertGroupSchema, insertMessageSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Middleware to check auth (simple wrapper for now)
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Groups
  app.get(api.groups.list.path, requireAuth, async (req, res) => {
    // Only show groups user is part of (or all for now, user requested "Group System")
    // WhatsApp shows groups you are in.
    const userId = req.user!.id; // from passport
    const userGroups = await storage.getUserGroups(userId);
    res.json(userGroups);
  });

  app.post(api.groups.create.path, requireAuth, async (req, res) => {
    try {
      const input = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(input);
      
      // Add creator as admin
      const userId = req.user!.id;
      await storage.addGroupMember(group.id, userId, true);

      res.status(201).json(group);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
    }
  });

  app.get(api.groups.get.path, requireAuth, async (req, res) => {
    const groupId = parseInt(req.params.id);
    const group = await storage.getGroup(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check membership? WhatsApp allows viewing basic info if you have link? 
    // For now, let's enforce membership for details or at least allow fetching if needed.
    // Let's return members too.
    const members = await storage.getGroupMembers(groupId);
    res.json({ ...group, members });
  });

  app.post(api.groups.join.path, requireAuth, async (req, res) => {
     const groupId = parseInt(req.params.id);
     const userId = req.user!.id;
     
     // Check if already member
     const isMember = await storage.isGroupMember(groupId, userId);
     if (isMember) {
       return res.json({ message: "Already a member" });
     }
     
     await storage.addGroupMember(groupId, userId);
     res.json({ message: "Joined group" });
  });

  // Messages
  app.get(api.messages.list.path, requireAuth, async (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user!.id;

    if (!(await storage.isGroupMember(groupId, userId))) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const msgs = await storage.getGroupMessages(groupId);
    res.json(msgs);
  });

  app.post(api.messages.send.path, requireAuth, async (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user!.id;

    if (!(await storage.isGroupMember(groupId, userId))) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    try {
      const input = z.object({ content: z.string(), imageUrl: z.string().optional() }).parse(req.body);
      const msg = await storage.createMessage({
        groupId,
        senderId: userId,
        content: input.content,
        imageUrl: input.imageUrl,
      });
      
      // Get full message with sender for broadcast
      const fullMsg = (await storage.getGroupMessages(groupId)).find(m => m.id === msg.id);

      // Broadcast to WS
      broadcastMessage(groupId, fullMsg);

      res.status(201).json(msg);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map groupId -> Set<WebSocket>
  const rooms = new Map<number, Set<WebSocket>>();

  wss.on('connection', (ws, req) => {
    // Basic auth check for WS could be added here via cookie parsing, 
    // but for simplicity we'll assume open or handle logic in message.
    // Ideally use session middleware with WS.

    let currentGroupId: number | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join') {
          const groupId = message.groupId;
          if (currentGroupId) {
             rooms.get(currentGroupId)?.delete(ws);
          }
          currentGroupId = groupId;
          if (!rooms.has(groupId)) {
            rooms.set(groupId, new Set());
          }
          rooms.get(groupId)!.add(ws);
        }
      } catch (e) {
        console.error("WS Error", e);
      }
    });

    ws.on('close', () => {
      if (currentGroupId && rooms.has(currentGroupId)) {
        rooms.get(currentGroupId)!.delete(ws);
      }
    });
  });

  function broadcastMessage(groupId: number, message: any) {
    if (rooms.has(groupId)) {
      const payload = JSON.stringify({ type: 'message', data: message });
      rooms.get(groupId)!.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  // Seeding
  await seedData();

  return httpServer;
}

async function seedData() {
  const groups = await storage.getGroups();
  if (groups.length === 0) {
    // Create a default public group
    const publicGroup = await storage.createGroup({
      name: "General Chat",
      description: "A place for everyone to chat",
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=GC"
    });
    console.log("Seeded 'General Chat' group");
  }
}
