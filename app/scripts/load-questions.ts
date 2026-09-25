/** Load and validate every hand-written question file (A83). Shared by lint and tests. */
import fg from 'fast-glob';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { QuestionFile } from '../src/schema';
import type { BankQuestion } from '../src/lib/question-rules';

export function loadQuestions(root = 'src/content/questions') {
  const questions: BankQuestion[] = [];
  const errors: string[] = [];
  for (const path of fg.sync(`${root}/**/*.yaml`)) {
    const file = path.slice(root.length + 1).replace(/\.yaml$/, '');
    const res = QuestionFile.safeParse(parse(readFileSync(path, 'utf8')) ?? {});
    if (!res.success) {
      const issues = res.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
      errors.push(`Q1 ${file}: ${issues}`);
      continue;
    }
    for (const q of res.data.questions) questions.push({ ...q, file });
  }
  return { questions, errors };
}
