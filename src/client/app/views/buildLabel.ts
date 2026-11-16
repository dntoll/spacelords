export interface BuildInfo {
  readonly branch: string;
  readonly revision: string;
  readonly builtAt: string;
  readonly localChanges: boolean;
}

// synlig-byggversion: Vite embeds the build as JSON. Tests and unknown builds have none.
export function parseBuildInfo(raw: string | undefined): BuildInfo | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { branch, revision, builtAt, localChanges } = value as Record<
      string,
      unknown
    >;
    if (
      typeof branch !== 'string' ||
      typeof revision !== 'string' ||
      typeof builtAt !== 'string' ||
      !branch ||
      Number.isNaN(Date.parse(builtAt))
    )
      return null;
    return { branch, revision, builtAt, localChanges: localChanges === true };
  } catch {
    return null;
  }
}

const builtAtFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// synlig-byggversion: branch first, since it tells which line of work is deployed.
export function buildLabelText(info: BuildInfo): string {
  const parts = [info.branch];
  if (info.revision) parts.push(info.revision.slice(0, 7));
  parts.push(builtAtFormat.format(new Date(info.builtAt)));
  if (info.localChanges) parts.push('local changes');
  return parts.join(' · ');
}

export const currentBuild = parseBuildInfo(
  import.meta.env.VITE_SPACELORDS_BUILD as string | undefined,
);
