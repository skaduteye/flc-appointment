import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  if (!accountId) throw new Error('R2_ACCOUNT_ID not set')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

// GET /api/upload/photo?type=image/jpeg&size=123456&name=samuel-ofori
// Returns a presigned PUT URL and the R2 object key to store in the DB
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contentType = searchParams.get('type') ?? ''
  const size = parseInt(searchParams.get('size') ?? '0', 10)
  const rawName = searchParams.get('name') ?? ''

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, or WebP images are allowed' },
      { status: 400 }
    )
  }

  if (!size || size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File must be between 1 byte and 5 MB' },
      { status: 400 }
    )
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  // Slugify the name: lowercase, strip non-alphanumeric, collapse hyphens
  const slug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'applicant'
  const uid = randomUUID().split('-')[0] // short 8-char suffix for uniqueness
  const key = `passport-photos/${slug}-${uid}.${ext}`
  const bucket = process.env.R2_BUCKET_NAME!

  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 })

  // Return the key only — photos are served via /api/photos/[key] (never a public URL)
  return NextResponse.json({ uploadUrl, key })
}
