/** true no macOS (ambiente sem `navigator`, ex.: SSR, retorna false). */
export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
}

/** true no Windows — o app roda no mesmo host que serve o PTY. */
export function isWindowsPlatform(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.startsWith('Win');
}
