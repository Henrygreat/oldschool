// Pure constants and types shared between server-only messaging logic (lib/messaging.ts)
// and client components. This file must stay free of Prisma/auth imports so it does not
// pull server-only code into client bundles.

export const CONVERSATION_PAGE_SIZE = 20
export const MESSAGE_PAGE_SIZE = 30
export const MAX_MESSAGE_LENGTH = 4000

export type MessagingPrivacy = 'CONNECTIONS_ONLY' | 'MEMBERS_ONLY' | 'PRIVATE'

const messagingPrivacyValues: MessagingPrivacy[] = ['CONNECTIONS_ONLY', 'MEMBERS_ONLY', 'PRIVATE']

export function isMessagingPrivacy(value: string): value is MessagingPrivacy {
  return messagingPrivacyValues.includes(value as MessagingPrivacy)
}
