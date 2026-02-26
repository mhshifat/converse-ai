'use client';

import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCHEMA_TYPES = ['string', 'number', 'boolean', 'object', 'array'] as const;
type SchemaType = (typeof SCHEMA_TYPES)[number];

interface SchemaNode {
  type: SchemaType;
  required?: boolean; // for top-level properties: whether this field must be collected
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode; // for array
}

function emptyNode(type: SchemaType): SchemaNode {
  if (type === 'object') return { type: 'object', properties: {} };
  if (type === 'array') return { type: 'array', items: { type: 'string' } };
  return { type, required: false };
}

function fromJsonSchema(obj: unknown): SchemaNode {
  if (obj && typeof obj === 'object' && 'type' in obj) {
    const o = obj as {
      type?: string;
      properties?: Record<string, unknown>;
      items?: unknown;
      required?: string[];
    };
    const type = (o.type === 'object' || o.type === 'string' || o.type === 'number' || o.type === 'boolean' || o.type === 'array')
      ? o.type
      : 'string';
    const node: SchemaNode = { type: type as SchemaType };
    if (type === 'object' && o.properties && typeof o.properties === 'object') {
      const requiredSet = new Set(o.required ?? []);
      node.properties = {};
      for (const [k, v] of Object.entries(o.properties)) {
        const child = fromJsonSchema(v);
        if (requiredSet.has(k)) child.required = true;
        node.properties[k] = child;
      }
    }
    if (type === 'array' && o.items) {
      node.items = fromJsonSchema(o.items);
    }
    return node;
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return { type: 'object', properties: {} };
  }
  return { type: 'string' };
}

function toJsonSchema(node: SchemaNode): Record<string, unknown> {
  const out: Record<string, unknown> = { type: node.type };
  if (node.type === 'object' && node.properties && Object.keys(node.properties).length > 0) {
    out.properties = Object.fromEntries(
      Object.entries(node.properties).map(([k, v]) => [k, toJsonSchema(v)])
    );
    const requiredKeys = Object.entries(node.properties)
      .filter(([, v]) => v.required === true)
      .map(([k]) => k);
    if (requiredKeys.length > 0) out.required = requiredKeys;
  }
  if (node.type === 'array' && node.items) {
    out.items = toJsonSchema(node.items);
  }
  return out;
}

function normalizeRoot(value: unknown): SchemaNode {
  if (value == null) return { type: 'object', properties: {} };
  if (typeof value !== 'object' || Array.isArray(value)) return { type: 'object', properties: {} };
  const v = value as Record<string, unknown>;
  if (v.type === 'object' && v.properties && typeof v.properties === 'object') {
    return fromJsonSchema(value);
  }
  return { type: 'object', properties: {} };
}

interface PropertyRowProps {
  name: string;
  node: SchemaNode;
  onNameChange: (name: string) => void;
  onNodeChange: (node: SchemaNode) => void;
  onRemove: () => void;
  depth?: number;
}

