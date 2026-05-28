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

export async function uploadToCOS(
  localPath: string,
  key: string
): Promise<string> {
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
        const url = cosDomain
          ? `https://${cosDomain}/${key}`
          : `https://${bucket}.cos.${region}.myqcloud.com/${key}`
        resolve(url)
      }
    )
  })
}

export async function deleteFromCOS(key: string): Promise<void> {
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
