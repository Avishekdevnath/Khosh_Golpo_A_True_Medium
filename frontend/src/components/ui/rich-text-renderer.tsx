// frontend/src/components/ui/rich-text-renderer.tsx
// Standardised wrapper around the shared RichText component.
"use client"

import RichText from "@/components/shared/RichText"

export interface RichTextRendererProps {
  content: string
  /** "full" renders headings and full prose; "compact" flattens headings to <p> */
  variant?: "full" | "compact"
  className?: string
}

/**
 * RichTextRenderer — thin ui-layer wrapper over the shared RichText component.
 *
 * Renders markdown content with:
 *   - GFM (tables, strikethrough, task lists)
 *   - rehype-sanitize (safe HTML, http/https links only)
 *   - @mention highlighting
 *   - "full" vs "compact" variant control
 */
function RichTextRenderer({ content, variant = "full", className }: RichTextRendererProps) {
  return <RichText content={content} variant={variant} className={className} />
}

export { RichTextRenderer }
