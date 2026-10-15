/** 直接执行原版评分代码，输出桑多涅羽毛词条贡献并核查两账号评分完整性。 */
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Snapshot } from '../src/types';
const web = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({root:web,configFile:false,resolve:{dedupe:['lodash'],alias:[{find:'#miao.models',replacement:web+'/src/upstream-models.ts'},{find:'#miao',replacement:web+'/src/upstream-bridge.ts'}]},ssr:{external:['lodash']},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'});
try {
 const {scoreCard}=await server.ssrLoadModule('/src/scoring.ts');
 const snapshot:Snapshot=JSON.parse(await readFile(web+'/public/accounts.json','utf8'));
 const cards=snapshot.accounts.flatMap(a=>a.characters).map(c=>scoreCard(c,true));
 const card=cards.find(c=>c.key==='gs-Sandrone');
 const feather=card.artifacts.find(a=>a.idx===2);
 console.log(JSON.stringify({character:card.name,rule:card.rule,weights:card.weights,score:card.score,feather,nativeFeather:card.native.detail.artis[2],invalid:cards.filter(c=>!Number.isFinite(c.score)||c.artifacts.some(a=>!Number.isFinite(a.score))).map(c=>c.key)},null,2));
} finally {await server.close()}
