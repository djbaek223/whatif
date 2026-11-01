// A post's life records as the board shows them: on the board pages (server), in the board window and in the publish
// window (client). Takes the language as an argument instead of reading the screen's, so a server page can draw a
// Korean or an English board without touching the shared language setting.
import { BADGES, badgeById } from "@/lib/badges";
import { formatWealth } from "@/lib/format";
import type { LifeRecords } from "@/lib/records";
import { countryFor, inRegion, type Lang } from "@/lib/region";
import { EN } from "@/locales/en";

/** Korean text in the given language, from the same dictionary L reads. */
export const tr = (lang: Lang, ko: string) => (lang === "en" ? (EN[ko] ?? ko) : ko);

/** Money in the board's own units: 만원 on the Korean board, $10 on the American one. */
export const money = (lang: Lang, units: number) => inRegion(countryFor(lang), () => formatWealth(units), lang);

const ageOn = (lang: Lang, age: number) => (lang === "en" ? `${age}` : `${age}세`);

export function RecordGrid({ records, deathAge, lang }: { records: LifeRecords; deathAge: number; lang: Lang }) {
  const items: [string, string][] = [
    [tr(lang, "마지막 자산"), money(lang, records.finalWealth)],
    [tr(lang, "최고 자산"), money(lang, records.peakWealth)],
    [tr(lang, "평생 기부"), records.donated > 0 ? money(lang, records.donated) : "-"],
    [tr(lang, "수명"), ageOn(lang, deathAge)],
    [tr(lang, "평생 행복"), `${records.avgHappiness}`],
    [tr(lang, "가장 힘들 때 행복"), `${records.minHappiness}`],
  ];
  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-stone-100 px-3 py-2 dark:bg-stone-800/70">
            <dt className="text-[11px] font-medium text-stone-500 dark:text-stone-400">{label}</dt>
            <dd className="text-[15px] font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <BadgeRow ids={records.badges} lang={lang} />
    </div>
  );
}

/** The badges this life earned, as icons with their names for screen readers and on hover. */
export function BadgeRow({ ids, lang, max }: { ids: string[]; lang: Lang; max?: number }) {
  const known = ids.map((id) => badgeById(id)).filter((b): b is NonNullable<typeof b> => !!b);
  if (!known.length) return null;
  const shown = max ? known.slice(0, max) : known;
  const names = inRegion(countryFor(lang), () => shown.map((b) => b.name), lang);
  return (
    <p className="flex flex-wrap items-center gap-1 text-sm">
      <span className="mr-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
        {tr(lang, "배지")} {known.length}/{BADGES.length}
      </span>
      {shown.map((b, i) => (
        <span key={b.id} title={names[i]} role="img" aria-label={names[i]}>
          {b.icon}
        </span>
      ))}
      {max && known.length > max && <span className="text-xs text-stone-500 dark:text-stone-400">+{known.length - max}</span>}
    </p>
  );
}

/** One line for a list: wealth at the end, lifetime happiness and gifts, when the post has records. */
export function RecordLine({ records, lang }: { records?: LifeRecords; lang: Lang }) {
  if (!records) return null;
  const parts = [
    `${tr(lang, "자산")} ${money(lang, records.finalWealth)}`,
    `${tr(lang, "행복")} ${records.avgHappiness}`,
    records.donated > 0 ? `${tr(lang, "기부액")} ${money(lang, records.donated)}` : "",
  ].filter(Boolean);
  return <span className="mt-1 block text-xs font-medium text-indigo-700 tabular-nums dark:text-indigo-300">{parts.join(" · ")}</span>;
}
