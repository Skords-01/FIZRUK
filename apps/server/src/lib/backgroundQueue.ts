import { logger } from "../obs/logger.js";

/**
 * Simple in-memory background job queue for non-critical tasks.
 *
 * Features:
 * - Fire-and-forget execution
 * - Error isolation (job failures don't affect other jobs)
 * - Configurable concurrency
 * - Graceful shutdown support
 *
 * Use cases:
 * - Sending emails
 * - Push notifications
 * - Analytics events
 * - Cache warming
 *
 * Note: This is NOT persistent. For critical jobs that must survive restarts,
 * use a proper queue like BullMQ with Redis persistence.
 *
 * Usage:
 * ```ts
 * backgroundQueue.enqueue("send-email", async () => {
 *   await sendEmail(to, subject, body);
 * });
 * ```
 */

interface Job {
  id: string;
  name: string;
  fn: () => Promise<void>;
  addedAt: number;
}

interface QueueOptions {
  /** Max concurrent jobs */
  concurrency?: number;
  /** Max queue size before dropping new jobs */
  maxQueueSize?: number;
  /** Job timeout in ms */
  jobTimeoutMs?: number;
}

class BackgroundQueue {
  private queue: Job[] = [];
  private running = 0;
  private jobIdCounter = 0;
  private isShuttingDown = false;

  private readonly concurrency: number;
  private readonly maxQueueSize: number;
  private readonly jobTimeoutMs: number;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? 3;
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.jobTimeoutMs = options.jobTimeoutMs ?? 30_000;
  }

  /**
   * Enqueue a background job.
   * Returns the job ID or null if queue is full/shutting down.
   */
  enqueue(name: string, fn: () => Promise<void>): string | null {
    if (this.isShuttingDown) {
      logger.warn({ msg: "bg_queue_shutting_down", jobName: name });
      return null;
    }

    if (this.queue.length >= this.maxQueueSize) {
      logger.warn({
        msg: "bg_queue_full",
        jobName: name,
        queueSize: this.queue.length,
        maxSize: this.maxQueueSize,
      });
      return null;
    }

    const id = `job_${++this.jobIdCounter}`;
    const job: Job = {
      id,
      name,
      fn,
      addedAt: Date.now(),
    };

    this.queue.push(job);
    this.process();

    return id;
  }

  /**
   * Process jobs from the queue.
   */
  private process(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.running++;
      this.runJob(job).finally(() => {
        this.running--;
        // Continue processing if there are more jobs
        if (this.queue.length > 0 && !this.isShuttingDown) {
          this.process();
        }
      });
    }
  }

  /**
   * Run a single job with timeout and error handling.
   */
  private async runJob(job: Job): Promise<void> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Job ${job.name} timed out after ${this.jobTimeoutMs}ms`),
          );
        }, this.jobTimeoutMs);
      });

      // Race job against timeout
      await Promise.race([job.fn(), timeoutPromise]);

      const durationMs = Date.now() - startTime;
      logger.debug({
        msg: "bg_job_completed",
        jobId: job.id,
        jobName: job.name,
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.error({
        msg: "bg_job_failed",
        jobId: job.id,
        jobName: job.name,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get queue statistics.
   */
  getStats() {
    return {
      queued: this.queue.length,
      running: this.running,
      concurrency: this.concurrency,
      maxQueueSize: this.maxQueueSize,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Graceful shutdown - stop accepting new jobs, wait for running to complete.
   */
  async shutdown(timeoutMs = 10_000): Promise<void> {
    this.isShuttingDown = true;

    // Clear pending jobs
    const dropped = this.queue.length;
    this.queue = [];

    if (dropped > 0) {
      logger.warn({ msg: "bg_queue_shutdown_dropped", droppedJobs: dropped });
    }

    // Wait for running jobs to complete
    const startTime = Date.now();
    while (this.running > 0) {
      if (Date.now() - startTime > timeoutMs) {
        logger.warn({
          msg: "bg_queue_shutdown_timeout",
          stillRunning: this.running,
        });
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info({ msg: "bg_queue_shutdown_complete" });
  }
}

/**
 * Shared background queue instance.
 */
export const backgroundQueue = new BackgroundQueue({
  concurrency: 3,
  maxQueueSize: 500,
  jobTimeoutMs: 30_000,
});
