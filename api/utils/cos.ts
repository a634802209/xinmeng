import path from 'path'
import fs from 'fs'

let COS: any = null
try {
  COS = require('cos-nodejs-sdk-v5')
} catch {
  // cos-nodejs-sdk-v5 not installed, COS features disabled
}

const secretId = process.env.TENCENT_COS_SECRET_ID
const secretKey = process.env.TENCENT_COS_SECRET_KEY
const bucket = process.env.TENCENT_COS_BUCKET
const region = process.env.TENCENT_COS_REGION
const cosDomain = process.env.TENCENT_COS_DOMAIN
const cosLocalPath = process.env.COS_LOCAL_PATH || '/lhcos-data'

let cosClient: any = null

export function getCOSClient(): any | null {
  if (!COS || !secretId || !secretKey || !bucket || !region) {
    return null
  }
  if (!cosClient) {
    cosClient = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    })
  }
  return cosClient
}

export function isCOSEnabled(): boolean {
  return !!(COS && secretId && secretKey && bucket && region)
}

export function isLocalCOSMounted(): boolean {
  try {
    return fs.existsSync(cosLocalPath) && fs.statSync(cosLocalPath).isDirectory()
  } catch {
    return false
  }
}

export function getLocalCOSPath(): string {
  return cosLocalPath
}

export function getCOSFileUrl(key: string): string {
  // 优先使用本地挂载的URL
  if (isLocalCOSMounted()) {
    return `/cos/${key}`
  }
  // 回退到COS SDK的URL
  if (cosDomain) {
    return `https://${cosDomain}/${key}`
  }
  if (bucket && region) {
    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
  }
  return `/cos/${key}`
}

export async function uploadToCOS(
  localPath: string,
  key: string
): Promise<string> {
  // 如果配置了本地挂载，直接复制文件到挂载目录
  if (isLocalCOSMounted()) {
    const destPath = path.join(cosLocalPath, key)
    const destDir = path.dirname(destPath)
    
    // 确保目标目录存在
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    
    // 复制文件
    fs.copyFileSync(localPath, destPath)
    
    return getCOSFileUrl(key)
  }

  // 否则使用COS SDK上传
  const client = getCOSClient()
  if (!client) {
    throw new Error('COS not configured')
  }

  return new Promise((resolve, reject) => {
    client.putObject(
      {
        Bucket: bucket!,
        Region: region!,
        Key: key,
        Body: fs.createReadStream(localPath),
        ContentType: getContentType(key),
      },
      (err: any, data: any) => {
        if (err) {
          reject(err)
          return
        }
        const url = getCOSFileUrl(key)
        resolve(url)
      }
    )
  })
}

export async function deleteFromCOS(key: string): Promise<void> {
  // 如果配置了本地挂载，删除本地文件
  if (isLocalCOSMounted()) {
    const filePath = path.join(cosLocalPath, key)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return
  }

  // 否则使用COS SDK删除
  const client = getCOSClient()
  if (!client) return

  return new Promise((resolve, reject) => {
    client.deleteObject(
      {
        Bucket: bucket!,
        Region: region!,
        Key: key,
      },
      (err: any) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      }
    )
  })
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  }
  return map[ext] || 'application/octet-stream'
}
