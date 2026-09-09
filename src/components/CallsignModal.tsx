"use client";

import { useEffect, useState } from "react";
import { getCallsign, setCallsign } from "@/lib/anon";

export default function CallsignModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(getCallsign() || "");
  }, [open]);

  if (!open) return null;

  function save() {
    setCallsign(value);
    onClose();
  }

  function clear() {
    setCallsign(null);
    setValue("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display italic text-xl mb-1">Callsign</h2>
        <p className="text-sm text-hush mb-4">
          Optional. Pick a name to appear as on the daily rank instead of a
          random Anon ID. Leave it blank to stay fully anonymous.
        </p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 24))}
          placeholder="e.g. quietstorm"
          className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink/40"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            className="flex-1 rounded-full bg-ink text-white text-sm font-medium py-2"
          >
            Save
          </button>
          <button
            onClick={clear}
            className="flex-1 rounded-full border border-line text-sm font-medium py-2"
          >
            Stay anonymous
          </button>
        </div>
      </div>
    </div>
  );
}
