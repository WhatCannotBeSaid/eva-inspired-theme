// Narrow, repository-specific formatting transforms, NOT a general JS minifier.
// Own inputs forbid templates; selfcheck independently compares tokens AND lines.
// Vendors keep comments and only normalize layout. Do not broaden accepted syntax
// without independent equivalence fixtures (especially multiline literals/ASI).
export const stripBlockComments = text => text.replace(/\/\*[\s\S]*?\*\//g, comment => {
  const newlines = comment.match(/\n/g)
  return newlines === null ? ' ' : newlines.join('')
})
export const normaliseJs = text => text.replace(/\r\n?/g, '\n').replace(/^[ \t]+/gm, '')
export const compressJs = text => normaliseJs(stripBlockComments(text))
const QUOTED = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^'"]+/g
export const minifyCss = text => (text.match(QUOTED) || [])
  .map(piece => (piece.charAt(0) === "'" || piece.charAt(0) === '"')
    ? piece : piece.replace(/\s+/g, ' ').replace(/ ?([{};]) ?/g, '$1')).join('')
