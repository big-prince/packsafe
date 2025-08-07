import cron from 'node-cron';
import axios from 'axios';
import { logger } from './logger';

interface KeepAliveStats {
  totalPings: number;
  successfulPings: number;
  failedPings: number;
  lastPingTime: Date | null;
  monthlyPingCount: number;
  lastResetMonth: number;
}

class SmartKeepAlive {
  private stats: KeepAliveStats;
  private readonly MONTHLY_LIMIT = 800; // Conservative limit
  private readonly HEALTH_ENDPOINT = '/health';
  private serverUrl: string;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.serverUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    this.stats = {
      totalPings: 0,
      successfulPings: 0,
      failedPings: 0,
      lastPingTime: null,
      monthlyPingCount: 0,
      lastResetMonth: new Date().getMonth(),
    };
  }

  private shouldSkipPing(): boolean {
    // Reset monthly counter if new month
    const currentMonth = new Date().getMonth();
    if (currentMonth !== this.stats.lastResetMonth) {
      this.stats.monthlyPingCount = 0;
      this.stats.lastResetMonth = currentMonth;
      logger.info('SmartKeepAlive: Monthly counter reset');
    }

    // Skip if monthly limit reached
    if (this.stats.monthlyPingCount >= this.MONTHLY_LIMIT) {
      logger.warn('SmartKeepAlive: Monthly limit reached, skipping ping');
      return true;
    }

    // Skip weekends with 70% probability (save resources)
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      if (Math.random() < 0.7) {
        logger.info('SmartKeepAlive: Weekend ping skipped (70% chance)');
        return true;
      }
    }

    // Skip late night/early morning with 50% probability (11 PM - 6 AM)
    const hour = now.getHours();
    if (hour >= 23 || hour < 6) {
      if (Math.random() < 0.5) {
        logger.info('SmartKeepAlive: Night ping skipped (50% chance)');
        return true;
      }
    }

    return false;
  }

  private async pingHealth(): Promise<void> {
    if (this.shouldSkipPing()) {
      return;
    }

    try {
      logger.info('SmartKeepAlive: Pinging health endpoint...');
      
      const response = await axios.get(`${this.serverUrl}${this.HEALTH_ENDPOINT}`, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'PackSafe-KeepAlive/1.0',
        },
      });

      this.stats.successfulPings++;
      this.stats.monthlyPingCount++;
      this.stats.lastPingTime = new Date();
      
      logger.info(`SmartKeepAlive: Health ping successful (${response.status}) - Monthly: ${this.stats.monthlyPingCount}/${this.MONTHLY_LIMIT}`);
      
    } catch (error) {
      this.stats.failedPings++;
      this.stats.monthlyPingCount++; // Count failed attempts too
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`SmartKeepAlive: Health ping failed: ${errorMessage}`);
    }

    this.stats.totalPings++;
  }

  public start(): void {
    if (this.task) {
      logger.warn('SmartKeepAlive: Already running');
      return;
    }

    // Only run if we have an external URL (production)
    if (!process.env.RENDER_EXTERNAL_URL) {
      logger.info('SmartKeepAlive: No RENDER_EXTERNAL_URL found, skipping keep-alive (development mode)');
      return;
    }

    // Run every 14 minutes during active hours (6 AM - 11 PM)
    // Cron format: minute hour day month day-of-week
    this.task = cron.schedule('*/14 6-23 * * *', async () => {
      await this.pingHealth();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('SmartKeepAlive: Started - will ping every 14 minutes (6 AM - 11 PM UTC)');
    logger.info(`SmartKeepAlive: Target URL: ${this.serverUrl}${this.HEALTH_ENDPOINT}`);
    logger.info(`SmartKeepAlive: Monthly limit: ${this.MONTHLY_LIMIT} pings`);
  }

  public stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('SmartKeepAlive: Stopped');
    }
  }

  public getStats(): KeepAliveStats {
    return { ...this.stats };
  }

  // Manual ping for testing
  public async ping(): Promise<void> {
    logger.info('SmartKeepAlive: Manual ping requested');
    await this.pingHealth();
  }
}

export const smartKeepAlive = new SmartKeepAlive();
