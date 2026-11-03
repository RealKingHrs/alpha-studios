export interface MemberRow {
  id: string;
  user_id: string | null;
  slug: string;
  name: string;
  role_title: string;
  bio: string;
  github_username: string | null;
  links: Record<string, string>;
  avatar: { version: number; options: Record<string, number> };
  role: 'crew' | 'admin';
  access_status: 'invited' | 'active' | 'revoked';
  consented_at: string | null;
}

export interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  summary: string;
  story: string;
  status: 'live' | 'beta' | 'in-development';
  platforms: string[];
  tech: string[];
  links: Record<string, string>;
  repo: string | null;
  featured: boolean;
  screenshots: Array<{
    src: string;
    alt: string;
    device: 'iphone' | 'android' | 'mac' | 'browser';
  }>;
}

export interface AuditRow {
  id: number;
  at: string;
  actor: string | null;
  table_name: string;
  row_id: string | null;
  action: string;
  previous: Record<string, unknown> | null;
  new: Record<string, unknown> | null;
  reverted_at: string | null;
}
