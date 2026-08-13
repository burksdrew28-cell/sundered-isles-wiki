import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"

export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const title =
      (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    // Url of current page
    const socialUrl =
      fileData.slug === "404" ? url.toString() : joinSegments(url.toString(), fileData.slug!)

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some((e) => e.name === "CustomOgImages")
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`

    const coreStylesheet = css[0]?.content
    const coreScript = js.find(
      (r) => r.loadTime === "beforeDOMReady" && r.contentType === "external",
    )

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {coreStylesheet && <link rel="preload" href={coreStylesheet} as="style" />}
        {coreScript && coreScript.contentType === "external" && (
          <link rel="preload" href={coreScript.src} as="script" />
        )}
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <meta name="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`}
            />
          </>
        )}

        {cfg.baseUrl && (
          <>
            <meta property="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={socialUrl}></meta>
            <meta property="twitter:url" content={socialUrl}></meta>
          </>
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Keep the Explorer focused on the current page's folder path.
              localStorage.removeItem("fileTree")
              document.addEventListener("prenav", () => localStorage.removeItem("fileTree"))
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                if (window.__sunderedIslesMapViewer) return
                window.__sunderedIslesMapViewer = true

                const mapSelector = 'body[data-slug="index"] article img[src*="TheSunderedIslesMap"]'
                let viewer

                const closeViewer = () => {
                  if (!viewer) return
                  viewer.remove()
                  viewer = undefined
                  document.body.style.overflow = ""
                }

                const openViewer = (source) => {
                  closeViewer()
                  let scale = 1
                  let x = 0
                  let y = 0
                  let pointerId
                  let startX = 0
                  let startY = 0

                  viewer = document.createElement("div")
                  viewer.className = "si-map-viewer"
                  viewer.setAttribute("role", "dialog")
                  viewer.setAttribute("aria-modal", "true")
                  viewer.setAttribute("aria-label", "Map viewer")
                  viewer.innerHTML = \
                    '<div class="si-map-viewer__canvas"><img class="si-map-viewer__image" alt="" /></div>' +
                    '<div class="si-map-viewer__controls">' +
                    '<button type="button" data-map-action="zoom-out" aria-label="Zoom out">−</button>' +
                    '<button type="button" data-map-action="reset" aria-label="Reset map view">Reset</button>' +
                    '<button type="button" data-map-action="zoom-in" aria-label="Zoom in">+</button>' +
                    '<button type="button" data-map-action="close" aria-label="Close map viewer">×</button>' +
                    '</div>'

                  const canvas = viewer.querySelector(".si-map-viewer__canvas")
                  const image = viewer.querySelector(".si-map-viewer__image")
                  image.src = source.currentSrc || source.src
                  image.alt = source.alt || "Map of the Sundered Isles"

                  const render = () => {
                    image.style.transform = \`translate(\${x}px, \${y}px) scale(\${scale})\`
                  }
                  const zoom = (amount) => {
                    scale = Math.min(4, Math.max(1, scale + amount))
                    if (scale === 1) { x = 0; y = 0 }
                    render()
                  }

                  canvas.addEventListener("wheel", (event) => {
                    event.preventDefault()
                    zoom(event.deltaY < 0 ? 0.2 : -0.2)
                  }, { passive: false })
                  canvas.addEventListener("pointerdown", (event) => {
                    if (scale === 1) return
                    pointerId = event.pointerId
                    startX = event.clientX - x
                    startY = event.clientY - y
                    canvas.setPointerCapture(pointerId)
                    canvas.classList.add("is-panning")
                  })
                  canvas.addEventListener("pointermove", (event) => {
                    if (event.pointerId !== pointerId) return
                    x = event.clientX - startX
                    y = event.clientY - startY
                    render()
                  })
                  const stopPanning = (event) => {
                    if (event.pointerId !== pointerId) return
                    pointerId = undefined
                    canvas.classList.remove("is-panning")
                  }
                  canvas.addEventListener("pointerup", stopPanning)
                  canvas.addEventListener("pointercancel", stopPanning)
                  viewer.addEventListener("click", (event) => {
                    const action = event.target.closest("[data-map-action]")?.dataset.mapAction
                    if (action === "zoom-in") zoom(0.2)
                    if (action === "zoom-out") zoom(-0.2)
                    if (action === "reset") { scale = 1; x = 0; y = 0; render() }
                    if (action === "close" || event.target === viewer) closeViewer()
                  })

                  document.body.append(viewer)
                  document.body.style.overflow = "hidden"
                  render()
                }

                const wireMap = () => {
                  document.querySelectorAll(mapSelector).forEach((map) => {
                    if (map.dataset.mapViewerReady === "true") return
                    map.dataset.mapViewerReady = "true"
                    map.setAttribute("role", "button")
                    map.setAttribute("tabindex", "0")
                    map.setAttribute("aria-label", "Open interactive map viewer")
                    map.addEventListener("click", (event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openViewer(map)
                    })
                    map.addEventListener("keydown", (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openViewer(map)
                      }
                    })
                  })
                }

                document.addEventListener("DOMContentLoaded", wireMap)
                document.addEventListener("nav", wireMap)
                document.addEventListener("render", wireMap)
                document.addEventListener("keydown", (event) => {
                  if (event.key === "Escape") closeViewer()
                })
                document.addEventListener("prenav", closeViewer)
              })()
            `,
          }}
        />
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
