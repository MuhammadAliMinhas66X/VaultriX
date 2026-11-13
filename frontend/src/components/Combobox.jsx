import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

const normalize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function Combobox({
  label,
  ariaLabel,
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  loading = false,
  error,
  footer,
  searchable = true,
  className = '',
  menuClassName = 'left-0 w-full',
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t('common.search');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [place, setPlace] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const widthMatch = /\bw-(\d+)\b/.exec(menuClassName);
  const wantedWidth = widthMatch ? Number(widthMatch[1]) * 4 : 0;
  const alignRight = /\bright-0\b/.test(menuClassName);

  const selected = items.find((item) => item.value === value) || null;
  const needle = normalize(query.trim());
  const filtered = needle
    ? items.filter((item) => (item.search || normalize(`${item.label} ${item.tag || ''}`)).includes(needle))
    : items;

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const edge = 8;
    const gap = 6;
    const width = Math.min(Math.max(wantedWidth || rect.width, Math.min(rect.width, 220)), vw - edge * 2);
    let left = alignRight ? rect.right - width : rect.left;
    left = Math.max(edge, Math.min(left, vw - width - edge));
    const below = vh - rect.bottom - gap - edge;
    const above = rect.top - gap - edge;
    const upward = below < 240 && above > below;
    const room = upward ? above : below;
    setPlace({
      left,
      width,
      upward,
      top: upward ? undefined : rect.bottom + gap,
      bottom: upward ? vh - rect.top + gap : undefined,
      maxHeight: Math.max(150, Math.min(360, room)),
    });
  }, [wantedWidth, alignRight]);

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return undefined;
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      viewport?.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      const inside = rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target);
      if (!inside) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const placed = place !== null;

  // Focus the search box as soon as the menu is on screen (it cannot take focus
  // while it is still hidden for measuring), so typing works with no extra click.
  useEffect(() => {
    if (open && placed) {
      const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
      if (fine || !searchable) {
        const input = inputRef.current;
        if (input) {
          input.focus({ preventScroll: true });
          const end = input.value.length;
          input.setSelectionRange?.(end, end);
        }
      }
    }
  }, [open, placed, searchable]);

  useEffect(() => {
    if (open) setHighlighted(0);
  }, [open, query]);

  const close = (refocus) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const selectItem = (item) => {
    onChange(item.value);
    close(true);
  };

  // On the closed button: arrows open the list, and typing a letter opens it with that letter already searched.
  const handleTriggerKeyDown = (event) => {
    if (loading || open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    } else if (searchable && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setQuery(event.key);
      setOpen(true);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filtered[highlighted]) selectItem(filtered[highlighted]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      // Tab keeps the flow of the form: pick what was found (if anything was typed) and move on.
      if (query.trim() && filtered[highlighted]) onChange(filtered[highlighted].value);
      close(true);
    }
  };

  return (
    <div ref={rootRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-ink">{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (loading) return;
          setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        disabled={loading}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={loading ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent/20 disabled:cursor-wait disabled:opacity-70 ${
          error ? 'border-ink focus:border-ink' : 'border-border focus:border-accent'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon}
          {selected?.flag && <span className="text-base leading-none">{selected.flag}</span>}
          {selected?.symbol && (
            <span className="w-5 flex-shrink-0 text-xs font-medium text-muted">{selected.symbol}</span>
          )}
          {selected ? (
            <span className="truncate">{selected.label}</span>
          ) : (
            <span className="text-muted">{resolvedPlaceholder}</span>
          )}
        </span>
        {loading ? (
          <span className="flex flex-shrink-0 items-center gap-1.5 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('common.saving')}
          </span>
        ) : (
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {error && (
        <span role="alert" className="text-xs font-semibold text-ink">
          {error}
        </span>
      )}

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={
              place
                ? { position: 'fixed', left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }
                : { position: 'fixed', visibility: 'hidden' }
            }
            className="z-[80] flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]"
          >
            <div className={searchable ? 'flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5' : 'sr-only'}>
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder || t('common.search')}
                className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted sm:text-sm"
              />
            </div>

            <div role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {filtered.length === 0 && <p className="px-3.5 py-2.5 text-sm text-muted">{t('common.noMatches')}</p>}
              {filtered.map((item, index) => {
                const isSelected = item.value === value;
                const showGroup = item.group && item.group !== filtered[index - 1]?.group;
                return (
                  <Fragment key={item.value}>
                    {showGroup && <p className="px-3.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{item.group}</p>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setHighlighted(index)}
                      className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[15px] transition-colors sm:py-2 sm:text-sm ${
                        isSelected ? 'bg-accent/10 font-semibold text-ink' : index === highlighted ? 'bg-surface text-ink' : 'text-ink'
                      }`}
                    >
                      {item.icon}
                      {item.flag && <span className="text-base leading-none">{item.flag}</span>}
                      {item.symbol && <span className="w-5 flex-shrink-0 text-xs font-medium text-muted">{item.symbol}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{item.label}</span>
                          {item.tag && <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-border">{item.tag}</span>}
                        </span>
                        {item.sub && <span className="block truncate text-xs font-normal text-muted">{item.sub}</span>}
                      </span>
                      {isSelected && <Check className="ml-auto h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2.5} />}
                    </button>
                  </Fragment>
                );
              })}
            </div>

            {footer && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                  footer.onClick(query.trim());
                }}
                className="flex w-full shrink-0 items-center gap-2.5 border-t border-border bg-surface/70 px-3.5 py-3 text-start text-[15px] font-semibold text-ink outline-none transition hover:bg-surface focus-visible:bg-surface sm:py-2.5 sm:text-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-white">{footer.icon}</span>
                <span className="truncate">{query.trim() && footer.labelWithQuery ? footer.labelWithQuery(query.trim()) : footer.label}</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export default Combobox;
