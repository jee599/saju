import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  const [common, home, result, paywall, loading, report, daily, compat, misc] = await Promise.all([
    import(`./messages/${locale}/common.json`),
    import(`./messages/${locale}/home.json`),
    import(`./messages/${locale}/result.json`),
    import(`./messages/${locale}/paywall.json`),
    import(`./messages/${locale}/loading.json`),
    import(`./messages/${locale}/report.json`),
    import(`./messages/${locale}/daily.json`),
    import(`./messages/${locale}/compat.json`),
    import(`./messages/${locale}/misc.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      home: home.default,
      result: result.default,
      paywall: paywall.default,
      loading: loading.default,
      report: report.default,
      daily: daily.default,
      compat: compat.default,
      misc: misc.default,
    },
  };
});
