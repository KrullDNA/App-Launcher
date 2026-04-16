import { evaluate } from 'mathjs'

const MATH_PATTERN = /^[\d(+\-*/^%.√sqrt]/i

export function isCalcExpression(query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return false
  return MATH_PATTERN.test(trimmed)
}

export function evaluateExpression(query: string): { expression: string; result: string } | null {
  try {
    const expr = query.trim()
      .replace(/√/g, 'sqrt')  // Handle √ symbol
      .replace(/×/g, '*')     // Handle × symbol
      .replace(/÷/g, '/')     // Handle ÷ symbol

    const result = evaluate(expr)
    if (result === undefined || result === null) return null
    if (typeof result === 'function') return null

    const formatted = typeof result === 'number'
      ? Number.isInteger(result) ? String(result) : result.toFixed(10).replace(/\.?0+$/, '')
      : String(result)

    return { expression: query.trim(), result: formatted }
  } catch {
    return null
  }
}
