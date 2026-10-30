// Lists the texts wrapped in L(...) or L`...` that have no English yet (src/locales/en.ts), and English entries
// whose Korean no longer appears in the code. Run: npm run check:i18n [-- --dump missing.json]
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { EN } from "../src/locales/en";

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

/** Every key the code asks for, with the first place it is used. */
export function keysInCode(): Map<string, string> {
  const keys = new Map<string, string>();
  for (const file of files) {
    const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const add = (key: string, node: ts.Node) => {
      if (!keys.has(key)) keys.set(key, `${path.relative(ROOT, file)}:${src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1}`);
    };
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(src) === "L" && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) add(node.arguments[0].text, node);
      if (ts.isTaggedTemplateExpression(node) && node.tag.getText(src) === "L") {
        const t = node.template;
        add(ts.isNoSubstitutionTemplateLiteral(t) ? t.text : t.head.text + t.templateSpans.map((s, i) => `{${i}}${s.literal.text}`).join(""), node);
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return keys;
}

if (require.main === module) {
  const keys = keysInCode();
  const missing = [...keys].filter(([k]) => EN[k] === undefined);
  const unused = Object.keys(EN).filter((k) => !keys.has(k));
  // Placeholders must match: an English text that drops {1} would lose a name or a number.
  const holes = (t: string) => (t.match(/\{\d+\}/g) ?? []).sort().join();
  const broken = [...keys.keys()].filter((k) => EN[k] !== undefined && holes(EN[k]) !== holes(k));
  console.log(`texts ${keys.size}  english ${keys.size - missing.length}  missing ${missing.length}  unused ${unused.length}  placeholder mismatch ${broken.length}`);
  for (const k of broken.slice(0, 20)) console.log(`  placeholders differ: ${k}`);
  const dump = process.argv.indexOf("--dump");
  if (dump >= 0) fs.writeFileSync(process.argv[dump + 1], JSON.stringify(Object.fromEntries(missing.map(([k, at]) => [k, at])), null, 1));
  else for (const [k, at] of missing.slice(0, 10)) console.log(`  missing ${at}: ${k.slice(0, 80)}`);
  if (broken.length) process.exitCode = 1;
}
