"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PostList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const posts = useQuery(trpc.post.list.queryOptions());

  const createPost = useMutation(
    trpc.post.create.mutationOptions({
      onSuccess: () => {
        setTitle("");
        void queryClient.invalidateQueries({
          queryKey: trpc.post.list.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="mt-6 space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) createPost.mutate({ title: title.trim() });
        }}
        className="flex gap-2"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Write a new post…"
          maxLength={140}
        />
        <Button type="submit" disabled={createPost.isPending || !title.trim()}>
          Add
        </Button>
      </form>

      {posts.isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : posts.data && posts.data.length > 0 ? (
        <ul className="space-y-2">
          {posts.data.map((post) => (
            <li key={post.id}>
              <Card className="p-4">{post.title}</Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No posts yet. Add your first one above.
        </p>
      )}
    </div>
  );
}
