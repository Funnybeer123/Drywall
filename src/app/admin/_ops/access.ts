import 'server-only'
import { notFound } from 'next/navigation'
import { and, eq, inArray, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { projectAssignments, projects, type Project } from '@/db/schema'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'

/**
 * WHERE clause limiting `projects` to what this user may see.
 * Owners/managers see every job; crew only the jobs they're assigned to.
 */
export function projectScope(user: SessionUser): SQL | undefined {
  if (can(user, 'jobs:view_all')) return undefined
  return inArray(
    projects.id,
    db.select({ id: projectAssignments.projectId }).from(projectAssignments).where(eq(projectAssignments.userId, user.id)),
  )
}

/** Loads a job the user is allowed to see, or 404s (never reveals that the job exists). */
export async function requireProjectAccess(user: SessionUser, projectId: number): Promise<Project> {
  if (!Number.isInteger(projectId) || projectId <= 0) notFound()
  const [p] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), projectScope(user)))
  if (!p) notFound()
  return p
}

/** Parses a positive integer route param / form value, or 404s. */
export function idParam(v: string | number | null | undefined): number {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) notFound()
  return n
}
