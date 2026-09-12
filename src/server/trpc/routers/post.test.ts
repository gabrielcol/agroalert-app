// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";
import type { db as realDb } from "@/lib/db";

// A minimal fake Prisma client — the router only touches `post`.
function fakeDb() {
  return {
    post: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: "1", title: "hello", authorId: "u1", createdAt: new Date() },
        ]),
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "2",
        createdAt: new Date(),
        ...data,
      })),
    },
  } as unknown as typeof realDb;
}

const signedIn = { id: "u1", name: "Test", email: "test@example.com" };

describe("post router", () => {
  it("rejects unauthenticated access", async () => {
    const caller = createCaller(makeCtx(fakeDb(), null));
    await expect(caller.post.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("lists posts for the signed-in user", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, signedIn));
    const posts = await caller.post.list();
    expect(posts).toHaveLength(1);
    expect(db.post.findMany).toHaveBeenCalledWith({
      where: { authorId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates a post scoped to the signed-in user", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, signedIn));
    const post = await caller.post.create({ title: "new post" });
    expect(post.title).toBe("new post");
    expect(db.post.create).toHaveBeenCalledWith({
      data: { title: "new post", authorId: "u1" },
    });
  });

  it("rejects empty titles", async () => {
    const caller = createCaller(makeCtx(fakeDb(), signedIn));
    await expect(caller.post.create({ title: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
