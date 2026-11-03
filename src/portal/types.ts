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
  codename: string;
  tagline: string;
  skills: Array<{ name: string; level: number }>;
  currently: string;
  fun_fact: string;
  pop_pick: string;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  pitcher_name: string;
  contact_email: string;
  project_name: string;
  pitch: string;
  platforms: string[];
  help_wanted: string[];
  links: Record<string, string>;
  status: 'new' | 'reviewing' | 'approved' | 'declined';
  reviewer_notes: string;
  project_id: string | null;
  created_at: string;
}

export interface CertificationRow {
  id: string;
  member_id: string;
  title: string;
  issuer: string;
  issued_on: string | null;
  expires_on: string | null;
  credential_url: string | null;
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
