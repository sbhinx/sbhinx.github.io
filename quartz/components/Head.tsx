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

        <script src={joinSegments(baseDir, "static/mermaid.min.js")} type="text/javascript" data-persist="true"></script>
        <script data-persist="true" dangerouslySetInnerHTML={{
          __html: `
            let mermaidRenderIdCounter = 0;
            async function renderAllMermaid() {
              if (!window.mermaid) return;
              const isDark = document.documentElement.getAttribute("saved-theme") === "dark";
              try {
                window.mermaid.initialize({
                  startOnLoad: false,
                  securityLevel: "loose",
                  theme: isDark ? "dark" : "default"
                });
              } catch (e) {}

              const targets = document.querySelectorAll('pre:has(> code[data-language="mermaid"]), pre:has(> code.mermaid)');
              for (const pre of targets) {
                const codeEl = pre.querySelector('code');
                if (!codeEl) continue;

                if (!pre.dataset.mermaidRaw) {
                  let raw = codeEl.innerText || codeEl.textContent;
                  raw = raw.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').trim();
                  pre.dataset.mermaidRaw = raw;
                }

                let container = pre.nextElementSibling;
                if (!container || !container.classList.contains('mermaid-diagram-container')) {
                  container = document.createElement('div');
                  container.className = 'mermaid-diagram-container';
                  container.style.display = 'flex';
                  container.style.justifyContent = 'center';
                  container.style.margin = '1.5rem 0';
                  container.style.overflowX = 'auto';
                  pre.parentNode.insertBefore(container, pre.nextSibling);
                }

                try {
                  const id = 'mermaid-svg-' + Date.now() + '-' + (++mermaidRenderIdCounter);
                  const { svg } = await window.mermaid.render(id, pre.dataset.mermaidRaw);
                  container.innerHTML = svg;
                  pre.style.display = 'none';
                } catch (err) {
                  console.error("Mermaid diagram render error:", err);
                }
              }
            }

            function triggerMermaid() {
              if (window.mermaid) {
                renderAllMermaid();
              } else {
                let attempts = 0;
                const interval = setInterval(() => {
                  attempts++;
                  if (window.mermaid) {
                    clearInterval(interval);
                    renderAllMermaid();
                  } else if (attempts > 60) {
                    clearInterval(interval);
                  }
                }, 100);
              }
            }

            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", triggerMermaid);
            } else {
              triggerMermaid();
            }
            window.addEventListener("load", triggerMermaid);
            document.addEventListener("nav", triggerMermaid);
            document.addEventListener("render", triggerMermaid);
            document.addEventListener("themechange", triggerMermaid);
          `
        }} />

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
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
