/** Clone stylesheets from the main document to a detached window */

export function cloneStylesheets(source: Document, target: Document): void {
  // Copy <link> stylesheets
  const links = source.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(link => {
    const clone = target.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = (link as HTMLLinkElement).href;
    target.head.appendChild(clone);
  });

  // Copy <style> elements
  const styles = source.querySelectorAll('style');
  styles.forEach(style => {
    const clone = target.createElement('style');
    clone.textContent = style.textContent;
    target.head.appendChild(clone);
  });

  // Copy inline style sheets that might be injected by webpack
  for (let i = 0; i < source.styleSheets.length; i++) {
    const sheet = source.styleSheets[i];
    if (!sheet.href && sheet.ownerNode?.nodeName === 'STYLE') {
      // Already copied above via querySelectorAll('style')
      continue;
    }
    try {
      // Try to access cssRules (may fail for cross-origin sheets)
      if (sheet.cssRules) {
        let cssText = '';
        for (let j = 0; j < sheet.cssRules.length; j++) {
          cssText += sheet.cssRules[j].cssText + '\n';
        }
        if (cssText && !sheet.href) {
          const styleEl = target.createElement('style');
          styleEl.textContent = cssText;
          target.head.appendChild(styleEl);
        }
      }
    } catch {
      // Cross-origin stylesheet — skip
    }
  }

  // Copy body data attributes for theme detection
  const bodyAttrs = source.body.attributes;
  for (let i = 0; i < bodyAttrs.length; i++) {
    const attr = bodyAttrs[i];
    if (attr.name.startsWith('data-jp-')) {
      target.body.setAttribute(attr.name, attr.value);
    }
  }
}
