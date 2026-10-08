/**
 * Runs in <head> before first paint so pages never flash the wrong theme.
 * A saved choice wins; otherwise the device setting is followed (and tracked if it changes).
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)'),s=function(){var t=localStorage.getItem('theme');d.classList.toggle('dark',t?t==='dark':m.matches)};s();m.addEventListener('change',s)}catch(e){}})()`
