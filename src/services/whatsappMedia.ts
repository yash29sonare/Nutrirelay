import { createClient } from '@supabase/supabase-js'
import { getTrainerWaba } from '@/lib/waba/getTrainerWaba'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'whatsapp_media'

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false })
  }
}

export async function downloadAndStoreWhatsAppMedia(
  trainerId: string,
  mediaId:   string,
  wamId:     string,
): Promise<{ publicUrl: string; mimeType: string }> {
  const { accessToken: token } = await getTrainerWaba(trainerId)

  // Step 1 — Resolve transient media URL from Meta Graph API
  const metaRes = await fetch(
    `https://graph.facebook.com/v20.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!metaRes.ok) {
    throw new Error(
      `Meta Graph API returned ${metaRes.status} for mediaId ${mediaId}`,
    )
  }

  const metaJson = (await metaRes.json()) as { url?: string; mime_type?: string }
  const mediaUrl = metaJson.url
  const mimeType = metaJson.mime_type ?? 'application/octet-stream'

  if (!mediaUrl) {
    throw new Error(`No url in Meta Graph API response for mediaId ${mediaId}`)
  }

  // Step 2 — Download the raw binary stream
  const mediaRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!mediaRes.ok) {
    throw new Error(
      `Failed to download media from Meta CDN: ${mediaRes.status}`,
    )
  }

  const buffer = await mediaRes.arrayBuffer()

  // Step 3 — Upload to Supabase Storage
  await ensureBucket()

  const ext         = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'
  const storagePath = `${wamId}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert:      false,
    })

  if (uploadError && uploadError.message !== 'The resource already exists') {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${signedError?.message ?? 'no url returned'}`)
  }

  return {
    publicUrl: signedData.signedUrl,
    mimeType,
  }
}
