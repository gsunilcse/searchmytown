import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublishForm from '@/components/PublishForm';
import { getModuleDefinition, getTownModulePath, isDirectoryModuleKey } from '@/config/modules';
import { buildPublishMetadata } from '@/lib/seo';
import { getEnabledTownById } from '@/lib/town-settings';

export const dynamic = 'force-dynamic';

type PublishPageProps = {
  params: Promise<{
    town: string;
    module: string;
  }>;
};

export async function generateMetadata({ params }: PublishPageProps): Promise<Metadata> {
  const { module, town } = await params;
  const selectedTown = await getEnabledTownById(town);
  const moduleDefinition = getModuleDefinition(module);

  if (!selectedTown || !isDirectoryModuleKey(module) || !moduleDefinition) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildPublishMetadata(selectedTown, moduleDefinition);
}

export default async function PublishPage({ params }: PublishPageProps) {
  const { module, town } = await params;
  const selectedTown = await getEnabledTownById(town);

  if (!selectedTown || !isDirectoryModuleKey(module)) {
    notFound();
  }

  const moduleDefinition = getModuleDefinition(module);
  if (!moduleDefinition) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_#111111_0%,_#27272a_48%,_#52525b_100%)] p-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">Publish for {selectedTown.name}</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">{moduleDefinition.publishTitle}</h1>
          <p className="mt-4 text-sm leading-7 text-white/78 sm:text-base">
            Submit new {moduleDefinition.label.toLowerCase()} information for {selectedTown.name}. The admin team reviews every request before it becomes visible on the public website.
          </p>

          <div className="mt-8 space-y-4 rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Approval flow</div>
            <ol className="space-y-3 text-sm leading-7 text-white/82">
              <li>1. Submit the listing with clear contact details and town context.</li>
              <li>2. The entry goes into the pending admin review queue.</li>
              <li>3. Visitors can view it only after approval.</li>
            </ol>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${selectedTown.id}`}
              className="rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
            >
              Back to dashboard
            </Link>
            <Link
              href={getTownModulePath(selectedTown.id, module)}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-slate-100"
              style={{ color: '#0f172a' }}
            >
              <span style={{ color: '#0f172a' }}>
                View approved {moduleDefinition.label.toLowerCase()}
              </span>
            </Link>
          </div>
        </section>

        <PublishForm town={selectedTown} moduleDefinition={moduleDefinition} />
      </div>
    </main>
  );
}