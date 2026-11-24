import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function saveDistrictsPlugin(): Plugin {
  return {
    name: 'save-districts-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/save-districts' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              const formatted = JSON.stringify(data, null, 2)
              const targetPath = path.resolve(__dirname, 'src/data/districtPolygons.json')
              fs.writeFileSync(targetPath, formatted, 'utf8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'Đã lưu thành công vào src/data/districtPolygons.json!' }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err?.message || 'Lỗi lưu file' }))
            }
          })
          return
        }

        if (req.url === '/api/save-terrain' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              const formatted = JSON.stringify(data, null, 2)
              const targetPath = path.resolve(__dirname, 'src/data/terrainGridData.json')
              fs.writeFileSync(targetPath, formatted, 'utf8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'Đã lưu thành công vào src/data/terrainGridData.json!' }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err?.message || 'Lỗi lưu file' }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), saveDistrictsPlugin()],
})
