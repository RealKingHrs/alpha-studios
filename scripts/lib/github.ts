import type { RepoDetails } from '../../src/content/schema';

interface GhCommit {
  sha: string;
  commit: { message: string; author: { date: string; name: string } };
  author: { login: string } | null;
}

/** Fetch public repo details server-side so visitors' browsers never call the GitHub API. */
export async function fetchRepoDetails(repo: string, token?: string): Promise<RepoDetails> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'alpha-studios-publish',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const get = async (path: string) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers });
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${repo}${path}`);
    return res.json();
  };
  const [info, languages, commits, contributors] = await Promise.all([
    get(''),
    get('/languages'),
    get('/commits?per_page=5'),
    get('/contributors?per_page=30'),
  ]);
  return {
    stars: info.stargazers_count,
    languages,
    recentCommits: commits.map((c: GhCommit) => ({
      sha: String(c.sha).slice(0, 7),
      message: String(c.commit.message).split('\n')[0],
      date: c.commit.author.date,
      author: c.author?.login ?? c.commit.author.name,
    })),
    contributors: contributors.map((c: { login: string }) => c.login),
    fetchedAt: new Date().toISOString(),
  };
}
