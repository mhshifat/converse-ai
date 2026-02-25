'use client';

import * as React from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 120;

/** Normalize to #rrggbb for react-colorful (handles 3/4/6/8 digit hex) */
function toHex(value: string): string {
  const v = String(value ?? '').trim();
  if (!v) return '#000000';
  let hex = v.startsWith('#') ? v.slice(1) : v;
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 6) return '#' + hex;
  if (hex.length === 8) return '#' + hex.slice(0, 6);
  return /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex : '#000000';
}

export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** Swatch + hex input container */
  className?: string;
  /** Show hex text input next to swatch (default true) */
  showHexInput?: boolean;
  /** Placeholder for hex input when empty */
  placeholder?: string;
}

export function ColorPicker({
  value,
  onChange,
  className,
  showHexInput = true,
  placeholder = '#000000',
}: ColorPickerProps) {
  const valueHex = toHex(value);
  const [open, setOpen] = React.useState(false);
  const [liveHex, setLiveHex] = React.useState(valueHex);
  const [hexInputValue, setHexInputValue] = React.useState(valueHex);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = React.useRef(onChange);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    setLiveHex(valueHex);
    setHexInputValue(valueHex);
  }, [valueHex]);

  const flushToParent = React.useCallback((hex: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onChangeRef.current(hex);
  }, []);

  const scheduleChange = React.useCallback((normalized: string) => {
    setLiveHex(normalized);
    setHexInputValue(normalized);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onChangeRef.current(normalized);
    }, DEBOUNCE_MS);
  }, []);

  React.useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) flushToParent(liveHex);
      setOpen(next);
    },
    [liveHex, flushToParent]
  );

  const handleChange = React.useCallback((newHex: string) => {
    const normalized = toHex(newHex);
    scheduleChange(normalized);
  }, [scheduleChange]);

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            style={{ backgroundColor: liveHex }}
            aria-label="Pick a color"
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-lg border bg-popover p-3 shadow-md" align="start">
          <HexColorPicker color={liveHex} onChange={handleChange} className="h-36! w-full!" />
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Hex</span>
            <HexColorInput
              color={liveHex}
              onChange={handleChange}
              prefixed
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </PopoverContent>
      </Popover>
      {showHexInput && (
        <Input
          value={hexInputValue}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#?[0-9a-fA-F]{0,6}$/.test(v) || v === '') {
              setHexInputValue(v);
              if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                const normalized = toHex(v);
                if (normalized !== liveHex) scheduleChange(normalized);
              }
            }
          }}
          onBlur={() => {
            const normalized = toHex(hexInputValue);
            setHexInputValue(normalized);
            setLiveHex(normalized);
            flushToParent(normalized);
          }}
          className="font-mono text-sm"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
