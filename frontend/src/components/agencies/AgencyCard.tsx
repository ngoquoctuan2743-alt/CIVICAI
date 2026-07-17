import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { GovernmentAgency } from '../../types/api';

const LEVEL_LABEL: Record<string, string> = {
  CENTRAL: 'Trung ương',
  PROVINCE: 'Tỉnh/Thành',
  WARD: 'Xã/Phường',
};

/** Card cơ quan nhà nước — địa chỉ, liên hệ, Google Maps link (NHIỆM VỤ 8) */
export function AgencyCard({ agency }: { agency: GovernmentAgency }) {
  const mapsUrl = agency.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agency.address)}`
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-medium text-slate-800">{agency.name}</h3>
        <Badge tone="blue" className="shrink-0">{LEVEL_LABEL[agency.level] ?? agency.level}</Badge>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-slate-600">
        {agency.address && (
          <span className="flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" /> {agency.address}
          </span>
        )}
        {agency.phone && (
          <a href={`tel:${agency.phone}`} className="flex items-center gap-2 hover:text-primary">
            <Phone size={14} className="shrink-0 text-slate-400" /> {agency.phone}
          </a>
        )}
        {agency.email && (
          <a href={`mailto:${agency.email}`} className="flex items-center gap-2 hover:text-primary">
            <Mail size={14} className="shrink-0 text-slate-400" /> {agency.email}
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {agency.website && (
          <a href={agency.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-primary hover:underline">
            Website <ExternalLink size={11} />
          </a>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-primary hover:underline">
            Xem trên Google Maps <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
