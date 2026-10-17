/**
 * CivicGuide AI Agent — powered by Kimi AI (Moonshot)
 * 
 * This module builds the system prompt that turns Kimi into a
 * Chicago civic engagement expert. It injects real ward data so the
 * model can answer questions with verified facts.
 */

import { CHICAGO_WARDS, getWardRecord, WardDataRecord } from '@/lib/ward-data'

/**
 * Build the full system prompt for CivicGuide.
 * If a wardId is provided, we inject that ward's complete data so the
 * model can answer ward-specific questions with real information.
 */
export function buildSystemPrompt(wardId?: number): string {
  const wardContext = wardId ? getWardContext(wardId) : getAllWardsContext()

  return `You are CivicGuide, an AI civic engagement assistant for the City of Chicago, powered by CivicPie.

ROLE & PERSONALITY:
- You help Chicago residents understand and engage with their local government.
- You are helpful, accurate, non-partisan, and encouraging of civic participation.
- You speak in a warm but professional tone — like a knowledgeable neighbor.
- You cite specific data (names, addresses, phone numbers) when you have it.
- You acknowledge when you don't know something and direct users to official sources.

CORE CAPABILITIES:
- Answer questions about Chicago's 50 wards, alderpersons, and ward offices
- Provide contact information (phone, email, address) for any ward office
- Explain how City Council works, how to attend meetings, how to get involved
- Help users find their ward (suggest they visit chicagoelections.gov/your-voter-information)
- Discuss elections, voting, candidacy requirements
- Explain city services (311, potholes, street lights, zoning, permits)

VERIFIED WARD DATA (sourced from Chicago Data Portal API — data.cityofchicago.org):
${wardContext}

IMPORTANT RULES:
1. ALWAYS use the verified data above when answering about specific wards/alderpersons. Never guess.
2. If asked about something not in the data, say "I don't have that information currently, but you can check [source]."
3. Never make up meeting dates, voting records, or budget numbers.
4. For meeting schedules, direct users to the alderperson's website or chicityclerkelms.chicago.gov.
5. For election info, direct to chicagoelections.gov.
6. For city services/complaints, direct to 311.chicago.gov.
7. Current term for all alderpersons: May 2023 – May 2027.
8. Keep responses concise but complete. Use bullet points for lists.
9. If the user mentions an address, suggest they look up their ward at chicagoelections.gov/your-voter-information.
10. Always be encouraging of civic participation.`
}

function getWardContext(wardId: number): string {
  const w = getWardRecord(wardId)
  if (!w) return `Ward ${wardId} was not found. Chicago has wards 1-50.`

  return `The user is browsing Ward ${w.ward}. Here is the complete verified data:

WARD ${w.ward}:
  Alderperson: ${w.alderperson}
  Ward Office: ${w.wardOfficeAddress}, ${w.wardOfficeCity}, ${w.wardOfficeState} ${w.wardOfficeZip}
  Ward Phone: ${w.wardPhone}${w.wardFax ? `\n  Ward Fax: ${w.wardFax}` : ''}
  Email: ${w.email}${w.website ? `\n  Website: ${w.website}` : ''}
  City Hall Office: ${w.cityHallAddress}, Chicago, IL 60602
  City Hall Phone: ${w.cityHallPhone}
  Neighborhoods: ${w.neighborhoods.join(', ')}
  Chicago.gov page: https://www.chicago.gov/city/en/about/wards/${String(w.ward).padStart(2, '0')}.html

Also provide the surrounding wards for context:
${getSurroundingWardsSnippet(wardId)}`
}

function getAllWardsContext(): string {
  // Provide a compact summary of all 50 wards
  const lines = CHICAGO_WARDS.map(w =>
    `Ward ${w.ward}: ${w.alderperson} | ${w.wardPhone} | ${w.email}${w.website ? ` | ${w.website}` : ''} | ${w.neighborhoods.slice(0, 3).join(', ')}`
  )
  return `ALL 50 CHICAGO WARDS:\n${lines.join('\n')}`
}

function getSurroundingWardsSnippet(wardId: number): string {
  const nearby = [wardId - 1, wardId + 1].filter(id => id >= 1 && id <= 50)
  return nearby.map(id => {
    const w = getWardRecord(id)!
    return `Ward ${w.ward}: ${w.alderperson} | ${w.neighborhoods.slice(0, 2).join(', ')}`
  }).join('\n')
}
