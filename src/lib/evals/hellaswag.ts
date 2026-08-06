/**
 * Back-compat wrapper around the shared MCQ mini-eval runner.
 */
import { mountMcqEval } from './mcqEval';

export function mountHellaSwagEval(root: HTMLElement): void {
	mountMcqEval(root, {
		benchmarkId: 'hellaswag',
		packUrl: '/evals/hellaswag/pack.json',
		keyUrl: '/evals/hellaswag/key.json',
		hubHref: '/evals/hellaswag/',
		boardColumn: 'hellaswag',
	});
}
