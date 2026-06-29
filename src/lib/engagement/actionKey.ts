export function getActionKey(
  trainerId: string,
  clientId: string | null | undefined,
  type: string,
  reason: string,
): string {
  const cid = clientId ?? ""
  return `${trainerId}:${cid}:${type.toLowerCase().trim()}:${reason.toLowerCase().trim()}`
}

export function getActionKeyFromAction(
  action: { clientId: string | null | undefined; type: string; reason: string },
  trainerId: string,
): string {
  return getActionKey(trainerId, action.clientId, action.type, action.reason)
}
