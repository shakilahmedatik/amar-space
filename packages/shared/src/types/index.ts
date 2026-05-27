/** Service context injected into domain services */
export interface ServiceContext {
  db: unknown
  auditLogger: unknown
}

/** Request context injected by auth middleware */
export interface RequestContext {
  userId: string
  role: 'owner' | 'manager' | 'renter'
  ownerAccountId: string
  assignedBuildingIds?: string[]
  assignedFlatId?: string
  ipAddress: string
  userAgent: string
}

/** Standard API error response */
export interface ApiErrorResponse {
  requestId: string
  statusCode: number
  error: string
  message: string
  errors?: FieldError[]
}

/** Field-level validation error */
export interface FieldError {
  field: string
  message: string
  rule?: string
}
