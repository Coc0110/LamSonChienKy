// Resolver cho test Node: tự thêm đuôi .ts/.tsx cho import không có phần mở rộng.
import { register } from 'node:module';
register('./tsResolveHooks.mjs', import.meta.url);
