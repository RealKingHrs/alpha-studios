import { Suspense, lazy } from 'react';
import type { Snapshot } from './content/schema';
import { isExplore, useSearch } from './router';
import { SiteApp } from './site/SiteApp';

// Explore in 3D is a separate chunk: the bright site never downloads it unless asked.
const ExploreApp = lazy(() =>
  import('./explore/ExploreApp').then((m) => ({ default: m.ExploreApp })),
);

/**
 * The bright site is the default. Adding ?explore to any address opens the dark 3D vault at that place.
 * `search` is the query string the page was loaded with, so hydration matches what was rendered.
 */
export function App({
  snap,
  pathname,
  base,
  search = '',
}: {
  snap: Snapshot;
  pathname: string;
  base: string;
  search?: string;
}) {
  const current = useSearch(search);
  return isExplore(current) ? (
    <Suspense fallback={null}>
      <ExploreApp snap={snap} pathname={pathname} base={base} />
    </Suspense>
  ) : (
    <SiteApp snap={snap} pathname={pathname} base={base} />
  );
}
