"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { ROLE_NAMES, type AppRole } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  member: "Member",
  auditor: "Auditor (read-only)",
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
};

export function UserRoleTable({ currentUserId }: { currentUserId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const users = useQuery(trpc.admin.listUsers.queryOptions());

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.admin.listUsers.queryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.audit.list.queryKey(),
    });
  };

  // --- Create user dialog ---------------------------------------------------
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member" as AppRole,
  });

  const createUser = useMutation(
    trpc.admin.createUser.mutationOptions({
      onSuccess: (u) => {
        toast.success(`User ${u.email} created`);
        setCreateOpen(false);
        setForm({ name: "", email: "", password: "", role: "member" });
        invalidate();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  // --- Edit name dialog -----------------------------------------------------
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const updateUser = useMutation(
    trpc.admin.updateUser.mutationOptions({
      onSuccess: () => {
        toast.success("User updated");
        setEditTarget(null);
        invalidate();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  // --- Reset password dialog ------------------------------------------------
  const [pwTarget, setPwTarget] = useState<UserRow | null>(null);
  const [pwValue, setPwValue] = useState("");
  const setPassword = useMutation(
    trpc.admin.setPassword.mutationOptions({
      onSuccess: () => {
        toast.success("Password reset");
        setPwTarget(null);
        setPwValue("");
        // A reset writes a `user.set_password` audit row — refresh the audit list.
        invalidate();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  // --- Role + status mutations ----------------------------------------------
  const setRole = useMutation(
    trpc.admin.setRole.mutationOptions({
      onSuccess: (user) => {
        toast.success(`Role updated for ${user.email}`);
        invalidate();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const setBanned = useMutation(
    trpc.admin.setBanned.mutationOptions({
      onSuccess: (r) => {
        toast.success(r.banned ? "User deactivated" : "User reactivated");
        invalidate();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  if (users.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading users…</p>;
  }

  const canSubmitCreate =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.password.length >= 8;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add user
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-56">Role</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.data?.map((user) => {
            const current = ROLE_NAMES.includes(user.role as AppRole)
              ? (user.role as AppRole)
              : undefined;
            // An admin can't change their own role or deactivate themselves
            // from this table (lockout guard; also enforced server-side).
            const isSelf = user.id === currentUserId;
            const row: UserRow = {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              banned: user.banned,
            };
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={user.banned ? "destructive" : "secondary"}>
                    {user.banned ? "Inactive" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isSelf ? (
                    <span className="text-muted-foreground text-sm">
                      Your account
                    </span>
                  ) : (
                    <Select
                      value={current}
                      onValueChange={(role) =>
                        setRole.mutate({
                          userId: user.id,
                          role: role as AppRole,
                        })
                      }
                      disabled={setRole.isPending}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_NAMES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditTarget(row);
                          setEditName(row.name);
                        }}
                      >
                        Edit name
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setPwTarget(row);
                          setPwValue("");
                        }}
                      >
                        Reset password
                      </DropdownMenuItem>
                      {user.banned ? (
                        <DropdownMenuItem
                          onClick={() =>
                            setBanned.mutate({
                              userId: user.id,
                              banned: false,
                            })
                          }
                        >
                          Reactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isSelf}
                          onClick={() =>
                            setBanned.mutate({ userId: user.id, banned: true })
                          }
                        >
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Create user */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create an account with an initial password. Share it with the user
              out of band; they can change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cu-name">Name</Label>
              <Input
                id="cu-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-email">Email</Label>
              <Input
                id="cu-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-password">Initial password</Label>
              <Input
                id="cu-password"
                type="password"
                value={form.password}
                placeholder="At least 8 characters"
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) =>
                  setForm((f) => ({ ...f, role: role as AppRole }))
                }
              >
                <SelectTrigger id="cu-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_NAMES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createUser.mutate(form)}
              disabled={!canSubmitCreate || createUser.isPending}
            >
              {createUser.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit name */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit name</DialogTitle>
            <DialogDescription>{editTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="eu-name">Name</Label>
            <Input
              id="eu-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editTarget &&
                updateUser.mutate({
                  userId: editTarget.id,
                  name: editName.trim(),
                })
              }
              disabled={editName.trim() === "" || updateUser.isPending}
            >
              {updateUser.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog
        open={pwTarget !== null}
        onOpenChange={(open) => !open && setPwTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>{pwTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pw-value">New password</Label>
            <Input
              id="pw-value"
              type="password"
              value={pwValue}
              placeholder="At least 8 characters"
              onChange={(e) => setPwValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                pwTarget &&
                setPassword.mutate({
                  userId: pwTarget.id,
                  newPassword: pwValue,
                })
              }
              disabled={pwValue.length < 8 || setPassword.isPending}
            >
              {setPassword.isPending ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
