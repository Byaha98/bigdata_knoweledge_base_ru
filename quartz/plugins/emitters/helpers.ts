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
  // Пути в public — транслит + lowercase (GitHub Pages/Linux чувствителен к регистру)
  const slugPath = transliterateForPath(slug).toLowerCase()
  // GitHub Pages отдаёт index.html по запросу к /folder/ — файл должен быть folder/index.html, не folder/index/index.html
  const pathForHtml =
    ext === ".html" && slugPath !== "index"
      ? slugPath.endsWith("/index")
        ? (slugPath.replace(/\/index$/, "") + "/index.html") as FilePath
        : (joinSegments(slugPath, "index.html") as FilePath)
      : null
  const filePath = pathForHtml ?? (slugPath + ext) as FilePath
  const pathToPage = joinSegments(ctx.argv.output, filePath) as FilePath
  const dir = path.dirname(pathToPage)
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(pathToPage, content)
  return pathToPage
}
