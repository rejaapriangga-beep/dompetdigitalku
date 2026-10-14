// app/theme-toggle.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hindari mismatch hydration — resolvedTheme baru akurat setelah mount di client.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- flag mount, tidak ada alternatif sinkron lain
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!mounted) {
    return <div className="theme-toggle" aria-hidden="true" style={{ visibility: "hidden" }} />;
  }

  const isDark = resolvedTheme === "dark";
  const CurrentIcon = isDark ? Moon : Sun;

  return (
    <div className="theme-dropdown" ref={wrapRef}>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Pilih tema tampilan"
        title="Pilih tema tampilan"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CurrentIcon size={17} />
      </button>

      {open && (
        <div className="theme-dropdown-panel" role="menu">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = (theme ?? "system") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className="theme-dropdown-item"
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
              >
                <Icon size={16} />
                <span>{opt.label}</span>
                {active && <Check size={16} className="theme-dropdown-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
