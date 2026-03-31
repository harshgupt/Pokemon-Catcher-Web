const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Prepend the Vite base path so assets work on GitHub Pages subpaths */
export const assetUrl = (path) => `${BASE}${path}`
