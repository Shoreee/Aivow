declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    DREAM_SCHEDULER: DurableObjectNamespace<import("./worker/dream-scheduler").DreamScheduler>;
    CHAT_SCHEDULER: DurableObjectNamespace<import("./worker/dream-scheduler").DemoChatScheduler>;
    BUCKET?: R2Bucket;
  }
}
