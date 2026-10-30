// TF-IDF based text similarity
// Hand-written tokenizer + stopwords + cosine similarity (no external deps)

// Common English + Indian civic complaint stopwords
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'this', 'that', 'there',
  'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'not', 'no',
  'very', 'also', 'as', 'so', 'than', 'then', 'when', 'where', 'which',
  'who', 'how', 'what', 'near', 'around', 'about', 'please', 'road', 'street',
])

// Tokenise: lowercase, strip punctuation, remove stopwords, min length 2
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w))
}

// Build TF (term frequency) map from a token list
export function tf(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1)
  const total = tokens.length || 1
  const result = new Map<string, number>()
  for (const [t, c] of counts) result.set(t, c / total)
  return result
}

// Compute IDF over a corpus of token lists
export function idf(corpus: string[][]): Map<string, number> {
  const df = new Map<string, number>()
  for (const doc of corpus) {
    const seen = new Set(doc)
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const N = corpus.length
  const result = new Map<string, number>()
  for (const [t, d] of df) result.set(t, Math.log((N + 1) / (d + 1)) + 1)
  return result
}

// Build TF-IDF vector for one document given a global IDF map
export function tfidfVector(
  tokens: string[],
  idfMap: Map<string, number>
): Map<string, number> {
  const tfMap = tf(tokens)
  const vec = new Map<string, number>()
  for (const [t, tfVal] of tfMap) {
    vec.set(t, tfVal * (idfMap.get(t) ?? 1))
  }
  return vec
}

// Cosine similarity between two sparse vectors (Maps)
export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  for (const [t, va] of a) {
    dot += va * (b.get(t) ?? 0)
    normA += va * va
  }
  for (const [, vb] of b) normB += vb * vb
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Convenience: compute cosine similarity between two text strings
// Uses a tiny two-document corpus for IDF (adequate for pairwise comparison)
export function textSimilarity(a: string, b: string): number {
  const tA = tokenise(a)
  const tB = tokenise(b)
  if (tA.length === 0 && tB.length === 0) return 1
  if (tA.length === 0 || tB.length === 0) return 0
  const idfMap = idf([tA, tB])
  const vA = tfidfVector(tA, idfMap)
  const vB = tfidfVector(tB, idfMap)
  return cosine(vA, vB)
}
