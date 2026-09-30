/** The learner's local state, kept current as any island saves it ('atlas:learner'). */
import { useEffect, useState } from 'preact/hooks';
import { loadLearner, type Learner } from './learner';

export function useLearner(): Learner {
  const [learner, setLearner] = useState<Learner>({ terms: {} });
  useEffect(() => {
    const refresh = () => setLearner(loadLearner());
    refresh();
    window.addEventListener('atlas:learner', refresh);
    return () => window.removeEventListener('atlas:learner', refresh);
  }, []);
  return learner;
}
