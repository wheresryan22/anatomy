import { rm } from "node:fs/promises";

export async function chromePort(chrome, profile) {
  try {
    return await new Promise((done, fail) => {
      let text = "";
      const clean = () => {
        clearTimeout(timer);
        chrome.stderr.off("data", data);
        chrome.off("error", error);
        chrome.off("exit", exited);
      };
      const error = (cause) => {
        clean();
        fail(cause);
      };
      const exited = (code, signal) => error(new Error(`Chrome exited before startup: ${code ?? signal}`));
      const data = (chunk) => {
        text += chunk;
        const match = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
        if (match) {
          clean();
          done(Number(match[1]));
        }
      };
      const timer = setTimeout(() => error(new Error("Chrome did not start")), 20000);
      chrome.stderr.on("data", data);
      chrome.on("error", error);
      chrome.on("exit", exited);
    });
  } catch (error) {
    // Windows may hold Chrome profile files briefly after termination.
    // Retry cleanup so a transient EPERM does not obscure the actual startup error.
    chrome.kill("SIGKILL");
    try {
      await rm(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 150 });
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], "Chrome startup and profile cleanup both failed");
    }
    throw error;
  }
}
