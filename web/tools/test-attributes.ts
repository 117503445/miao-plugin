/** 通过同生产构建一致的Vite别名运行发布代码的属性计算测试。 */
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const web=fileURLToPath(new URL("..",import.meta.url));
const server=await createServer({root:web,configFile:false,resolve:{dedupe:["lodash"],alias:[{find:"#miao.models",replacement:web+"/src/upstream-models.ts"},{find:"#miao",replacement:web+"/src/upstream-bridge.ts"}]},ssr:{external:["lodash"]},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,watch:null},appType:"custom",logLevel:"error"});
try {
 const tests=await server.ssrLoadModule("/src/attributes.test.ts"); tests.runAttributeTests();
 const summary=await server.ssrLoadModule("/src/summary.test.ts"); summary.runSummaryTests();
} finally {await server.close()}
