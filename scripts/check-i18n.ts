// Lists the texts wrapped in L(...) / L`...` (written in Korean) with no English yet (src/locales/en.ts), and the
// texts wrapped in T(...) / T`...` (written in English, the American rules) with no Korean yet (src/locales/ko.ts),
// plus entries whose text no longer appears in the code. Run: npm run check:i18n [-- --dump missing.json]
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { EN, EN_NAMES } from "../src/locales/en";
import { KO, KO_NAMES } from "../src/locales/ko";
import { ERA } from "../src/lib/era";
import { FUTURE, NEWS } from "../src/lib/news";
import { US_ERA, US_FUTURE, US_NEWS } from "../src/regions/us/news";

const ROOT = path.join(__dirname, "..", "src");
const files: string[] = [];
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f.name) && !p.includes(`${path.sep}locales${path.sep}`)) files.push(p);
  }
};
walk(ROOT);

/** Every key the code asks for with L (or T), with the first place it is used. */
export function keysInCode(tag: "L" | "T" = "L"): Map<string, string> {
  const keys = new Map<string, string>();
  for (const file of files) {
    const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const add = (key: string, node: ts.Node) => {
      if (!keys.has(key)) keys.set(key, `${path.relative(ROOT, file)}:${src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1}`);
    };
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(src) === tag && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) add(node.arguments[0].text, node);
      if (ts.isTaggedTemplateExpression(node) && node.tag.getText(src) === tag) {
        const t = node.template;
        add(ts.isNoSubstitutionTemplateLiteral(t) ? t.text : t.head.text + t.templateSpans.map((s, i) => `{${i}}${s.literal.text}`).join(""), node);
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return keys;
}

// Values looked up as they are (a news category, a headline, a company or a title) rather than written in L or T.
function valuesInCode(): Set<string> {
  const out = new Set(["사회", "정치", "경제", "스포츠", "연예", "세계", "과학", "가상"]);
  for (const x of [...NEWS, ...US_NEWS, ...FUTURE, ...US_FUTURE]) out.add(x.text);
  for (const t of [...Object.values(ERA), ...Object.values(US_ERA)]) out.add(t);
  return out;
}

if (require.main === module) {
  const values = valuesInCode();
  const holes = (t: string) => (t.match(/\{\d+\}/g) ?? []).sort().join();
  let bad = 0;
  for (const [tag, dict, names, lang] of [["L", EN, EN_NAMES, "english"], ["T", KO, KO_NAMES, "korean"]] as const) {
    const keys = keysInCode(tag);
    for (const v of values) if (/[가-힣]/.test(v) === (tag === "L")) keys.set(v, "(value)");
    const missing = [...keys].filter(([k]) => dict[k] === undefined);
    const unused = Object.keys(dict).filter((k) => !keys.has(k) && names[k] === undefined);
    // Placeholders must match: a translation that drops {1} would lose a name or a number.
    const broken = [...keys.keys()].filter((k) => dict[k] !== undefined && holes(dict[k]) !== holes(k));
    console.log(`${tag}: texts ${keys.size}  ${lang} ${keys.size - missing.length}  missing ${missing.length}  unused ${unused.length}  placeholder mismatch ${broken.length}`);
    for (const k of broken.slice(0, 20)) console.log(`  placeholders differ: ${k}`);
    for (const k of unused.slice(0, 10)) console.log(`  unused: ${k.slice(0, 80)}`);
    const dump = process.argv.indexOf("--dump");
    if (dump >= 0) fs.writeFileSync(process.argv[dump + 1].replace(/(\.json)?$/, `-${tag}.json`), JSON.stringify(Object.fromEntries(missing.map(([k, at]) => [k, at])), null, 1));
    else for (const [k, at] of missing.slice(0, 10)) console.log(`  missing ${at}: ${k.slice(0, 80)}`);
    bad += broken.length;
  }
  if (bad) process.exitCode = 1;
}
