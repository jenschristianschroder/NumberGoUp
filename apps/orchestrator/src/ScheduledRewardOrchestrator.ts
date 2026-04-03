import * as df from 'durable-functions';
import type { OrchestrationContext, Task } from 'durable-functions';

/**
 * ScheduledRewardOrchestrator
 *
 * Orchestrates a timed sequence:
 *  1. Wait until the event ends.
 *  2. Enqueue reward-claim messages for eligible players.
 *  3. Send a completion notification.
 *
 * This is replay-safe: Durable Functions replays the function from history.
 * No side effects should happen outside of activity calls.
 */
df.app.orchestration('ScheduledRewardOrchestrator', function* (context: OrchestrationContext) {
  const input = context.df.getInput<ScheduledRewardInput>();

  context.df.setCustomStatus('waiting-for-event-end');

  // Wait until the event end time (timer is durable, survives restarts)
  const eventEndTime = new Date(input.eventEndsAt);
  if (!context.df.currentUtcDateTime || context.df.currentUtcDateTime < eventEndTime) {
    yield context.df.createTimer(eventEndTime);
  }

  context.df.setCustomStatus('notifying-eligible-players');

  // Fan out: one activity call per eligible player
  const tasks: Task[] = input.eligiblePlayerIds.map((playerId) =>
    context.df.callActivity('EnqueueRewardClaim', {
      playerId,
      eventId: input.eventId,
      rewardId: input.rewardId,
      idempotencyKey: `${input.eventId}-${input.rewardId}-${playerId}`,
    }),
  );

  yield context.df.Task.all(tasks);

  context.df.setCustomStatus('complete');

  return {
    processedPlayers: input.eligiblePlayerIds.length,
    eventId: input.eventId,
  };
});

/**
 * EnqueueRewardClaim activity – enqueues a single reward-claim message to Service Bus.
 */
df.app.activity('EnqueueRewardClaim', {
  handler: async (input: EnqueueRewardClaimInput) => {
    // In production, publish to Service Bus here.
    // For the scaffold, just log the intent.
    console.info(
      `[orchestrator] Enqueueing reward claim: player=${input.playerId} event=${input.eventId} reward=${input.rewardId}`,
    );
    return { queued: true, playerId: input.playerId };
  },
});

// ─── HTTP trigger to start an orchestration ──────────────────────────────────

import { app as azureApp } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

azureApp.http('StartScheduledReward', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'orchestrations/scheduled-reward',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const client = df.getClient(context);
    const body = (await req.json()) as ScheduledRewardInput;

    const instanceId = await client.scheduleNewOrchestrationInstance(
      'ScheduledRewardOrchestrator',
      body,
    );

    context.log(`Started orchestration with ID: ${instanceId}`);

    return client.createCheckStatusResponse(req, instanceId);
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledRewardInput {
  eventId: string;
  rewardId: string;
  eventEndsAt: string; // ISO-8601 UTC
  eligiblePlayerIds: string[];
}

interface EnqueueRewardClaimInput {
  playerId: string;
  eventId: string;
  rewardId: string;
  idempotencyKey: string;
}
