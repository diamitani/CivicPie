import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { DIGEST_FREQUENCIES, SUBSCRIPTION_TOPICS } from '@/lib/community-data'

export const runtime = 'nodejs'

const allowedTopics = new Set(SUBSCRIPTION_TOPICS.map((topic) => topic.id))
const allowedFrequencies = new Set(DIGEST_FREQUENCIES.map((frequency) => frequency.id))

interface SubscriptionPayload {
  fullName?: string
  email?: string
  address?: string
  zipCode?: string
  wardNumber?: number | null
  topics?: string[]
  frequencies?: string[]
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function persistLocally(record: Record<string, unknown>) {
  const dir = path.join(process.cwd(), '.local-dev')
  await fs.mkdir(dir, { recursive: true })
  await fs.appendFile(
    path.join(dir, 'community_subscriptions.ndjson'),
    `${JSON.stringify(record)}\n`,
    'utf8'
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscriptionPayload
    const email = body.email?.trim().toLowerCase()
    const fullName = body.fullName?.trim() || null
    const address = body.address?.trim() || null
    const zipCode = body.zipCode?.trim() || null
    const topics = (body.topics ?? []).filter((item) => allowedTopics.has(item as typeof SUBSCRIPTION_TOPICS[number]['id']))
    const frequencies = (body.frequencies ?? []).filter((item) =>
      allowedFrequencies.has(item as typeof DIGEST_FREQUENCIES[number]['id'])
    )

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }

    if (!topics.length) {
      return NextResponse.json({ error: 'Choose at least one topic to follow.' }, { status: 400 })
    }

    if (!frequencies.length) {
      return NextResponse.json({ error: 'Choose at least one delivery timing option.' }, { status: 400 })
    }

    const wardNumber =
      typeof body.wardNumber === 'number' && body.wardNumber >= 1 && body.wardNumber <= 50
        ? body.wardNumber
        : null

    const record = {
      email,
      full_name: fullName,
      address_text: address,
      zip_code: zipCode,
      ward_number: wardNumber,
      topics,
      digest_frequencies: frequencies,
      source_preferences: {},
      status: 'active',
      updated_at: new Date().toISOString(),
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/community_subscriptions?on_conflict=email`,
        {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(record),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: `Supabase rejected the subscription payload: ${errorText}` },
          { status: 502 }
        )
      }

      return NextResponse.json({ ok: true, mode: 'supabase' })
    }

    if (process.env.NODE_ENV !== 'production') {
      await persistLocally({
        ...record,
        created_at: new Date().toISOString(),
      })
      return NextResponse.json({ ok: true, mode: 'dev-file' })
    }

    return NextResponse.json(
      { error: 'Subscription storage is not configured yet. Add Supabase environment variables to enable this in production.' },
      { status: 503 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to process subscription request.',
      },
      { status: 500 }
    )
  }
}
