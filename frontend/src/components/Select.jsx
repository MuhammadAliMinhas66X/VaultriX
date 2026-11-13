import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const MENU_HEIGHT_ESTIMATE = 280;

function Select({ items, value, onChange, ariaLabel, placeholder = '' }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });

  const selected = items.find((item) => item.value === value) || null;

  useEffect(() => {
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const toggle = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < MENU_HEIGHT_ESTIMATE && rect.top > spaceBelow);
      setHighlighted(Math.max(0, items.findIndex((item) => item.value === value)));
    }
    setOpen((prev) => !prev);
  };

  const choose = (item) => {
    onChange(item.value);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) return toggle();
      setHighlighted((prev) => Math.min(prev + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (items[highlighted]) choose(items[highlighted]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
      // Type-ahead: typing "mo" jumps to the first item starting with "mo".
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 800 ? typed.current.text : '') + event.key.toLowerCase(), at: now };
      const hit = items.findIndex((item) => String(item.label).toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) {
        event.preventDefault();
        if (!open) onChange(items[hit].value);
        else setHighlighted(hit);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-start text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
      >
        <span className={`truncate ${selected ? '' : 'text-muted'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 z-30 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-xl ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {items.map((item, index) => {
            const isSelected = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(item)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-sm transition-colors ${
                  isSelected ? 'bg-accent/10 font-semibold text-ink' : index === highlighted ? 'bg-surface text-ink' : 'text-ink'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {isSelected && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Select;
