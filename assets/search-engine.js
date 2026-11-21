// Shared by the browser and focused search relevance checks.
export const normalize = value => String(value || '').normalize('NFKC').toLowerCase()
  .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
  .replace(/[‐‑‒–—−]/g, '-').replace(/\s+/g, ' ').trim();
const compact = value => normalize(value).replace(/[\s\-・_]/g, '');
export function prepareIndex(rows) {
  return rows.map(row => ({...row, fields: [row.title, row.aliases, row.description, row.body]
    .map(value => ({normal: normalize(value), compact: compact(value)}))}));
}
// Match complete company-name queries, including references from historical documents.
const companyNames = new Set([
  'nukem', 'nukemtechnologies', 'nukemtechnologiesgmbh', 'nukemtechnologiesgmbh(nukem)',
  'ntes', 'nukemtechnologiesengineeringservicesgmbh', 'nukemtechnologiesengineeringservicesgmbh(ntes)',
]);

export function queryTerms(query) {
  const words = normalize(query).split(' ').filter(Boolean).slice(0, 16);
  return words.map(word => word === 'ntes' ? 'nukem' : word);
}

export function searchIndex(rows, query = '', category = '') {
  const companyQuery = companyNames.has(compact(query));
  const terms = queryTerms(query);
  return rows.filter(row => !category || (category === 'prtimes' ? row.prtimes : row.category === category))
    .map(row => {
      let score = row.route.startsWith('archive/') ? 0 : 8;
      if (companyQuery && row.route === 'company') {
        const description = row.url.includes('/ja/')
          ? 'ドイツのグループ会社。原子力分野の技術評価、設計、オーナーズエンジニアリング、放射性廃棄物管理、廃止措置を担います。'
          : 'The German group company provides technical assessment, design and owner’s engineering for nuclear projects, radioactive waste management and decommissioning.';
        return {row: {...row, title: row.url.includes('/ja/') ? 'NUKEM Technologies  GmbH（NUKEM）' : 'NUKEM Technologies  GmbH (NUKEM)', description, url: row.url + '#nukem-technologies'}, score: 1000};
      }
      for (const term of terms) {
        const compressed = compact(term);
        const shortAcronym = /^[a-z0-9]{1,3}$/.test(term);
        const wholeWord = shortAcronym ? new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`) : null;
        const hit = row.fields.findIndex(field => shortAcronym ? wholeWord.test(field.normal)
          : field.normal.includes(term) || (compressed && field.compact.includes(compressed)));
        if (hit < 0) return null;
        score += [100, 55, 25, 5][hit];
        // An explicit acronym alias outranks accidental compacted word matches.
        if (/^[a-z0-9]+$/.test(term) && row.fields[1].normal.split(/[^a-z0-9]+/).includes(term)) score += 25;
      }
      if (terms.length && row.fields[0].compact === compact(query)) score += 120;
      return {row, score};
    }).filter(Boolean).sort((a,b) => b.score-a.score || b.row.date.localeCompare(a.row.date)
      || a.row.title.localeCompare(b.row.title, 'ja')).map(result => result.row);
}
