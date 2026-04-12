'use client';

import dynamic from 'next/dynamic';
import type { ModuleDefinition } from '@/config/modules';
import type { Town } from '@/config/towns';

const PublishFormNoSSR = dynamic(() => import('@/components/PublishForm'), { ssr: false });

type PublishFormClientProps = {
  town: Town;
  moduleDefinition: ModuleDefinition;
};

export default function PublishFormClient({ town, moduleDefinition }: PublishFormClientProps) {
  return <PublishFormNoSSR town={town} moduleDefinition={moduleDefinition} />;
}
