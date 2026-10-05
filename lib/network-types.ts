export type ConnectionState =
  | 'none'
  | 'sent'
  | 'received'
  | 'connected'
  | 'unavailable'

export type NetworkTab =
  | 'connections'
  | 'received'
  | 'sent'
  | 'following'
  | 'followers'

export type NetworkActionResult =
  | { ok: true }
  | { ok: false; error: string }
