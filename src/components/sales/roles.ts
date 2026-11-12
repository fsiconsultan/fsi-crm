// The values the sales_users_role_check constraint allows, and the two states
// the login RPC understands. Plain module so forms and actions can share it.
export const SALES_ROLES = ["Admin", "Sales", "Digital Marketing", "Secretary"] as const
export const SALES_STATUSES = ["Active", "Inactive"] as const
