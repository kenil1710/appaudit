"use client";

import useSWR from "swr";
import { appName } from "./format";

/** The app's NAME from a store title: the part before a store-style subtitle
 *  ("LinkedIn: Community & Network" -> "LinkedIn"), the same split the
 *  contract uses for same-app binding. */
export function nameFromTitle(title: string): string {
  let cut = title.length;
  for (const sep of [" - ", " – ", " — ", ": ", " | ", " · "]) {
    const at = title.indexOf(sep);
    if (at > 0 && at < cut) cut = at;
  }
  return title.slice(0, cut).trim();
}

export function useTitles(keys: string[]) {
  const list = [...new Set(keys.filter(Boolean))].sort();
  const { data } = useSWR(list.length ? ["titles", list.join(",")] : null,
    () => fetch(`/api/titles?keys=${encodeURIComponent(list.join(","))}`).then((r) => r.json() as Promise<Record<string, string>>),
    { revalidateOnFocus: false, shouldRetryOnError: false });
  return data ?? {};
}

/** The store's own title when it has been read, else the slug-derived name. */
export function displayName(titles: Record<string, string>, key: string, label: string): string {
  const t = titles[key];
  return t ? nameFromTitle(t) : appName(key, label);
}
