// DBSCAN clustering for hotspot detection
// eps: maximum distance (metres) between points in a cluster
// minPts: minimum points to form a cluster

import { haversine } from './haversine.ts'

export interface GeoPoint {
  id: string
  latitude: number
  longitude: number
  category: string
  priority_score: number | null
  location_text: string | null
  status: string
}

export interface Cluster {
  id: number
  points: GeoPoint[]
  centre_lat: number
  centre_lng: number
  radius_m: number
  count: number
  dominant_category: string
  category_counts: Record<string, number>
  avg_priority: number
  label: string | null
  wording: string
}

const NOISE = -1

export function dbscan(
  points: GeoPoint[],
  eps: number,       // metres
  minPts: number
): Cluster[] {
  const n = points.length
  const labels = new Array<number>(n).fill(NOISE)
  let clusterId = 0

  // Get indices of all points within eps metres of points[idx]
  function rangeQuery(idx: number): number[] {
    return points.reduce<number[]>((acc, _, j) => {
      if (haversine(
        points[idx].latitude, points[idx].longitude,
        points[j].latitude,   points[j].longitude
      ) <= eps) acc.push(j)
      return acc
    }, [])
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== NOISE) continue  // already processed

    const neighbours = rangeQuery(i)
    if (neighbours.length < minPts) continue  // noise

    // Start a new cluster
    labels[i] = clusterId
    const queue = [...neighbours.filter(j => j !== i)]

    let qi = 0
    while (qi < queue.length) {
      const j = queue[qi++]
      if (labels[j] === NOISE) {
        labels[j] = clusterId
        const jNeighbours = rangeQuery(j)
        if (jNeighbours.length >= minPts) {
          queue.push(...jNeighbours.filter(k => labels[k] === NOISE && !queue.includes(k)))
        }
      } else if (labels[j] < 0) {
        labels[j] = clusterId
      }
    }
    clusterId++
  }

  // Build cluster objects
  const clusters: Cluster[] = []
  for (let cid = 0; cid < clusterId; cid++) {
    const pts = points.filter((_, i) => labels[i] === cid)
    if (pts.length < minPts) continue

    // Centroid
    const lat = pts.reduce((s, p) => s + p.latitude, 0) / pts.length
    const lng = pts.reduce((s, p) => s + p.longitude, 0) / pts.length

    // Radius = max distance from centroid to any point
    const radius = Math.max(...pts.map(p => haversine(lat, lng, p.latitude, p.longitude)))

    // Category counts & dominant
    const catCounts: Record<string, number> = {}
    pts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1 })
    const dominant = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0]

    // Avg priority
    const scored = pts.filter(p => p.priority_score !== null)
    const avgPrio = scored.length
      ? scored.reduce((s, p) => s + (p.priority_score ?? 0), 0) / scored.length
      : 0

    // Most common location_text as label
    const locCounts: Record<string, number> = {}
    pts.forEach(p => { if (p.location_text) locCounts[p.location_text] = (locCounts[p.location_text] || 0) + 1 })
    const label = Object.keys(locCounts).length
      ? Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

    clusters.push({
      id:               cid,
      points:           pts,
      centre_lat:       lat,
      centre_lng:       lng,
      radius_m:         radius,
      count:            pts.length,
      dominant_category: dominant,
      category_counts:  catCounts,
      avg_priority:     avgPrio,
      label,
      // Deliberately vague — never claim a proven cause
      wording: 'Possible infrastructure issue, inspection recommended',
    })
  }

  // Sort by count desc
  return clusters.sort((a, b) => b.count - a.count)
}
