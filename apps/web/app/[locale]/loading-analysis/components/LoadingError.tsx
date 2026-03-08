"use client";

import React from "react";

interface LoadingFooterProps {
  error: string | null;
  isGenerating: boolean;
  orderId: string | null;
  onRetry: () => void;
  onGoHome: () => void;
  retryLabel: string;
  retryOtherLabel: string;
  generatingText: string;
  preparingText: string;
  supportEmail: string;
  contactSupportLabel: string;
}

export function LoadingFooter({
  error,
  isGenerating,
  orderId,
  onRetry,
  onGoHome,
  retryLabel,
  retryOtherLabel,
  generatingText,
  preparingText,
  supportEmail,
  contactSupportLabel,
}: LoadingFooterProps) {
  return (
    <div className="loadingFooter">
      {error ? (
        <div className="loadingError" aria-live="assertive">
          <p>{"\u26A0\uFE0F"} {error}</p>
          <div className="loadingErrorActions">
            <button className="btn btn-primary" onClick={onRetry}>
              {retryLabel}
            </button>
            {orderId && (
              <button className="btn btn-secondary" onClick={onGoHome}>
                {retryOtherLabel}
              </button>
            )}
          </div>
          <a href={`mailto:${supportEmail}`} className="loadingErrorSupport">
            {contactSupportLabel}
          </a>
        </div>
      ) : (
        <p className="loadingHint" aria-live="polite">
          {isGenerating ? generatingText : preparingText}
        </p>
      )}
    </div>
  );
}
