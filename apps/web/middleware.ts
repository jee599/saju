import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except api routes, _next, static files
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
