export const RESPONSE_TARGET_MINUTES = {
  urgent: 60,
  high: 240,
  medium: 1440,
  low: 4320
};

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'];

export function validateStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return { valid: true };
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const nextIndex = STATUS_ORDER.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1) {
    return {
      valid: false,
      message: 'Status must be one of: open, in_progress, resolved, closed'
    };
  }

  const movement = nextIndex - currentIndex;
  if (movement === 1 || movement === -1) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Invalid status transition from ${currentStatus} to ${nextStatus}. Move tickets only one step forward or backward.`
  };
}

export function applyResolvedAt(ticket, nextStatus, now = new Date()) {
  if (nextStatus === 'resolved' && !ticket.resolvedAt) {
    ticket.resolvedAt = now;
  }

  if (ticket.status === 'resolved' && nextStatus !== 'resolved') {
    ticket.resolvedAt = null;
  }

  ticket.status = nextStatus;
}

export function decorateTicket(ticket, now = new Date()) {
  const plain = typeof ticket.toObject === 'function' ? ticket.toObject() : ticket;
  const created = new Date(plain.createdAt);
  const resolved = plain.resolvedAt ? new Date(plain.resolvedAt) : null;
  const end = resolved ?? now;
  const ageMinutes = Math.max(0, Math.floor((end.getTime() - created.getTime()) / 60000));
  const target = RESPONSE_TARGET_MINUTES[plain.priority];
  const unresolved = plain.status !== 'resolved' && plain.status !== 'closed';
  const elapsedForSla = resolved
    ? Math.floor((resolved.getTime() - created.getTime()) / 60000)
    : Math.floor((now.getTime() - created.getTime()) / 60000);

  return {
    ...plain,
    ageMinutes,
    slaBreached: target !== undefined && (unresolved || resolved) && elapsedForSla > target
  };
}
