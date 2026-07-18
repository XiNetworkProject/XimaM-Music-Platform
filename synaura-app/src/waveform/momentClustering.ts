import type { HomeComment, MomentReaction, MomentReactionType } from '../api/types';

export type MomentCluster = {
  id: string;
  timestampSeconds: number;
  comments: HomeComment[];
  reactions: MomentReaction[];
  byType: Partial<Record<MomentReactionType, number>>;
  topType?: MomentReactionType;
};

type MutableMomentCluster = MomentCluster & {
  eventCount: number;
  timestampTotal: number;
};

function topReaction(byType: Partial<Record<MomentReactionType, number>>) {
  return Object.entries(byType)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] as MomentReactionType | undefined;
}

export function clusterMoments(
  comments: HomeComment[],
  reactions: MomentReaction[],
  windowSeconds: number,
): MomentCluster[] {
  const events = [
    ...comments.map((comment) => ({
      kind: 'comment' as const,
      timestamp: Number(comment.timestampSeconds),
      comment,
    })),
    ...reactions.map((reaction) => ({
      kind: 'reaction' as const,
      timestamp: Number(reaction.timestampSeconds),
      reaction,
    })),
  ]
    .filter((event) => Number.isFinite(event.timestamp) && event.timestamp >= 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  const clusters: MutableMomentCluster[] = [];
  for (const event of events) {
    const last = clusters[clusters.length - 1];
    if (!last || event.timestamp - last.timestampSeconds > windowSeconds) {
      clusters.push({
        id: `moment-${event.timestamp}-${clusters.length}`,
        timestampSeconds: event.timestamp,
        comments: event.kind === 'comment' ? [event.comment] : [],
        reactions: event.kind === 'reaction' ? [event.reaction] : [],
        byType: event.kind === 'reaction' ? { [event.reaction.reactionType]: 1 } : {},
        topType: event.kind === 'reaction' ? event.reaction.reactionType : undefined,
        eventCount: 1,
        timestampTotal: event.timestamp,
      });
      continue;
    }

    if (event.kind === 'comment') {
      last.comments.push(event.comment);
    } else {
      last.reactions.push(event.reaction);
      last.byType[event.reaction.reactionType] = (last.byType[event.reaction.reactionType] || 0) + 1;
      last.topType = topReaction(last.byType);
    }
    last.eventCount += 1;
    last.timestampTotal += event.timestamp;
    last.timestampSeconds = last.timestampTotal / last.eventCount;
  }

  return clusters.map(({ eventCount: _eventCount, timestampTotal: _timestampTotal, ...cluster }) => cluster);
}

export function fitMomentClusters(
  comments: HomeComment[],
  reactions: MomentReaction[],
  initialWindow: number,
  maxVisible = 34,
) {
  let windowSeconds = Math.max(0.25, initialWindow);
  let clusters = clusterMoments(comments, reactions, windowSeconds);
  while (clusters.length > maxVisible && windowSeconds < 18) {
    windowSeconds *= 1.45;
    clusters = clusterMoments(comments, reactions, windowSeconds);
  }
  return clusters;
}
