import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Minimal config -- default incremental cache/queue/tag-cache behavior is
// fine here since this app is stateless (no ISR/on-demand revalidation in
// use), so there's nothing project-specific to override.
export default defineCloudflareConfig();
