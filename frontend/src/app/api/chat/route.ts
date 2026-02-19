import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/civic-agent'

/**
 * POST /api/chat
 * 
 * Proxies chat requests to Kimi AI (Moonshot) with civic context injected.
 * The Kimi API is OpenAI-compatible at https://api.moonshot.ai/v1
 * 
 * Body: { message: string, wardId?: number, history?: {role,content}[] }
 */

const KIMI_API_URL = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'kimi-k2-0711-preview'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, wardId, history } = body as {
      message: string
      wardId?: number
      history?: { role: string; content: string }[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.MOONSHOT_API_KEY
    if (!apiKey) {
      // Fallback to local responses when no API key is configured
      return NextResponse.json({
        message: getFallbackResponse(message, wardId),
        sources: [],
        model: 'fallback',
      })
    }

    // Build conversation with civic system prompt + history + new message
    const systemPrompt = buildSystemPrompt(wardId)
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (last 10 turns to stay within context)
    if (history?.length) {
      const recent = history.slice(-10)
      messages.push(...recent)
    }

    // Add the new user message
    messages.push({ role: 'user', content: message })

    // Call Kimi AI
    const kimiRes = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!kimiRes.ok) {
      const errText = await kimiRes.text()
      console.error(`Kimi API error (${kimiRes.status}):`, errText)

      // If Kimi fails, return a graceful fallback
      return NextResponse.json({
        message: getFallbackResponse(message, wardId),
        sources: [],
        model: 'fallback',
        _kimiError: kimiRes.status,
      })
    }

    const data = await kimiRes.json()
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, I was unable to generate a response. Please try again.'

    return NextResponse.json({
      message: assistantMessage,
      sources: buildSources(wardId),
      model: KIMI_MODEL,
      usage: data.usage,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Build source citations based on ward context
 */
function buildSources(wardId?: number) {
  const sources = [
    {
      title: 'Chicago Data Portal',
      url: 'https://data.cityofchicago.org/resource/htai-wnw4.json',
      snippet: 'Official ward office data',
    },
  ]

  if (wardId) {
    const padded = String(wardId).padStart(2, '0')
    sources.push({
      title: `Chicago.gov Ward ${wardId}`,
      url: `https://www.chicago.gov/city/en/about/wards/${padded}.html`,
      snippet: `Official Ward ${wardId} page`,
    })
  }

  return sources
}

/**
 * Smart fallback when Kimi API is unavailable or no key is set.
 * Uses the real ward data to still give accurate answers.
 */
function getFallbackResponse(query: string, wardId?: number): string {
  const q = query.toLowerCase()

  // Import ward data inline for fallback
  const { getWardRecord, CHICAGO_WARDS } = require('@/lib/ward-data')

  if (wardId) {
    const w = getWardRecord(wardId)
    if (w) {
      if (q.includes('who') || q.includes('alderman') || q.includes('alderperson') || q.includes('represent')) {
        return `Ward ${w.ward} is represented by Alderperson **${w.alderperson}**.\n\n- Phone: ${w.wardPhone}\n- Email: ${w.email}\n- Office: ${w.wardOfficeAddress}, ${w.wardOfficeCity}, ${w.wardOfficeState} ${w.wardOfficeZip}${w.website ? `\n- Website: ${w.website}` : ''}\n\nTheir current term runs from May 2023 to May 2027.`
      }

      if (q.includes('contact') || q.includes('phone') || q.includes('email') || q.includes('reach') || q.includes('call')) {
        return `Here's how to contact the Ward ${w.ward} office:\n\n- **Phone**: ${w.wardPhone}\n- **Email**: ${w.email}\n- **Address**: ${w.wardOfficeAddress}, ${w.wardOfficeCity}, ${w.wardOfficeState} ${w.wardOfficeZip}\n- **City Hall Phone**: ${w.cityHallPhone}${w.website ? `\n- **Website**: ${w.website}` : ''}\n\nOffice hours are typically Mon-Fri, 9 AM - 5 PM.`
      }

      if (q.includes('neighborhood') || q.includes('where') || q.includes('area') || q.includes('what part')) {
        return `Ward ${w.ward} covers these neighborhoods: **${w.neighborhoods.join(', ')}**.\n\nThe ward office is located at ${w.wardOfficeAddress}. Alderperson ${w.alderperson} represents this ward.`
      }

      if (q.includes('meeting') || q.includes('schedule') || q.includes('when')) {
        return `For Ward ${w.ward} meeting schedules, I recommend checking:\n\n${w.website ? `- **Ward website**: ${w.website}\n` : ''}- **City Council meetings**: chicityclerkelms.chicago.gov\n- **Contact the office**: ${w.wardPhone} or ${w.email}\n\nMost wards hold monthly community meetings. Contact Alderperson ${w.alderperson}'s office for the latest schedule.`
      }

      // Generic ward response
      return `Ward ${w.ward} is represented by Alderperson **${w.alderperson}** and covers ${w.neighborhoods.join(', ')}.\n\nWard Office: ${w.wardOfficeAddress}\nPhone: ${w.wardPhone}\nEmail: ${w.email}\n\nWhat specific information would you like about Ward ${w.ward}? I can help with contact info, neighborhoods, meetings, or how to get involved.`
    }
  }

  // General (non-ward-specific) responses
  if (q.includes('election') || q.includes('vote') || q.includes('register')) {
    return `For Chicago election information:\n\n- **Check registration**: chicagoelections.gov/your-voter-information\n- **Find your polling place**: Same link above\n- **Board of Elections**: chicagoelections.gov\n- **Next municipal election**: February 2027\n\nAll alderpersons serve 4-year terms (current term: May 2023 – May 2027).`
  }

  if (q.includes('311') || q.includes('pothole') || q.includes('report') || q.includes('complaint') || q.includes('service')) {
    return `For city service requests:\n\n- **311 Online**: 311.chicago.gov\n- **Call**: 311 (within Chicago) or (312) 744-5000\n- **Report issues**: Potholes, street lights, graffiti, abandoned vehicles, and more\n\nYou can also contact your alderperson's ward office directly for local issues.`
  }

  if (q.includes('find') && q.includes('ward')) {
    return `To find your ward:\n\n1. Visit **chicagoelections.gov/your-voter-information**\n2. Enter your address\n3. It will show your ward number, alderperson, and polling place\n\nChicago has 50 wards, each represented by one alderperson on the City Council.`
  }

  return `I'm CivicGuide, your AI assistant for Chicago civic engagement. I can help you with:\n\n- **Ward information**: Who represents your ward, contact info, neighborhoods\n- **Meetings**: How to find and attend ward or city council meetings\n- **Elections**: Registration, polling places, upcoming elections\n- **City services**: How to report issues via 311\n- **Getting involved**: Volunteering, attending meetings, contacting officials\n\nTry asking something like "Who is the alderperson for Ward 48?" or "How do I find my ward?"`
}
