export function resolveRenderFlag(render?: boolean, renderMarkdown?: boolean): boolean {
  return Boolean(renderMarkdown || render);
}
