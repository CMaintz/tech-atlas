import { createLintContext } from './lint-context';
import { checkEdges, checkRequiresCycles } from './lint-graph';
import { checkArticleFiles, checkForbiddenDashes, checkHowTos, checkNames } from './lint-terms';
import { checkDefinitions, checkSemanticVectors, checkVocabulary } from './lint-prose';
import { checkQuestionBank, printReport } from './lint-report';

const ctx = createLintContext();
const neighbours = checkEdges(ctx);
checkRequiresCycles(ctx);
checkNames(ctx);
checkArticleFiles(ctx);
checkForbiddenDashes(ctx);
const howTo = checkHowTos(ctx);
checkDefinitions(ctx, neighbours);
checkVocabulary(ctx);
checkSemanticVectors(ctx);
const questions = checkQuestionBank(ctx);
printReport(ctx, howTo, questions);
if (ctx.errors.length) process.exit(1);
