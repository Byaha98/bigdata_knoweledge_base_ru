import path from "path"
import fs from "fs"
import { BuildCtx } from "../../util/ctx"
import { FilePath, FullSlug, joinSegments } from "../../util/path"
import { Readable } from "stream"

type WriteOptions = {
  ctx: BuildCtx
  slug: FullSlug
  ext: `.${string}` | ""
  content: string | Buffer | Readable
}

export const write = async ({ ctx, slug, ext, content }: WriteOptions): Promise<FilePath> => {
  // GitHub Pages и др. хостинги отдают index.html по запросу к папке — эмитим slug/index.html для чистых URL
  const filePath =
    ext === ".html" && slug !== "index"
      ? (joinSegments(slug, "index.html") as FilePath)
      : (slug + ext) as FilePath
  const pathToPage = joinSegments(ctx.argv.output, filePath) as FilePath
  const dir = path.dirname(pathToPage)
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(pathToPage, content)
  return pathToPage
}
