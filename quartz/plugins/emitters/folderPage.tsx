import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { VFile } from "vfile"
import { ProcessedContent, QuartzPluginData, defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import path from "path"
import {
  FilePath,
  FullSlug,
  SimpleSlug,
  stripSlashes,
  joinSegments,
  pathToRoot,
  simplifySlug,
  transliterateForPath,
  slugifyFilePath,
} from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { FolderContent } from "../../components"
import { write } from "./helpers"
import type { TRANSLATIONS } from "../../i18n"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"
interface FolderPageOptions extends FullPageLayout {
  sort?: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

async function* processFolderInfo(
  ctx: BuildCtx,
  folderInfo: Record<SimpleSlug, ProcessedContent>,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  for (const [folder, folderContent] of Object.entries(folderInfo) as [
    SimpleSlug,
    ProcessedContent,
  ][]) {
    const slug = joinSegments(folder, "index") as FullSlug
    const slugPath = transliterateForPath(slug) as FullSlug
    const [tree, file] = folderContent
    const cfg = ctx.cfg.configuration
    const externalResources = pageResources(pathToRoot(slugPath), resources)
    const componentData: QuartzComponentProps = {
      ctx,
      fileData: file.data,
      externalResources,
      cfg,
      children: [],
      tree,
      allFiles,
    }

    const content = renderPage(cfg, slugPath, componentData, opts, externalResources)
    // Пишем в folder/index.html (не folder/index/index.html), чтобы Linux/GitHub Pages отдавал по /folder/
    yield write({
      ctx,
      content,
      slug: folder as unknown as FullSlug,
      ext: ".html",
    })
  }
}

function computeFolderInfo(
  folders: Set<SimpleSlug>,
  content: ProcessedContent[],
  _locale: keyof typeof TRANSLATIONS,
): Record<SimpleSlug, ProcessedContent> {
  // Create default folder descriptions
  const folderInfo: Record<SimpleSlug, ProcessedContent> = Object.fromEntries(
    [...folders].map((folder) => [
      folder,
      defaultProcessedContent({
        slug: joinSegments(folder, "index") as FullSlug,
        frontmatter: {
          title: "Содержимое папки",
          tags: [],
        },
      }),
    ]),
  )

  // Контент из index.md используем (tree, description), но title на страницу не пускаем — всегда «Содержимое папки»
  const folderPageTitle = "Содержимое папки"
  for (const [tree, file] of content) {
    const slug = stripSlashes(simplifySlug(file.data.slug!)) as SimpleSlug
    if (folders.has(slug)) {
      const vfile = new VFile("")
      vfile.data = {
        ...file.data,
        frontmatter: { ...file.data.frontmatter, title: folderPageTitle },
      }
      folderInfo[slug] = [tree, vfile]
    }
  }

  return folderInfo
}

function _getFolders(slug: FullSlug): SimpleSlug[] {
  // path.posix — всегда "/", иначе на Windows path.dirname может дать другие разделители
  const dirname = path.posix.dirname
  var folderName = dirname(slug ?? "") as SimpleSlug
  const parentFolderNames = [folderName]

  while (folderName !== ".") {
    folderName = dirname(folderName ?? "") as SimpleSlug
    parentFolderNames.push(folderName)
  }
  return parentFolderNames
}

/** Все директории из списка файлов (относительные пути) → slug папки в том же формате, что и у контента. */
function getAllFolderSlugsFromPaths(filePaths: FilePath[]): Set<SimpleSlug> {
  const dirname = path.posix.dirname
  const folderSlugs = new Set<SimpleSlug>()
  for (const fp of filePaths) {
    let p = dirname(fp)
    while (p && p !== ".") {
      // Приводим путь папки к slug-формату (транслит + slugify), как у file.data.slug
      const slugWithIndex = transliterateForPath(
        slugifyFilePath(joinSegments(p, "index.md") as FilePath),
      ) as FullSlug
      const folderSlug = simplifySlug(slugWithIndex) as SimpleSlug
      folderSlugs.add(folderSlug)
      p = dirname(p)
    }
  }
  return folderSlugs
}

export const FolderPage: QuartzEmitterPlugin<Partial<FolderPageOptions>> = (userOpts) => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: FolderContent({ sort: userOpts?.sort }),
    ...userOpts,
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "FolderPage",
    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
      ]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)
      const cfg = ctx.cfg.configuration

      // Папки из обработанного контента (как раньше)
      const foldersFromContent = new Set<SimpleSlug>(
        allFiles.flatMap((data) => {
          return data.slug
            ? _getFolders(data.slug).filter(
                (folderName) => folderName !== "." && folderName !== "tags",
              )
            : []
        }),
      )

      // Все папки по файловой системе (ctx.allFiles = все файлы в content, не только .md),
      // чтобы index.html создавался для каждой директории и не было 404 при переходе «назад»
      const foldersFromFs =
        ctx.allFiles?.length > 0
          ? getAllFolderSlugsFromPaths(ctx.allFiles as FilePath[])
          : new Set<SimpleSlug>()

      const folders: Set<SimpleSlug> = new Set([
        ...foldersFromContent,
        ...foldersFromFs,
      ].filter((f) => f !== "." && f !== "tags" && f !== "/"))

      const folderInfo = computeFolderInfo(folders, content, cfg.locale)
      yield* processFolderInfo(ctx, folderInfo, allFiles, opts, resources)
    },
    async *partialEmit(ctx, content, resources, changeEvents) {
      const allFiles = content.map((c) => c[1].data)
      const cfg = ctx.cfg.configuration

      // Find all folders that need to be updated based on changed files
      const affectedFolders: Set<SimpleSlug> = new Set()
      for (const changeEvent of changeEvents) {
        if (!changeEvent.file) continue
        const slug = changeEvent.file.data.slug!
        const folders = _getFolders(slug).filter(
          (folderName) => folderName !== "." && folderName !== "tags",
        )
        folders.forEach((folder) => affectedFolders.add(folder))
      }

      // If there are affected folders, rebuild their pages
      if (affectedFolders.size > 0) {
        const folderInfo = computeFolderInfo(affectedFolders, content, cfg.locale)
        yield* processFolderInfo(ctx, folderInfo, allFiles, opts, resources)
      }
    },
  }
}
