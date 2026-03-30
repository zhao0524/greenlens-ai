export interface IntegrationMetadata {
  renewal_date?: string
  key_prefix?: string
  [key: string]: unknown
}

export interface IntegrationRecord {
  id: string
  provider: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  is_active?: boolean
  metadata?: IntegrationMetadata | null
}
