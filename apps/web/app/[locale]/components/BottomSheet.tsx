"use client";

import { useEffect, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`bottomSheetOverlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`bottomSheet ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottomSheetHandle" aria-hidden="true">
          <span className="bottomSheetHandleBar" />
        </div>
        <div className="bottomSheetHeader">
          <h3 className="bottomSheetTitle">{title}</h3>
        </div>
        <div className="bottomSheetContent">
          {children}
        </div>
      </div>
    </>
  );
}
