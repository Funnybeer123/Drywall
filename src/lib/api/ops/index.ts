import 'server-only'
import type { Operation } from '../framework'
import { coreOps } from './core'
import { salesOps } from './sales'
import { jobOps } from './jobs'
import { moneyOps } from './money'
import { contentOps } from './content'

/** Every API operation. Order here is the order tools are listed to the AI. */
export const OPERATIONS: Operation[] = [...coreOps, ...salesOps, ...jobOps, ...moneyOps, ...contentOps]
