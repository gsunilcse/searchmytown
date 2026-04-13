'use client';

type HelperPhoneLinkProps = {
  listingId: string;
  phone: string;
  contactName: string;
  locality: string;
};

export default function HelperPhoneLink({ listingId, phone, contactName, locality }: HelperPhoneLinkProps) {
  const href = `tel:${phone}`;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    void fetch('/api/helpers/contact-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
      keepalive: true,
    }).catch(() => undefined);

    window.location.href = href;
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="block rounded-2xl border border-white/10 bg-zinc-950/50 p-4 transition hover:border-emerald-400/50 hover:bg-zinc-900/80"
    >
      <div className="text-sm font-bold text-white truncate">{contactName}</div>
      <div className="mt-1 text-xs font-semibold text-emerald-300">{phone}</div>
      <div className="mt-1 text-[11px] text-zinc-400 truncate">{locality}</div>
    </a>
  );
}