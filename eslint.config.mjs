import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Uploaded photos come from Vercel Blob or /public/uploads with unknown sizes.
      '@next/next/no-img-element': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', '.data/**', 'drizzle/**', 'next-env.d.ts'] },
]
