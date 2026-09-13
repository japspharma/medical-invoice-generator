import { useEffect, useRef } from "react";

function useKeyboardShortcuts(shortcuts = {}) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.key) return;

      const key = e.key.toUpperCase();
      const activeShortcuts = shortcutsRef.current;

      // F keys
      if (activeShortcuts[key]) {
        e.preventDefault();
        activeShortcuts[key]();
        return;
      }

      // Ctrl/Cmd shortcuts
      if ((e.ctrlKey || e.metaKey) && key === "S") {
        e.preventDefault();
        activeShortcuts["Ctrl+S"]?.();
      }

      if ((e.ctrlKey || e.metaKey) && key === "N") {
        e.preventDefault();
        activeShortcuts["Ctrl+N"]?.();
      }

      if ((e.ctrlKey || e.metaKey) && key === "P") {
        e.preventDefault();
        activeShortcuts["Ctrl+P"]?.();
      }

      // Escape
      if (key === "ESCAPE") {
        e.preventDefault();
        activeShortcuts["Escape"]?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}

export default useKeyboardShortcuts;
