
export const MAX_REQUESTS = 10;
const WINDOW_MS = 1000;

class RateLimiter {
  private queue: Array<{ fn: () => Promise<any>; resolve: (v: any) => void; reject: (e: any) => void }> = [];
  private requestTimestamps: number[] = [];
  private processing = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      
      // Remove timestamps older than WINDOW_MS
      this.requestTimestamps = this.requestTimestamps.filter(t => now - t < WINDOW_MS);

      if (this.requestTimestamps.length < MAX_REQUESTS) {
        // Can execute now
        const item = this.queue.shift();
        if (item) {
          this.requestTimestamps.push(Date.now());
          try {
            const result = await item.fn();
            item.resolve(result);
          } catch (error) {
            item.reject(error);
          }
        }
      } else {
        // Rate limit hit, wait until the oldest request expires
        const oldest = this.requestTimestamps[0];
        const waitTime = oldest + WINDOW_MS - now + 50; // +50ms buffer to ensure we are clear
        
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    this.processing = false;
  }
}

export const rateLimiter = new RateLimiter();
