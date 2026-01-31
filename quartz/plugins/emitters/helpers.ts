import path from "path"
import fs from "fs"
import { BuildCtx } from "../../util/ctx"
import { FilePath, FullSlug, joinSegments, transliterateForPath } from "../../util/path"
import { Readable } from "stream"

type WriteOptions = {
  ctx: BuildCtx
  slug: FullSlug
  ext: `.${string}` | ""
  content: string | Buffer | Readable
}

export const write = async ({ ctx, slug, ext, content }: WriteOptions): Promise<FilePath> => {
  const slugPath = transliterateForPath(slug)
  // GitHub Pages и др. отдают index.html по запросу к папке — эмитим slug/index.html для чистых URL
  const filePath =
    ext === ".html" && slugPath !== "index"
      ? (joinSegments(slugPath, "index.html") as FilePath)
      : (slugPath + ext) as FilePath
  const pathToPage = joinSegments(ctx.argv.output, filePath) as FilePath
  const dir = path.dirname(pathToPage)
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(pathToPage, content)
  return pathToPage
}
