import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ContentShell, { ContentSection, P } from '@/components/ContentShell';
import { Breadcrumb, Badge, Card, Alert } from '@/components/ui';
import { getService, type GovService } from '@/lib/services';

export const dynamic = 'force-dynamic';

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
};

function scopeLabel(s: GovService['scope']): string {
  const stateName = STATE_NAMES[s.state] || s.state;
  const level = s.level === 'federal' ? 'Federal' : s.level === 'state' ? 'State' : s.level === 'county' ? 'County' : 'City';
  const place = s.city || s.county;
  return place ? `${level} · ${place}, ${stateName}` : `${level} · ${stateName}`;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 font-body text-[14px] leading-relaxed text-white/70">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const service = getService(decodeURIComponent(id));
  if (!service) return { title: 'Service not found — CivicPie' };
  return {
    title: `${service.name} — CivicPie`,
    description: service.description.slice(0, 160),
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = getService(decodeURIComponent(id));
  if (!service) notFound();

  const verified = service.verifiedAt
    ? new Date(service.verifiedAt + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <ContentShell eyebrow="Services" title={service.name} intro={service.agency}>
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Services', href: '/services' }, { label: service.name }]} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <Badge variant="navy">{service.category}</Badge>
        <Badge variant="blue">{scopeLabel(service.scope)}</Badge>
        {service.cost && <Badge variant="green">{service.cost}</Badge>}
      </div>

      <ContentSection heading="About this service">
        <P>{service.description}</P>
        {service.applyLinks.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-5">
            {service.applyLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary no-underline"
                style={{ padding: '12px 24px' }}
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </ContentSection>

      {service.eligibility.length > 0 && (
        <ContentSection heading="Eligibility">
          <BulletList items={service.eligibility} />
        </ContentSection>
      )}

      {service.prerequisites.length > 0 && (
        <ContentSection heading="Before you apply">
          <BulletList items={service.prerequisites} />
        </ContentSection>
      )}

      {service.whatToBring.length > 0 && (
        <ContentSection heading="What to bring">
          <BulletList items={service.whatToBring} />
        </ContentSection>
      )}

      {service.deadlines.length > 0 && (
        <ContentSection heading="Deadlines">
          <div className="space-y-2">
            {service.deadlines.map((d, i) => (
              <div key={i} className="font-body text-[14px] text-white/70">
                <span className="font-bold text-white">{d.label}</span>
                {d.date && <span className="text-gold"> — {d.date}</span>}
                {d.note && <span className="text-white/50"> · {d.note}</span>}
              </div>
            ))}
          </div>
        </ContentSection>
      )}

      {service.contacts.length > 0 && (
        <ContentSection heading="Contact">
          <div className="space-y-2">
            {service.contacts.map((c, i) => (
              <div key={i} className="font-body text-[14px] text-white/70">
                <span className="text-white/40">{c.label}: </span>
                {c.value.startsWith('http') ? (
                  <a href={c.value} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                    {c.value}
                  </a>
                ) : (
                  <span className="text-white">{c.value}</span>
                )}
              </div>
            ))}
          </div>
        </ContentSection>
      )}

      <ContentSection heading="Details">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-body text-[14px]">
            <div>
              <span className="text-white/40">Languages: </span>
              <span className="text-white">{service.languages.length > 0 ? service.languages.join(', ') : '—'}</span>
            </div>
            <div>
              <span className="text-white/40">Verified: </span>
              <span className="text-white">{verified || '—'}</span>
            </div>
          </div>
        </Card>
      </ContentSection>

      <Alert title="Source">
        Service data: GovServ (Diamitani Industries), verified against official .gov sources.
        CivicPie doesn&apos;t file requests — use the official links above.
      </Alert>
    </ContentShell>
  );
}
