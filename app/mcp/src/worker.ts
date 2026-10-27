// Wrangler aliases atlas:data to the JSON bundle-data writes from the site build, so only
// this entry needs the build; tests pass createWorker a fixture instead.
import bundle from 'atlas:data';
import { createWorker } from './worker-app';

export default createWorker(bundle);
