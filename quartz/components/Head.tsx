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
              // Keep every Explorer folder expanded on every page.
              localStorage.removeItem("fileTree")
              document.addEventListener("prenav", () => localStorage.removeItem("fileTree"))

              // The content lives under a Home folder. Present that root as a normal
              // homepage link while leaving all of its numbered folders visible.
              const wireExplorerHome = () => {
                document.querySelectorAll(".explorer").forEach((explorer) => {
                  if (explorer.dataset.homeLinkReady === "true") return

                  const buttons = [...explorer.querySelectorAll(".folder-button")]
                  const homeButton = buttons.find((button) => button.textContent?.trim() === "Home")
                  if (!homeButton) return

                  const folderContainer = homeButton.closest(".folder-container")
                  const homeLink = document.createElement("a")
                  homeLink.className = "explorer-link si-explorer-home"
                  const siteTitleLink = document.querySelector("a.page-title, .page-title a")
                  homeLink.href = siteTitleLink?.href || new URL("/", document.baseURI).href
                  homeLink.textContent = "Home"
                  homeLink.setAttribute("data-for", "index")
                  folderContainer?.replaceWith(homeLink)

                  const folderOuter = homeLink.nextElementSibling
                  folderOuter?.classList.add("open", "si-explorer-home-children")
                  if (folderOuter instanceof HTMLElement) folderOuter.style.display = "grid"
                  explorer.dataset.homeLinkReady = "true"
                })
              }

              document.addEventListener("DOMContentLoaded", wireExplorerHome)
              document.addEventListener("nav", wireExplorerHome)
              document.addEventListener("render", wireExplorerHome)
              new MutationObserver(wireExplorerHome).observe(document.documentElement, {
                childList: true,
                subtree: true,
              })
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                if (window.__sunderedIslesMapViewer) return
                window.__sunderedIslesMapViewer = true

                // Quartz normalizes attachment filenames during its build, so the homepage
                // map is identified by its stable content position rather than its source URL.
                const mapSelector = 'body[data-slug="index"] article img'
                const continentHotspots = [
                  { name: "Eladrion", path: "home/02-places/continents--and--regions/eladrion", x: 27, y: 24, w: 25, h: 8 },
                  { name: "Cindakar", path: "home/02-places/continents--and--regions/cindakar", x: 69, y: 14, w: 18, h: 8 },
                  { name: "Ionrveil", path: "home/02-places/continents--and--regions/ionrveil", x: 67, y: 38, w: 20, h: 9 },
                  { name: "Astra Veyra", path: "home/02-places/continents--and--regions/astra-veyra", x: 47, y: 50, w: 21, h: 8 },
                  { name: "Velora", path: "home/02-places/continents--and--regions/velora", x: 17, y: 59, w: 18, h: 8 },
                  { name: "Ilyara", path: "home/02-places/continents--and--regions/ilyara", x: 44, y: 82, w: 18, h: 9 },
                  { name: "Kharos", path: "home/02-places/continents--and--regions/kharos", x: 75, y: 66, w: 18, h: 10 },
                ]
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
                  const pointers = new Map()
                  let panStart
                  let pinchStart

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
                  const setZoom = (nextScale, centerX, centerY) => {
                    const previousScale = scale
                    scale = Math.min(5, Math.max(1, nextScale))
                    if (centerX !== undefined && centerY !== undefined && previousScale !== scale) {
                      const rect = canvas.getBoundingClientRect()
                      const pointX = centerX - rect.left - rect.width / 2
                      const pointY = centerY - rect.top - rect.height / 2
                      const ratio = scale / previousScale
                      x = pointX - (pointX - x) * ratio
                      y = pointY - (pointY - y) * ratio
                    }
                    if (scale === 1) { x = 0; y = 0 }
                    render()
                  }
                  const zoom = (amount) => setZoom(scale + amount)

                  canvas.addEventListener("wheel", (event) => {
                    event.preventDefault()
                    zoom(event.deltaY < 0 ? 0.2 : -0.2)
                  }, { passive: false })
                  canvas.addEventListener("pointerdown", (event) => {
                    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
                    canvas.setPointerCapture(event.pointerId)
                    canvas.classList.add("is-panning")
                    if (pointers.size === 1) {
                      panStart = { pointerX: event.clientX, pointerY: event.clientY, x, y }
                    } else if (pointers.size === 2) {
                      const [a, b] = [...pointers.values()]
                      pinchStart = {
                        distance: Math.hypot(b.x - a.x, b.y - a.y),
                        scale,
                        centerX: (a.x + b.x) / 2,
                        centerY: (a.y + b.y) / 2,
                      }
                    }
                  })
                  canvas.addEventListener("pointermove", (event) => {
                    if (!pointers.has(event.pointerId)) return
                    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
                    if (pointers.size === 2 && pinchStart) {
                      const [a, b] = [...pointers.values()]
                      const distance = Math.hypot(b.x - a.x, b.y - a.y)
                      const centerX = (a.x + b.x) / 2
                      const centerY = (a.y + b.y) / 2
                      setZoom(pinchStart.scale * distance / Math.max(1, pinchStart.distance), centerX, centerY)
                      x += centerX - pinchStart.centerX
                      y += centerY - pinchStart.centerY
                      pinchStart.centerX = centerX
                      pinchStart.centerY = centerY
                      render()
                    } else if (pointers.size === 1 && panStart && scale > 1) {
                      x = panStart.x + event.clientX - panStart.pointerX
                      y = panStart.y + event.clientY - panStart.pointerY
                      render()
                    }
                  })
                  const stopPanning = (event) => {
                    pointers.delete(event.pointerId)
                    pinchStart = undefined
                    if (pointers.size === 1) {
                      const point = [...pointers.values()][0]
                      panStart = { pointerX: point.x, pointerY: point.y, x, y }
                    } else {
                      panStart = undefined
                      canvas.classList.remove("is-panning")
                    }
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

                const addContinentHotspots = (map) => {
                  if (map.parentElement?.classList.contains("si-map-frame")) return
                  const frame = document.createElement("span")
                  frame.className = "si-map-frame"
                  map.parentElement?.insertBefore(frame, map)
                  frame.append(map)

                  continentHotspots.forEach((continent) => {
                    const hotspot = document.createElement("a")
                    hotspot.className = "si-map-hotspot"
                    hotspot.href = new URL(continent.path, document.baseURI).pathname
                    hotspot.setAttribute("aria-label", "Open " + continent.name)
                    hotspot.title = continent.name
                    hotspot.style.left = continent.x + "%"
                    hotspot.style.top = continent.y + "%"
                    hotspot.style.width = continent.w + "%"
                    hotspot.style.height = continent.h + "%"
                    hotspot.addEventListener("click", (event) => event.stopPropagation())
                    frame.append(hotspot)
                  })
                }

                const wireMap = () => {
                  document.querySelectorAll(mapSelector).forEach((map) => {
                    if (map.dataset.mapViewerReady === "true") return
                    addContinentHotspots(map)
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
