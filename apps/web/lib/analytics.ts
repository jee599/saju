export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type PostHogLike = {
  capture: (event: string, properties?: AnalyticsProps) => void;
};

const getPostHog = (): PostHogLike | null => {
  if (typeof window === "undefined") return null;
  const maybe = (window as typeof window & { posthog?: PostHogLike }).posthog;
  return maybe ?? null;
};

export const trackEvent = (event: string, properties?: AnalyticsProps): void => {
  console.log("[analytics]", event, properties ?? {});
  const posthog = getPostHog();
  if (posthog) {
    posthog.capture(event, properties);
  }
};
