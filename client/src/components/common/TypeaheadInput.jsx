import { useEffect, useRef, useState } from "react";
import "./TypeaheadInput.css";

/**
 * Text input with an alphabetical (starts-with) suggestion dropdown.
 *
 * suggestions: [{ id, label, detail?, raw? }]
 * onSelect(suggestion) is called when a suggestion is picked.
 */
function TypeaheadInput({
  value,
  onChange,
  suggestions = [],
  onSelect,
  placeholder = "",
  maxSuggestions = 8,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  const query = (value || "").trim().toLowerCase();

  const matches = query
    ? suggestions
        .filter((s) => (s.label || "").toLowerCase().startsWith(query))
        .sort((a, b) => (a.label || "").localeCompare(b.label || ""))
        .slice(0, maxSuggestions)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Reset highlighted row whenever the query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  const selectSuggestion = (suggestion) => {
    onSelect?.(suggestion);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      // Enter picks the highlighted row, or the first match
      e.preventDefault();
      e.stopPropagation();
      selectSuggestion(matches[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      // Close only the dropdown, don't trigger page-level Escape shortcuts
      e.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`typeahead ${className}`} ref={containerRef}>
      <input
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="typeahead-menu" role="listbox">
          {matches.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? "typeahead-item active" : "typeahead-item"}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="typeahead-label">{s.label}</span>
              {s.detail ? <span className="typeahead-detail">{s.detail}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TypeaheadInput;
