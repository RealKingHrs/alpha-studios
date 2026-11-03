import type { Snapshot } from './content/schema';
import { matchRoute } from './routes';

const STUDIO = 'Alpha Studios';

/** Title and description for an address. Used at build time for the HTML and in the browser on navigation. */
export function pageMeta(
  pathname: string,
  base: string,
  snap: Snapshot,
): { title: string; description: string } {
  const route = matchRoute(pathname, base, snap);
  switch (route.name) {
    case 'project': {
      const p = snap.projects.find((x) => x.slug === route.slug)!;
      return { title: `${p.name} | ${STUDIO}`, description: p.summary };
    }
    case 'member': {
      const m = snap.members.find((x) => x.slug === route.slug)!;
      return { title: `${m.name}, ${m.role} | ${STUDIO}`, description: m.bio };
    }
    case 'certificate': {
      const c = snap.certifications.find((x) => x.id === route.id)!;
      const m = snap.members.find((x) => x.slug === route.slug)!;
      return {
        title: `${c.title}, ${m.name} | ${STUDIO}`,
        description:
          `${m.name} earned ${c.title}${c.issuer ? ` from ${c.issuer}` : ''}. ${c.description}`.trim(),
      };
    }
    case 'projects':
      return {
        title: `Projects | ${STUDIO}`,
        description: 'The projects Alpha Studios has built.',
      };
    case 'crew':
      return { title: `Crew | ${STUDIO}`, description: 'The people who build at Alpha Studios.' };
    case 'launchpad':
      return {
        title: `Launchpad | ${STUDIO}`,
        description:
          'Pitch your project to Alpha Studios. If the team approves, we adopt it and credit you as founder for good.',
      };
    case 'about':
      return {
        title: `About | ${STUDIO}`,
        description:
          'Why Alpha Studios exists, what we believe about building software, and what we are working towards.',
      };
    case 'contact':
      return { title: `Contact | ${STUDIO}`, description: 'Get in touch with Alpha Studios.' };
    case 'portal':
      return { title: `Crew portal | ${STUDIO}`, description: 'Sign in for crew and admin.' };
    case 'not-found':
      return { title: `Page not found | ${STUDIO}`, description: 'This address does not exist.' };
    default:
      return { title: STUDIO, description: snap.settings.studioStatement };
  }
}
