import { getConfigJson } from '../lib/systemConfig'

export interface SanitizeResult {
  clean: boolean
  flagged: boolean
  text: string
  issues: string[]
}

// Rule 2: Commission tokens (case-insensitive) — never let these reach client-facing output
const BUILTIN_COMMISSION_TOKENS = [
  /commission/i,
  /kickback/i,
  /(?<!time\s)markup/i,
  /vendor\s+pays/i,
  /we\s+receive\s+a\s+fee/i,
  /pay[-\s]to[-\s]recommend/i,
  /commissionnement/i,
  /pourcentage\s+sur/i,
  /comiss[aã]o/i,
]

export async function commissionSanitize(text: string): Promise<SanitizeResult> {
  // Merge builtin tokens with any extras stored in system_config
  let patterns = [...BUILTIN_COMMISSION_TOKENS]
  const extra = await getConfigJson<string[]>('forbidden_tokens')
  if (Array.isArray(extra)) {
    for (const token of extra) {
      try {
        patterns.push(new RegExp(token, 'i'))
      } catch {
        // Ignore invalid regex entries from config
      }
    }
  }

  const issues: string[] = []
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      issues.push(`Forbidden token matched: ${pattern.source}`)
    }
  }

  return {
    clean: issues.length === 0,
    flagged: issues.length > 0,
    text,
    issues,
  }
}

// DPW only offers calls on Monday and Wednesday — strip any other day-specific call offers
const DAY_CALL_PATTERN =
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b[^.]*?(call|appel|phone|chat|speak|discussion|consultation)/gi

const ALLOWED_CALL_DAYS = /\b(Monday|Wednesday|lundi|mercredi)\b/i

export function callAvailabilitySanitize(text: string): SanitizeResult {
  const issues: string[] = []
  let sanitized = text

  sanitized = sanitized.replace(DAY_CALL_PATTERN, (match) => {
    if (ALLOWED_CALL_DAYS.test(match)) return match
    issues.push(`Non-allowed call day reference removed: "${match.substring(0, 60)}..."`)
    return 'a call on Monday or Wednesday'
  })

  return {
    clean: issues.length === 0,
    flagged: false, // availability issues don't block; they auto-replace
    text: sanitized,
    issues,
  }
}

// Rule 1: Subject line must exact-match the fixed subject for the planning step — never paraphrased
export function subjectLineEnforcer(
  draftSubject: string,
  fixedSubject: string,
): SanitizeResult {
  const matches = draftSubject.trim() === fixedSubject.trim()
  return {
    clean: matches,
    flagged: !matches,
    text: fixedSubject, // always return the authoritative fixed subject
    issues: matches
      ? []
      : [`Subject mismatch: got "${draftSubject}", expected "${fixedSubject}"`],
  }
}
