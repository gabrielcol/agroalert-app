"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { useT } from "@/lib/i18n/provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/admin/page-header";

export type SystemConfigRow = {
  defaultLocale: Locale;
  siteName: string;
};

export function SettingsEditor({
  config,
  canEdit,
}: {
  config: SystemConfigRow;
  canEdit: boolean;
}) {
  const t = useT();
  const s = t.config.settings;
  const trpc = useTRPC();
  const router = useRouter();

  const [state, setState] = useState<SystemConfigRow>(config);

  const updateM = useMutation(
    trpc.config.updateSystem.mutationOptions({
      onSuccess: () => {
        toast.success(t.config.crud.saveSuccess);
        router.refresh();
      },
      // Never surface raw server/tRPC error text — show a generic localized message.
      onError: () => toast.error(t.config.crud.saveError),
    }),
  );

  function save() {
    updateM.mutate({
      defaultLocale: state.defaultLocale,
      siteName: state.siteName,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.nav.settings}
        description={s.subtitle}
        actions={
          canEdit ? (
            <Button onClick={save} disabled={updateM.isPending}>
              <Save />
              {updateM.isPending ? t.config.crud.saving : s.save}
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{s.tabs.general}</TabsTrigger>
          <TabsTrigger value="languages">{s.tabs.languages}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{s.org.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site-name">{s.org.site}</Label>
                <Input
                  id="site-name"
                  value={state.siteName}
                  disabled={!canEdit}
                  maxLength={200}
                  onChange={(e) =>
                    setState((v) => ({ ...v, siteName: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="languages">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{s.languages.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground text-sm">
                {s.languages.description}
              </p>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="default-lang">{s.languages.default}</Label>
                <Select
                  value={state.defaultLocale}
                  disabled={!canEdit}
                  onValueChange={(v) =>
                    setState((cfg) => ({ ...cfg, defaultLocale: v as Locale }))
                  }
                >
                  <SelectTrigger id="default-lang" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LOCALE_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
