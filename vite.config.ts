import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// 本地开发时把 /api/* 交给 api/ 目录里的 Vercel 函数处理（线上由 Vercel 直接托管这些函数）
function localApiRoutes() {
  return {
    name: 'local-api-routes',
    apply: 'serve' as const,
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const match = url.pathname.match(/^\/api\/([A-Za-z0-9_-]+)$/)
        if (!match) return next()

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8')
          try {
            req.body = raw ? JSON.parse(raw) : {}
          } catch {
            req.body = {}
          }

          req.query = Object.fromEntries(url.searchParams)

          res.status = (code: number) => {
            res.statusCode = code
            return res
          }
          res.json = (data: unknown) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }

          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`)
          await mod.default(req, res)
        } catch (error) {
          console.error('[local-api]', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(error) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    localApiRoutes(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
