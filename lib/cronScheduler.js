import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

// Map of user-friendly schedule keys to cron expressions & labels
export const CRON_SCHEDULE_PRESETS = {
  'every_monday_0000': {
    cron: '0 0 * * 1',
    label: 'Every Monday at 00:00 (Midnight)',
  },
  'every_sunday_0000': {
    cron: '0 0 * * 0',
    label: 'Every Sunday at 00:00 (Midnight)',
  },
  'daily_0000': {
    cron: '0 0 * * *',
    label: 'Daily at 00:00 (Midnight)',
  },
  'daily_1200': {
    cron: '0 12 * * *',
    label: 'Daily at 12:00 PM (Noon)',
  },
  'every_12h': {
    cron: '0 */12 * * *',
    label: 'Every 12 Hours',
  },
  'every_6h': {
    cron: '0 */6 * * *',
    label: 'Every 6 Hours',
  },
  'every_1h': {
    cron: '0 * * * *',
    label: 'Every 1 Hour',
  },
  'every_5m': {
    cron: '*/5 * * * *',
    label: 'Every 5 Minutes (Test Mode)',
  },
};

// Global task reference across hot-reloads / server instances
global.activeCronTask = global.activeCronTask || null;
global.activeCronSchedule = global.activeCronSchedule || null;

/**
 * Execute the automated reset logic
 * @param {string} action - 'reset_all' or 'finalize_week'
 */
export async function executeAutoReset(action = 'reset_all') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[AutoReset Cron] Missing Supabase environment variables');
    return { success: false, error: 'Missing Supabase environment variables' };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log(`[AutoReset Cron] Executing automated reset action: ${action}`);

    if (action === 'finalize_week') {
      // 1. Find top scorer
      const { data: winner } = await supabase
        .from('profiles')
        .select('*')
        .gt('high_score', 0)
        .order('high_score', { ascending: false })
        .limit(1)
        .single();

      if (winner) {
        // Grab code
        const { data: codeRow } = await supabase
          .from('manual_code_bank')
          .select('*')
          .eq('prize_type', 'GRAND')
          .eq('is_claimed', false)
          .limit(1)
          .single();

        const { data: settings } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (codeRow) {
          await supabase
            .from('manual_code_bank')
            .update({ is_claimed: true, claimed_by: winner.id })
            .eq('id', codeRow.id);

          await supabase.from('rewards').insert({
            user_id: winner.id,
            prize_title: `WEEKLY CHAMPION: ${settings?.prize_title || 'Weekly Prize'}`,
            prize_code: codeRow.code,
          });
        }
      }

      // Reset profile scores
      await supabase
        .from('profiles')
        .update({ high_score: 0, scratch_count: 0, bonus_unlocked: false })
        .not('id', 'is', null);

    } else {
      // Default: reset_all (clear rewards and reset scores)
      await supabase
        .from('rewards')
        .delete()
        .not('id', 'is', null);

      await supabase
        .from('profiles')
        .update({
          high_score: 0,
          scratch_count: 0,
          bonus_unlocked: false,
        })
        .not('id', 'is', null);
    }

    // Update last run timestamp in app_settings
    const now = new Date().toISOString();
    await supabase
      .from('app_settings')
      .update({ auto_reset_last_run: now })
      .eq('id', 1);

    console.log(`[AutoReset Cron] Reset completed successfully at ${now}`);
    return { success: true, timestamp: now };
  } catch (err) {
    console.error('[AutoReset Cron] Execution failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Configure and activate or stop the background cron scheduler
 */
export function updateCronScheduler(enabled, scheduleKey, action = 'reset_all') {
  // Stop existing cron task if running
  if (global.activeCronTask) {
    global.activeCronTask.stop();
    global.activeCronTask = null;
    global.activeCronSchedule = null;
    console.log('[AutoReset Cron] Stopped active cron schedule.');
  }

  if (!enabled || !scheduleKey) {
    return { status: 'stopped' };
  }

  const preset = CRON_SCHEDULE_PRESETS[scheduleKey];
  const cronExpr = preset ? preset.cron : scheduleKey; // allow raw expression if passed

  if (!cron.validate(cronExpr)) {
    console.error(`[AutoReset Cron] Invalid cron expression: ${cronExpr}`);
    return { status: 'error', error: 'Invalid cron expression' };
  }

  try {
    global.activeCronTask = cron.schedule(cronExpr, () => {
      executeAutoReset(action);
    });
    global.activeCronSchedule = scheduleKey;

    console.log(`[AutoReset Cron] Scheduled task activated for expression '${cronExpr}' (${preset?.label || scheduleKey})`);
    return { status: 'active', cron: cronExpr, label: preset?.label || scheduleKey };
  } catch (err) {
    console.error('[AutoReset Cron] Failed to schedule task:', err);
    return { status: 'error', error: err.message };
  }
}
