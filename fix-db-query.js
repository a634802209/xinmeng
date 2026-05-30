
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const apiDir = path.join(__dirname, 'api')

function processFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // 替换 const [rows] = await db.query 为 const rows = await db.query
  const newContent = content.replace(/const \[([a-zA-Z_][a-zA-Z0-9_]*)\] = await (db\.(query|execute))/g, (match, varName) => {
    modified = true
    return `const ${varName} = await db.${match.includes('execute') ? 'execute' : 'query'}`
  })

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8')
    console.log(`Fixed: ${filePath}`)
  }
}

function walkDirectory(dir: string) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walkDirectory(fullPath)
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      processFile(fullPath)
    }
  }
}

walkDirectory(apiDir)
console.log('Done!')
