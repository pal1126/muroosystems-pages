import {normalize} from './search-engine.js';

const graphemes = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja') : null;

function sourceMap(text) {
  const offsets = [];
  let folded = '';
  function append(part, start) {
    // Search terms contain no whitespace. Keep word boundaries between segments.
    const value = /^\s+$/u.test(part) ? ' ' : normalize(part);
    folded += value;
    for (let i = 0; i < value.length; i++) offsets.push([start, start + part.length]);
  }
  if (graphemes) {
    for (const {segment, index} of graphemes.segment(text)) append(segment, index);
  } else {
    let start = 0;
    for (const char of text) { append(char, start); start += char.length; }
  }
  return {folded, offsets};
}

export function excerpt(row, terms) {
  const visible = normalize(row.title + ' ' + row.description);
  const missing = terms.filter(term => !visible.includes(term));
  if (!missing.length || !row.body) return row.description;
  const body = normalize(row.body);
  if (!missing.some(term => body.includes(term))) return row.description;
  const {folded, offsets} = sourceMap(row.body);
  const positions = missing.map(term => folded.indexOf(term)).filter(i => i >= 0);
  if (!positions.length) return row.description;
  const hit = Math.min(...positions);
  const start = offsets[Math.max(0, hit - 35)][0];
  const end = offsets[Math.min(offsets.length - 1, hit + 114)][1];
  return (start ? '…' : '') + row.body.slice(start, end) + (end < row.body.length ? '…' : '');
}

export function highlight(node, pattern) {
  if (!pattern) return;
  const original = node.textContent;
  const {folded, offsets} = sourceMap(original);
  const parts = document.createDocumentFragment();
  let cursor = 0;
  for (const match of folded.matchAll(pattern)) {
    const start = offsets[match.index][0];
    const end = offsets[match.index + match[0].length - 1][1];
    if (start < cursor) continue;
    const mark = document.createElement('mark');
    mark.textContent = original.slice(start, end);
    parts.append(original.slice(cursor, start), mark);
    cursor = end;
  }
  if (cursor) {
    parts.append(original.slice(cursor));
    node.replaceChildren(parts);
  }
}
