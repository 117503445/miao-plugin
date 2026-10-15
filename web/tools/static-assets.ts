/** 为原版样式、字体和背景建立稳定内容版本，便于浏览器长期缓存。 */
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { createHash } from "node:crypto";

/** 递归列出directory中的真实文件，忽略目录本身。 */
async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) result.push(...(await files(path)));
    else if (item.isFile()) result.push(path);
  }
  return result;
}

/** 将resources内原版资源发布到output的内容版本目录，返回公共URL前缀。 */
export async function copyVersionedAssets(
  resources: string,
  output: string,
): Promise<string> {
  const paths = [
    ...(await files(join(resources, "common"))),
    ...(await files(join(resources, "character/imgs"))),
    ...(await files(join(resources, "meta-sr/public"))),
    join(resources, "character/profile-detail.css"),
    join(resources, "character/artis-mark.css"),
  ].sort();
  const content = await Promise.all(
    paths.map(async (path) => ({
      path: relative(resources, path),
      raw: await readFile(path),
    })),
  );
  const hash = createHash("sha256");
  for (const file of content)
    hash.update(file.path).update("\0").update(file.raw);
  const prefix = "/miao/" + hash.digest("hex").slice(0, 16);
  for (const file of content) {
    const target = join(output, prefix, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.raw);
  }
  // 清除先前构建的无版本副本，只清理本工具生成的目录。
  for (const name of ["common", "character", "meta-sr"])
    await rm(join(output, name), { recursive: true, force: true });
  return prefix;
}
