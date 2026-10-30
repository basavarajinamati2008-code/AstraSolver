// Leaflet map component for location picking
// Dynamically imported so Leaflet only runs client-side
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet's default marker icon (webpack/vite breaks the default asset paths)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface LocationPickerProps {
  lat: number | null
  lng: number | null
  onLocationSelect: (lat: number, lng: number) => void
}

// Inner component that handles map click events
function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Default centre: a fictional demo city area (Maplewood)
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]
const DEFAULT_ZOOM = 14

export default function LocationPicker({ lat, lng, onLocationSelect }: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Pan map to marker when coordinates are set externally (e.g. "use my location")
  useEffect(() => {
    if (mapRef.current && lat && lng) {
      mapRef.current.setView([lat, lng], DEFAULT_ZOOM)
    }
  }, [lat, lng])

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      {/* OpenStreetMap tiles — free, no API key needed */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onSelect={onLocationSelect} />
      {/* Show marker only when a location has been selected */}
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  )
}
