import { 
  users, groups, groupMembers, messages,
  type User, type InsertUser, type Group, type InsertGroup, 
  type Message, type InsertMessage, type GroupWithMembers 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage"; // Reuse auth storage for user ops

export interface IStorage {
  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroups(): Promise<Group[]>;
  getUserGroups(userId: string): Promise<Group[]>;
  
  // Group Members
  addGroupMember(groupId: number, userId: string, isAdmin?: boolean): Promise<void>;
  getGroupMembers(groupId: number): Promise<(typeof groupMembers.$inferSelect & { user: User })[]>;
  isGroupMember(groupId: number, userId: string): Promise<boolean>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getGroupMessages(groupId: number): Promise<(Message & { sender: User })[]>;
}

export class DatabaseStorage implements IStorage {
  // Groups
  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db.insert(groups).values(insertGroup).returning();
    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    // Get groups where user is a member
    const memberGroups = await db
      .select({
        group: groups,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));
    
    return memberGroups.map(mg => mg.group);
  }

  // Group Members
  async addGroupMember(groupId: number, userId: string, isAdmin: boolean = false): Promise<void> {
    await db.insert(groupMembers).values({
      groupId,
      userId,
      isAdmin,
    });
  }

  async getGroupMembers(groupId: number): Promise<(typeof groupMembers.$inferSelect & { user: User })[]> {
    const members = await db
      .select({
        member: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return members.map(m => ({ ...m.member, user: m.user }));
  }

  async isGroupMember(groupId: number, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return !!member;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getGroupMessages(groupId: number): Promise<(Message & { sender: User })[]> {
    const results = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.groupId, groupId))
      .orderBy(messages.createdAt); // Oldest first for chat history

    return results.map(r => ({ ...r.message, sender: r.sender }));
  }
}

export const storage = new DatabaseStorage();
