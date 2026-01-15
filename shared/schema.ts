import { pgTable, text, serial, integer, boolean, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// === TABLE DEFINITIONS ===
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: text("user_id").notNull().references(() => users.id), // users.id is varchar from auth
  isAdmin: boolean("is_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  senderId: text("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"), // For image messages
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  messages: many(messages),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  messages: many(messages),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  group: one(groups, {
    fields: [messages.groupId],
    references: [groups.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

// User types (from auth)
export type User = typeof users.$inferSelect;

// Group types
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type CreateGroupRequest = InsertGroup;

// Message types
export type Message = typeof messages.$inferSelect & {
  sender?: User; // Joined in responses
};
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type SendMessageRequest = {
  content: string;
  groupId: number;
  imageUrl?: string;
};

// Responses
export type GroupWithMembers = Group & {
  members?: (typeof groupMembers.$inferSelect & { user: User })[];
};

export type MessageResponse = Message;
