import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Attaches the Clerk session token to every server-function call so server
// handlers can verify the caller's identity independently of client state.
const attachClerkAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | null = null;
  try {
    const clerk = (globalThis as { Clerk?: { session?: { getToken: () => Promise<string | null> } } })
      .Clerk;
    token = (await clerk?.session?.getToken()) ?? null;
  } catch {
    token = null;
  }
  return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
});

// Server functions: never let database errors, stack traces or validation
// internals reach the browser. Intentional messages (plain Error) and HTTP
// Responses (401/403/404) pass through; everything else becomes generic.
const safeErrors = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error != null && typeof error === "object" && ("isRedirect" in error || "isNotFound" in error)) throw error;
    const e = error as { name?: string; severity?: unknown; code?: unknown; message?: string };
    if (e?.name === "ZodError") throw new Error("Some details are missing or invalid. Please check and try again.");
    const internal =
      !(error instanceof Error) || e.name !== "Error" || e.severity !== undefined || e.code !== undefined;
    if (internal) {
      console.error(error);
      throw new Error("Something went wrong on our side. Please try again.");
    }
    throw error;
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [attachClerkAuth, safeErrors],
}));
