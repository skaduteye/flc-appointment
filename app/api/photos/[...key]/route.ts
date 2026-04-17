import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client } from '@/app/api/upload/photo/route'

// GET /api/photos/passport-photos/<uuid>.jpg
// Generates a short-lived presigned GET URL and redirects to it.
// Photos are never publicly accessible — only served through this route.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params
  const key = segments.join('/')

  // Basic path validation — only allow passport-photos/ prefix
  if (!key.startsWith('passport-photos/') || key.includes('..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })

  const url = await getSignedUrl(client, command, { expiresIn: 900 }) // 15 min

  return NextResponse.redirect(url, { status: 302 })
}
