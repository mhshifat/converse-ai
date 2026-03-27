'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  clampWidgetPositionOffsetPx,
  mergeWidgetConfig,
  parseEmbedHiddenPathsFromTextarea,
  parseEmbedHiddenSubdomainsFromTextarea,
  widgetConfigToStorage,
  type ChatbotWidgetConfig,
  type WidgetPathInsetRule,
  WIDGET_PATH_INSETS_MAX,
} from '@/lib/chatbot-widget-config';
import { ChatbotPreview } from './chatbot-preview';
import { ColorPicker } from '@/components/ui/color-picker';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 400;
const PREVIEW_DEBOUNCE_MS = 100;

interface ProjectChatbotTabProps {
  projectId: string;
  initialChatbot: {
    id: string;
    name: string;
    config: Record<string, unknown>;
    apiKey?: string;
  } | null;
}

export function ProjectChatbotTab({ projectId, initialChatbot }: ProjectChatbotTabProps) {
  const [chatbot, setChatbot] = useState(initialChatbot);
  const [config, setConfig] = useState<ChatbotWidgetConfig>(() =>
    mergeWidgetConfig(initialChatbot?.config)
  );
  const [hiddenPathsText, setHiddenPathsText] = useState(() =>
    (mergeWidgetConfig(initialChatbot?.config).embedHiddenPaths ?? []).join('\n')
  );
  const [hiddenSubdomainsText, setHiddenSubdomainsText] = useState(() =>
    (mergeWidgetConfig(initialChatbot?.config).embedHiddenSubdomains ?? []).join('\n')
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const debouncedConfig = useDebouncedValue(config, PREVIEW_DEBOUNCE_MS);
  /** Only hydrate local `config` from server when switching chatbots — not after each save (new config ref would retrigger persist in a loop). */
  const syncedServerConfigForChatbotIdRef = useRef<string | null>(null);

  useEffect(() => {
    syncedServerConfigForChatbotIdRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!chatbot?.id) return;
    if (syncedServerConfigForChatbotIdRef.current === chatbot.id) return;
    syncedServerConfigForChatbotIdRef.current = chatbot.id;
    const merged = mergeWidgetConfig(chatbot.config);
    setConfig(merged);
    setHiddenPathsText((merged.embedHiddenPaths ?? []).join('\n'));
    setHiddenSubdomainsText((merged.embedHiddenSubdomains ?? []).join('\n'));
  }, [chatbot]);

  const getOrCreate = trpc.chatbot.getOrCreateForProject.useMutation({
    onSuccess: (data) => setChatbot(data),
  });

  const updateConfigMutation = trpc.chatbot.updateConfig.useMutation({
    onSuccess: (data) => setChatbot((c) => (c ? { ...c, ...data } : data)),
  });

  useEffect(() => {
    if (!chatbot?.id) return;
    const t = setTimeout(() => {
      updateConfigMutation.mutate({
        chatbotId: chatbot.id,
        config: widgetConfigToStorage(config),
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [config, chatbot?.id]);

  const patch = useCallback(
    <K extends keyof ChatbotWidgetConfig>(key: K, value: ChatbotWidgetConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updatePathInsetRule = useCallback((index: number, rule: WidgetPathInsetRule) => {
    setConfig((prev) => ({
      ...prev,
      widgetPathInsets: prev.widgetPathInsets.map((r, i) => (i === index ? rule : r)),
    }));
  }, []);

  const removePathInsetRule = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      widgetPathInsets: prev.widgetPathInsets.filter((_, i) => i !== index),
    }));
  }, []);

  const addPathInsetRule = useCallback(() => {
    setConfig((prev) => {
      if (prev.widgetPathInsets.length >= WIDGET_PATH_INSETS_MAX) return prev;
      return {
        ...prev,
        widgetPathInsets: [...prev.widgetPathInsets, { pathPrefix: '/example' }],
      };
    });
  }, []);

  const patchNested = useCallback(
    <S extends keyof Pick<ChatbotWidgetConfig, 'bubble' | 'popup' | 'header' | 'footer' | 'messages'>>(
      section: S,
      value: Partial<ChatbotWidgetConfig[S]>
    ) => {
      setConfig((prev) => ({
        ...prev,
        [section]: { ...prev[section], ...value },
      }));
    },
    []
  );

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    e.target.value = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload/logo', { method: 'POST', body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed');
        return;
      }
      if (data.url) {
        patchNested('header', { logoUrl: data.url });
        toast.success('Logo uploaded');
      }
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  if (!chatbot && !getOrCreate.isPending) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground mb-4">
          Create a chatbot to customize its design and get the embed code.
        </p>
        <Button onClick={() => getOrCreate.mutate({ projectId })} disabled={getOrCreate.isPending}>
          {getOrCreate.isPending ? 'Creating…' : 'Create chatbot'}
        </Button>
      </div>
    );
  }

  if (!chatbot) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left: customization form */}
      <div className="min-w-0 flex-1 space-y-6">
        {/* App information (branding) */}
        <Section title="App information (branding)">
          <p className="text-muted-foreground text-sm mb-4">
            Name, logo, and colors shown in the chat widget header and bubbles. Set these when creating your chatbot so the widget matches your brand.
          </p>
          <Field label="App name">
            <Input
              value={config.header.title}
              onChange={(e) => patchNested('header', { title: e.target.value })}
              placeholder="e.g. Support, Chat, Help"
            />
          </Field>
          <Field label="Logo">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  <ImagePlus className="size-4 mr-2" />
                  {logoUploading ? 'Uploading…' : 'Upload logo'}
                </Button>
                <span className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, SVG (max 2 MB)</span>
              </div>
              <Input
                value={config.header.logoUrl ?? ''}
                onChange={(e) => patchNested('header', { logoUrl: e.target.value || undefined })}
                placeholder="Or paste logo URL"
              />
            </div>
          </Field>
          <Field label="Subtitle or tagline (optional)">
            <Input
              value={config.header.subtitle ?? ''}
              onChange={(e) => patchNested('header', { subtitle: e.target.value || undefined })}
              placeholder="e.g. Ask us anything"
            />
          </Field>
          <Field label="Status text">
            <Input
              value={config.header.statusText ?? 'Online'}
              onChange={(e) => patchNested('header', { statusText: e.target.value || 'Online' })}
              placeholder="e.g. Online, Here to help"
            />
          </Field>
          <Field label="Brand / primary color">
            <ColorPicker
              value={config.primaryColor}
              onChange={(v) => {
                setConfig((prev) => ({
                  ...prev,
                  primaryColor: v,
                  bubble: { ...prev.bubble, backgroundColor: v },
                  messages: { ...prev.messages, userBubbleBackground: v },
                  footer: { ...prev.footer, sendButtonBackground: v },
                }));
              }}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.showPoweredBy}
              onCheckedChange={(v) => patch('showPoweredBy', v)}
            />
            <Label>Show &quot;Powered by ConverseAI&quot; in widget footer</Label>
          </div>
        </Section>

        {/* General */}
        <Section title="General">
          <Field label="Position">
            <Select
              value={config.position}
              onValueChange={(v) => patch('position', v as ChatbotWidgetConfig['position'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom right</SelectItem>
                <SelectItem value="bottom-left">Bottom left</SelectItem>
                <SelectItem value="top-right">Top right</SelectItem>
                <SelectItem value="top-left">Top left</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Extra inset from each screen edge (px), added to the default margin. Only the pair that matches your
              corner is used (e.g. bottom-right uses bottom + right); the others stay saved if you switch position.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From top">
                <Input
                  type="number"
                  min={-80}
                  max={400}
                  value={config.widgetInsetTopPx ?? 0}
                  onChange={(e) =>
                    patch(
                      'widgetInsetTopPx',
                      clampWidgetPositionOffsetPx(Number(e.target.value) || 0)
                    )
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="From right">
                <Input
                  type="number"
                  min={-80}
                  max={400}
                  value={config.widgetInsetRightPx ?? 0}
                  onChange={(e) =>
                    patch(
                      'widgetInsetRightPx',
                      clampWidgetPositionOffsetPx(Number(e.target.value) || 0)
                    )
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="From bottom">
                <Input
                  type="number"
                  min={-80}
                  max={400}
                  value={config.widgetInsetBottomPx ?? 0}
                  onChange={(e) =>
                    patch(
                      'widgetInsetBottomPx',
                      clampWidgetPositionOffsetPx(Number(e.target.value) || 0)
                    )
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="From left">
                <Input
                  type="number"
                  min={-80}
                  max={400}
                  value={config.widgetInsetLeftPx ?? 0}
                  onChange={(e) =>
                    patch(
                      'widgetInsetLeftPx',
                      clampWidgetPositionOffsetPx(Number(e.target.value) || 0)
                    )
                  }
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium">Path-specific offsets</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Override the insets above on matching URL paths (same prefix rules as &quot;Hide widget&quot;). If several
                rules match, the longest path wins. Leave a number blank to keep the global inset for that edge. Rules
                with no inset values are not saved. The live widget also checks the path about once per second so SPAs
                pick up changes without a full reload.
              </p>
            </div>
            <div className="space-y-4">
              {config.widgetPathInsets.map((rule, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-md border border-border/50 bg-background p-3 sm:grid-cols-[1fr_repeat(4,minmax(0,1fr))_auto] sm:items-end"
                >
                  <Field label="Path prefix">
                    <Input
                      className="font-mono text-sm"
                      placeholder="/pricing"
                      value={rule.pathPrefix}
                      onChange={(e) =>
                        updatePathInsetRule(index, { ...rule, pathPrefix: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Top (px)">
                    <Input
                      type="number"
                      min={-80}
                      max={400}
                      placeholder="—"
                      value={rule.widgetInsetTopPx ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = { ...rule };
                        if (v === '') delete next.widgetInsetTopPx;
                        else next.widgetInsetTopPx = clampWidgetPositionOffsetPx(Number(v) || 0);
                        updatePathInsetRule(index, next);
                      }}
                    />
                  </Field>
                  <Field label="Right (px)">
                    <Input
                      type="number"
                      min={-80}
                      max={400}
                      placeholder="—"
                      value={rule.widgetInsetRightPx ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = { ...rule };
                        if (v === '') delete next.widgetInsetRightPx;
                        else next.widgetInsetRightPx = clampWidgetPositionOffsetPx(Number(v) || 0);
                        updatePathInsetRule(index, next);
                      }}
                    />
                  </Field>
                  <Field label="Bottom (px)">
                    <Input
                      type="number"
                      min={-80}
                      max={400}
                      placeholder="—"
                      value={rule.widgetInsetBottomPx ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = { ...rule };
                        if (v === '') delete next.widgetInsetBottomPx;
                        else next.widgetInsetBottomPx = clampWidgetPositionOffsetPx(Number(v) || 0);
                        updatePathInsetRule(index, next);
                      }}
                    />
                  </Field>
                  <Field label="Left (px)">
                    <Input
                      type="number"
                      min={-80}
                      max={400}
                      placeholder="—"
                      value={rule.widgetInsetLeftPx ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = { ...rule };
                        if (v === '') delete next.widgetInsetLeftPx;
                        else next.widgetInsetLeftPx = clampWidgetPositionOffsetPx(Number(v) || 0);
                        updatePathInsetRule(index, next);
                      }}
                    />
                  </Field>
                  <div className="flex sm:pb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removePathInsetRule(index)}
                      aria-label="Remove path rule"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={config.widgetPathInsets.length >= WIDGET_PATH_INSETS_MAX}
              onClick={addPathInsetRule}
            >
              <Plus className="size-4" />
              Add path rule
            </Button>
          </div>
          <Field label="Welcome message">
            <Input
              value={config.welcomeMessage}
              onChange={(e) => patch('welcomeMessage', e.target.value)}
              placeholder="How can I help?"
            />
          </Field>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.voiceEnabled}
              onCheckedChange={(v) => patch('voiceEnabled', v)}
            />
            <Label>Enable voice (call)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.attachmentsEnabled ?? false}
              onCheckedChange={(v) => patch('attachmentsEnabled' as keyof ChatbotWidgetConfig, v)}
            />
            <Label>Allow file attachments (images, PDF, text)</Label>
          </div>
          <Field label="Customer idle timeout (minutes)">
            <Input
              type="number"
              min={0}
              max={120}
              className="max-w-[120px]"
              value={config.inactivityMinutes ?? 3}
              onChange={(e) => {
                const n = Math.max(0, Math.min(120, Math.round(Number(e.target.value) || 0)));
                patch('inactivityMinutes' as keyof ChatbotWidgetConfig, n);
              }}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              After this many minutes without a message from the visitor, the widget shows a warning; one minute later
              the chat closes and the rating step appears. Starts after the visitor has sent at least one message. Use{' '}
              <span className="font-medium text-foreground">0</span> to disable. When enabled, the embed enforces at
              least 2 minutes.
            </p>
          </Field>
          <Field label="Hide widget on these paths">
            <Textarea
              rows={5}
              className="font-mono text-sm min-h-[100px]"
              placeholder={'/checkout\n/cart\n/account/settings'}
              value={hiddenPathsText}
              onChange={(e) => {
                const v = e.target.value;
                setHiddenPathsText(v);
                setConfig((prev) => ({
                  ...prev,
                  embedHiddenPaths: parseEmbedHiddenPathsFromTextarea(v),
                }));
              }}
            />
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              One path per line. A plain prefix like <code className="text-[11px]">/checkout</code> hides{' '}
              <code className="text-[11px]">/checkout</code> and everything under it. Use{' '}
              <code className="text-[11px]">/report/:id</code> or <code className="text-[11px]">/report/*</code> for one
              dynamic segment (e.g. <code className="text-[11px]">/report/123</code>). Use{' '}
              <code className="text-[11px]">**</code> for multiple segments (e.g.{' '}
              <code className="text-[11px]">/docs/**/print</code>). A trailing <code className="text-[11px]">/**</code>{' '}
              matches that path and all nested routes. Leading <code className="text-[11px]">/</code> is added if
              omitted. On single-page apps the embed usually runs once per full load unless you reload it on route
              changes.
            </p>
          </Field>
          <Field label="Hide widget on these hosts / subdomains">
            <Textarea
              rows={4}
              className="font-mono text-sm min-h-[88px]"
              placeholder={'admin\nstaging\ninternal.tools'}
              value={hiddenSubdomainsText}
              onChange={(e) => {
                const v = e.target.value;
                setHiddenSubdomainsText(v);
                setConfig((prev) => ({
                  ...prev,
                  embedHiddenSubdomains: parseEmbedHiddenSubdomainsFromTextarea(v),
                }));
              }}
            />
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              One entry per line, matched against the visitor&apos;s hostname (no{' '}
              <code className="text-[11px]">https://</code>, no path).{' '}
              <code className="text-[11px]">admin</code> hides <code className="text-[11px]">admin.yoursite.com</code>{' '}
              and <code className="text-[11px]">admin.shop.co.uk</code>. You can also list a full host like{' '}
              <code className="text-[11px]">shop.example.com</code>. Do not include port or <code className="text-[11px]">/</code>.
            </p>
          </Field>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.proactiveWelcomeEnabled ?? false}
              onCheckedChange={(v) => patch('proactiveWelcomeEnabled' as keyof ChatbotWidgetConfig, v)}
            />
            <Label>Show welcome message on first visit</Label>
          </div>
          {(config.proactiveWelcomeEnabled ?? false) && (
            <>
              <Field label="Welcome delay (seconds)">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={config.proactiveWelcomeDelaySeconds ?? 0}
                  onChange={(e) => patch('proactiveWelcomeDelaySeconds' as keyof ChatbotWidgetConfig, Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0 = immediately"
                />
              </Field>
              <Field label="Status line (optional)">
                <Input
                  value={config.proactiveWelcomeStatus ?? ''}
                  onChange={(e) => patch('proactiveWelcomeStatus' as keyof ChatbotWidgetConfig, e.target.value)}
                  placeholder="e.g. Our team is online"
                />
              </Field>
              <Field label="CTA button label">
                <Input
                  value={config.proactiveWelcomeCtaLabel ?? 'Chat with us'}
                  onChange={(e) => patch('proactiveWelcomeCtaLabel' as keyof ChatbotWidgetConfig, e.target.value || 'Chat with us')}
                  placeholder="Chat with us"
                />
              </Field>
              <Field label="Avatar URL (optional)">
                <Input
                  value={config.proactiveWelcomeAvatarUrl ?? ''}
                  onChange={(e) => patch('proactiveWelcomeAvatarUrl' as keyof ChatbotWidgetConfig, e.target.value || undefined)}
                  placeholder="https://… (agent/support photo)"
                />
              </Field>
            </>
          )}
        </Section>

        {/* Bubble */}
        <Section title="Bubble design">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Size (px)">
              <Input
                type="number"
                min={40}
                max={80}
                value={config.bubble.size}
                onChange={(e) => patchNested('bubble', { size: Number(e.target.value) || 56 })}
              />
            </Field>
            <Field label="Border radius (%)">
              <Input
                type="number"
                min={0}
                max={50}
                value={config.bubble.borderRadius}
                onChange={(e) => patchNested('bubble', { borderRadius: Number(e.target.value) || 50 })}
              />
            </Field>
            <Field label="Background">
              <ColorPicker
                value={config.bubble.backgroundColor}
                onChange={(v) => patchNested('bubble', { backgroundColor: v })}
              />
            </Field>
            <Field label="Icon color">
              <ColorPicker
                value={config.bubble.iconColor}
                onChange={(v) => patchNested('bubble', { iconColor: v })}
              />
            </Field>
          </div>
        </Section>

        {/* Popup */}
        <Section title="Chat popup">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Width (px)">
              <Input
                type="number"
                min={320}
                max={480}
                value={config.popup.width}
                onChange={(e) => patchNested('popup', { width: Number(e.target.value) || 380 })}
              />
            </Field>
            <Field label="Height (px)">
              <Input
                type="number"
                min={360}
                max={600}
                value={config.popup.height}
                onChange={(e) => patchNested('popup', { height: Number(e.target.value) || 420 })}
              />
            </Field>
            <Field label="Border radius (px)">
              <Input
                type="number"
                min={0}
                max={24}
                value={config.popup.borderRadius}
                onChange={(e) => patchNested('popup', { borderRadius: Number(e.target.value) || 16 })}
              />
            </Field>
            <Field label="Background">
              <ColorPicker
                value={config.popup.backgroundColor}
                onChange={(v) => patchNested('popup', { backgroundColor: v })}
              />
            </Field>
          </div>
        </Section>

        {/* Header (fine-tuning; app name, logo URL, subtitle, status are in App information above) */}
        <Section title="Header (appearance)">
          <Field label="Logo size (px)">
            <Input
              type="number"
              min={16}
              max={48}
              value={config.header.logoSize ?? 28}
              onChange={(e) => patchNested('header', { logoSize: Number(e.target.value) || 28 })}
            />
          </Field>
          <Field label="Status dot color">
            <ColorPicker
              value={config.header.statusDotColor ?? '#22c55e'}
              onChange={(v) => patchNested('header', { statusDotColor: v })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Background">
              <ColorPicker
                value={config.header.backgroundColor}
                onChange={(v) => patchNested('header', { backgroundColor: v })}
              />
            </Field>
            <Field label="Text color">
              <ColorPicker
                value={config.header.textColor}
                onChange={(v) => patchNested('header', { textColor: v })}
              />
            </Field>
            <Field label="Font size (px)">
              <Input
                type="number"
                min={12}
                max={24}
                value={config.header.fontSize}
                onChange={(e) => patchNested('header', { fontSize: Number(e.target.value) || 16 })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.header.showCloseButton}
              onCheckedChange={(v) => patchNested('header', { showCloseButton: v })}
            />
            <Label>Show close button</Label>
          </div>
        </Section>

        {/* Footer */}
        <Section title="Footer (input area)">
          <Field label="Placeholder">
            <Input
              value={config.footer.inputPlaceholder}
              onChange={(e) => patchNested('footer', { inputPlaceholder: e.target.value })}
              placeholder="Type a message..."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Input background">
              <ColorPicker
                value={config.footer.inputBackground}
                onChange={(v) => patchNested('footer', { inputBackground: v })}
              />
            </Field>
            <Field label="Send button background">
              <ColorPicker
                value={config.footer.sendButtonBackground}
                onChange={(v) => patchNested('footer', { sendButtonBackground: v })}
              />
            </Field>
            <Field label="Send button text color">
              <ColorPicker
                value={config.footer.sendButtonTextColor}
                onChange={(v) => patchNested('footer', { sendButtonTextColor: v })}
              />
            </Field>
            <Field label="Input border radius (px)">
              <Input
                type="number"
                min={0}
                max={16}
                value={config.footer.inputBorderRadius}
                onChange={(e) => patchNested('footer', { inputBorderRadius: Number(e.target.value) || 8 })}
              />
            </Field>
            <Field label="Send button radius (px)">
              <Input
                type="number"
                min={0}
                max={16}
                value={config.footer.sendButtonBorderRadius}
                onChange={(e) => patchNested('footer', { sendButtonBorderRadius: Number(e.target.value) || 8 })}
              />
            </Field>
          </div>
        </Section>

        {/* Messages */}
        <Section title="Messages design">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Welcome text color">
              <ColorPicker
                value={config.messages.welcomeTextColor}
                onChange={(v) => patchNested('messages', { welcomeTextColor: v })}
              />
            </Field>
            <Field label="Font size (px)">
              <Input
                type="number"
                min={12}
                max={18}
                value={config.messages.fontSize}
                onChange={(e) => patchNested('messages', { fontSize: Number(e.target.value) || 14 })}
              />
            </Field>
            <Field label="User bubble background">
              <ColorPicker
                value={config.messages.userBubbleBackground}
                onChange={(v) => patchNested('messages', { userBubbleBackground: v })}
              />
            </Field>
            <Field label="User bubble text color">
              <ColorPicker
                value={config.messages.userBubbleTextColor}
                onChange={(v) => patchNested('messages', { userBubbleTextColor: v })}
              />
            </Field>
            <Field label="Agent bubble background">
              <ColorPicker
                value={config.messages.agentBubbleBackground}
                onChange={(v) => patchNested('messages', { agentBubbleBackground: v })}
              />
            </Field>
            <Field label="Agent bubble text color">
              <ColorPicker
                value={config.messages.agentBubbleTextColor}
                onChange={(v) => patchNested('messages', { agentBubbleTextColor: v })}
              />
            </Field>
            <Field label="Bubble border radius (px)">
              <Input
                type="number"
                min={4}
                max={24}
                value={config.messages.bubbleBorderRadius}
                onChange={(e) => patchNested('messages', { bubbleBorderRadius: Number(e.target.value) || 12 })}
              />
            </Field>
          </div>
        </Section>
        <p className="text-muted-foreground text-sm">
          Get the embed code and API key on the{' '}
          <Link href={`/projects/${projectId}/integrations`} className="text-primary underline">
            Integrations
          </Link>{' '}
          page.
        </p>
      </div>

      {/* Right: live preview (desktop only) */}
      <div className="hidden w-full shrink-0 lg:block lg:sticky lg:top-6 lg:w-[420px]">
        <ChatbotPreview config={debouncedConfig} className="lg:min-h-[520px]" />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