function PropertyRow({
  name,
  node,
  onNameChange,
  onNodeChange,
  onRemove,
  depth = 0,
}: PropertyRowProps) {
  const isObject = node.type === 'object';
  const isArray = node.type === 'array';
  const [nestedOpen, setNestedOpen] = React.useState(true);
  const [localName, setLocalName] = React.useState(name);
  React.useEffect(() => {
    setLocalName(name);
  }, [name]);

  const commitName = React.useCallback(() => {
    const trimmed = localName.trim();
    if (trimmed !== name) {
      onNameChange(trimmed || name);
    }
  }, [localName, name, onNameChange]);

  const updateType = useCallback(
    (type: SchemaType) => {
      const next = emptyNode(type);
      if (depth === 0 && node.required !== undefined) next.required = node.required;
      onNodeChange(next);
    },
    [depth, node.required, onNodeChange]
  );

  const addNestedProperty = useCallback(() => {
    if (node.type !== 'object') return;
    const props = { ...(node.properties ?? {}) };
    let key = 'newField';
    let i = 0;
    while (props[key] != null) key = `newField${++i}`;
    props[key] = emptyNode('string');
    onNodeChange({ ...node, properties: props });
    setNestedOpen(true);
  }, [node, onNodeChange]);

  const updateNested = useCallback(
    (key: string, next: SchemaNode) => {
      if (node.type !== 'object' || !node.properties) return;
      const props = { ...node.properties };
      if (Object.keys(next).length === 0 && next.type === 'object' && (!next.properties || Object.keys(next.properties).length === 0)) {
        delete props[key];
      } else {
        props[key] = next;
      }
      onNodeChange({ ...node, properties: props });
    },
    [node, onNodeChange]
  );

  const removeNested = useCallback(
    (key: string) => {
      if (node.type !== 'object' || !node.properties) return;
      const props = { ...node.properties };
      delete props[key];
      onNodeChange({ ...node, properties: props });
    },
    [node, onNodeChange]
  );

  return (
    <div className={cn('rounded-md border border-border/60 bg-muted/20', depth > 0 && 'ml-4')}>
      <div className="flex flex-wrap items-center gap-2 p-2">
        {depth > 0 && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="Property name"
          className="font-mono h-8 w-32 shrink-0"
        />
        <Select value={node.type} onValueChange={(v) => updateType(v as SchemaType)}>
          <SelectTrigger className="h-8 w-[120px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEMA_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {depth === 0 && (
          <Select
            value={node.required === true ? 'required' : 'optional'}
            onValueChange={(v) => onNodeChange({ ...node, required: v === 'required' })}
          >
            <SelectTrigger className="h-8 w-auto" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="required">Required</SelectItem>
              <SelectItem value="optional">Optional</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove} aria-label="Remove property">
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
      {isObject && (
        <div className="border-t border-border/60 p-2">
          <div className="flex items-center gap-2 mb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setNestedOpen((o) => !o)}
              aria-expanded={nestedOpen}
            >
              {nestedOpen ? 'Hide' : 'Show'} nested properties
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addNestedProperty}>
              <Plus className="size-3" />
              Add property
            </Button>
          </div>
          {nestedOpen && (
            <div className="space-y-2">
              {node.properties && Object.entries(node.properties).map(([k, child]) => (
                <PropertyRow
                  key={k}
                  name={k}
                  node={child}
                  depth={depth + 1}
                  onNameChange={(newName) => {
                    if (newName === k) return;
                    const props = { ...node.properties! };
                    props[newName] = props[k]!;
                    delete props[k];
                    onNodeChange({ ...node, properties: props });
                  }}
                  onNodeChange={(next) => updateNested(k, next)}
                  onRemove={() => removeNested(k)}
                />
              ))}
              {(!node.properties || Object.keys(node.properties).length === 0) && (
                <p className="text-muted-foreground text-xs">No nested properties. Click &quot;Add property&quot; to add one.</p>
              )}
            </div>
          )}
        </div>
      )}
      {isArray && node.items && (
        <div className="border-t border-border/60 p-2 ml-4">
          <span className="text-muted-foreground text-xs">Items: </span>
          <Select
            value={node.items.type}
            onValueChange={(v) => onNodeChange({ ...node, items: emptyNode(v as SchemaType) })}
          >
            <SelectTrigger className="h-7 w-[100px] inline-flex" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEMA_TYPES.filter((t) => t !== 'array').map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export interface JsonSchemaBuilderProps {
  value: unknown;
  onChange: (value: Record<string, unknown>) => void;
  className?: string;
}

export function JsonSchemaBuilder({ value, onChange, className }: JsonSchemaBuilderProps) {
  const root = useMemo(() => normalizeRoot(value), [value]);

  const updateRoot = useCallback(
    (next: SchemaNode) => {
      onChange(toJsonSchema(next) as Record<string, unknown>);
    },
    [onChange]
  );

  const properties = root.type === 'object' ? root.properties ?? {} : {};
  const entries = Object.entries(properties);

  const addProperty = useCallback(() => {
    const props = { ...properties };
    let key = 'newField';
    let i = 0;
    while (props[key] != null) key = `newField${++i}`;
    props[key] = emptyNode('string');
    updateRoot({ type: 'object', properties: props });
  }, [properties, updateRoot]);

  const handleNameChange = useCallback(
    (oldKey: string, newName: string) => {
      if (newName === oldKey) return;
      const props = { ...properties };
      props[newName] = props[oldKey]!;
      delete props[oldKey];
      updateRoot({ type: 'object', properties: props });
    },
    [properties, updateRoot]
  );

  const handleNodeChange = useCallback(
    (key: string, next: SchemaNode) => {
      const props = { ...properties };
      props[key] = next;
      updateRoot({ type: 'object', properties: props });
    },
    [properties, updateRoot]
  );

  const handleRemove = useCallback(
    (key: string) => {
      const props = { ...properties };
      delete props[key];
      updateRoot({ type: 'object', properties: props });
    },
    [properties, updateRoot]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">Build the schema with properties and types.</span>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addProperty}>
          <Plus className="size-4" />
          Add property
        </Button>
      </div>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-4 text-center text-muted-foreground text-sm">
            No properties yet. Click &quot;Add property&quot; to define the structure.
          </div>
        ) : (
          entries.map(([key, node]) => (
            <PropertyRow
              key={key}
              name={key}
              node={node}
              onNameChange={(newName) => handleNameChange(key, newName)}
              onNodeChange={(next) => handleNodeChange(key, next)}
              onRemove={() => handleRemove(key)}
            />
          ))
        )}
      </div>
    </div>
  );
}
