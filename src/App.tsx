import type { Snapshot } from './content/schema';
import { SiteApp } from './site/SiteApp';

/** The whole public site. `pathname` is the address the page was loaded or prerendered at. */
export function App({ snap, pathname, base }: { snap: Snapshot; pathname: string; base: string }) {
  return <SiteApp snap={snap} pathname={pathname} base={base} />;
}
