import { useEffect } from "react";

function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.key) return;

      console.log("Pressed:", e.key);
      console.log(e);
      const key = e.key.toUpperCase();

      // F keys
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
        return;
      }

      // Ctrl + S
      if ((e.ctrlKey || e.metaKey) && key === "S") {
        e.preventDefault();
        shortcuts["Ctrl+S"]?.();
      }

      // Ctrl + N
      if ((e.ctrlKey || e.metaKey) && key === "N") {
        e.preventDefault();
        shortcuts["Ctrl+N"]?.();
      }

      // Escape
      if (key === "ESCAPE") {
        e.preventDefault();
        shortcuts["Escape"]?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
}

export default useKeyboardShortcuts;