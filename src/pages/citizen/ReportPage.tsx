// Report Page — citizen complaint submission form
// Mobile-first, should complete in under 60 seconds
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Upload, Crosshair, X, AlertCircle, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CitizenHeader } from '@/components/citizen/CitizenHeader'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/types'
import type { SubmitReportResponse } from '@/types'
import { isValidLatLng } from '@/lib/utils'

// Lazy-load Leaflet only in browser (SSR safe)
import LocationPicker from '@/components/citizen/LocationPicker'

// ── Zod validation schema (mirrors edge function validation) ────────────────
const ReportSchema = z.object({
  description:    z.string().min(10, 'Please describe the issue (min 10 characters)').max(2000),
  user_category:  z.string().min(1, 'Please select a category'),
  latitude:       z.number().min(-90).max(90),
  longitude:      z.number().min(-180).max(180),
  location_text:  z.string().max(200).optional(),
  affected_count: z.number().int().min(1).max(9999).default(1),
})

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ReportPage() {
  const navigate = useNavigate()

  // Form state
  const [description, setDescription]       = useState('')
  const [category, setCategory]             = useState('')
  const [latitude, setLatitude]             = useState<number | null>(null)
  const [longitude, setLongitude]           = useState<number | null>(null)
  const [locationText, setLocationText]     = useState('')
  const [affectedCount, setAffectedCount]   = useState(1)
  const [imageFile, setImageFile]           = useState<File | null>(null)
  const [imagePreview, setImagePreview]     = useState<string | null>(null)
  const [imageError, setImageError]         = useState('')

  // UI state
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Image handling ───────────────────────────────────────────────────────
  const handleImageSelect = (file: File) => {
    setImageError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Only JPEG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('Image must be under 5 MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageSelect(file)
  }

  // ── Geolocation ─────────────────────────────────────────────────────────
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrors(e => ({ ...e, location: 'Geolocation not supported by this browser.' }))
      return
    }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLocLoading(false)
        setErrors(e => { const n = { ...e }; delete n.location; return n })
      },
      () => {
        setErrors(e => ({ ...e, location: 'Could not get location. Please pin it on the map.' }))
        setLocLoading(false)
      },
      { timeout: 10000 }
    )
  }

  // Called by the map component when user clicks
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
    setErrors(e => { const n = { ...e }; delete n.location; return n })
  }, [])

  // ── Form submission ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setErrors({})

    // Client-side validation
    const result = ReportSchema.safeParse({
      description,
      user_category: category,
      latitude:      latitude ?? 0,
      longitude:     longitude ?? 0,
      location_text: locationText || undefined,
      affected_count: affectedCount,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(e => {
        const field = e.path[0] as string
        fieldErrors[field] = e.message
      })
      if (!latitude || !longitude) fieldErrors.location = 'Please select a location on the map.'
      setErrors(fieldErrors)
      return
    }

    if (!latitude || !longitude || !isValidLatLng(latitude, longitude)) {
      setErrors({ location: 'Please select a location on the map.' })
      return
    }

    setLoading(true)

    try {
      // Step 1: upload image to Supabase Storage (if provided)
      let imageUrl: string | null = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('report-images')
          .upload(filename, imageFile, { contentType: imageFile.type, upsert: false })

        if (uploadError) {
          console.error('Image upload failed:', uploadError)
          // Non-fatal — continue without image
        } else {
          const { data: urlData } = supabase.storage
            .from('report-images')
            .getPublicUrl(filename)
          imageUrl = urlData.publicUrl
        }
      }

      // Step 2: call the submit-report Edge Function
      const { data, error } = await supabase.functions.invoke<SubmitReportResponse>('submit-report', {
        body: {
          description,
          user_category:  category,
          latitude,
          longitude,
          location_text:  locationText || null,
          affected_count: affectedCount,
          image_url:      imageUrl,
        },
      })

      if (error || !data) {
        throw new Error(error?.message || 'Submission failed. Please try again.')
      }

      // Step 3: navigate to success page, passing response in state
      navigate('/report/success', { state: { result: data } })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-civic-bg flex flex-col">
      <CitizenHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Report a Civic Issue</h1>
          <p className="text-muted-foreground mt-1 text-sm">Takes less than a minute. Your report helps improve our city.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Description ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Issue Description</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">
                  Describe the problem <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="e.g. Large pothole on the main road near the bus stop causing accidents..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={`mt-1.5 min-h-[120px] ${errors.description ? 'border-destructive' : ''}`}
                  maxLength={2000}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.description}
                    </p>
                  ) : <span />}
                  <span className="text-xs text-muted-foreground">{description.length}/2000</span>
                </div>
              </div>

              <div>
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className={`mt-1.5 ${errors.user_category ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.user_category && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{errors.user_category}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="affected">How many people are affected? (optional)</Label>
                <Input
                  id="affected"
                  type="number"
                  min={1}
                  max={9999}
                  value={affectedCount}
                  onChange={e => setAffectedCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1.5 w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Image upload ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Photo (optional)</CardTitle></CardHeader>
            <CardContent>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-muted rounded-md p-8 text-center cursor-pointer hover:border-civic-accent transition-colors"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or <span className="text-civic-accent font-medium">click to upload</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP · max 5 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]) }}
              />
              {imageError && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{imageError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Location ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle className="text-base">
              Location <span className="text-destructive text-sm font-normal">* required</span>
            </CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Use my location button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                disabled={locLoading}
                className="w-full"
              >
                {locLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
                Use My Current Location
              </Button>

              {/* Leaflet map — click to place pin */}
              <div className="h-64 rounded-md overflow-hidden border">
                <LocationPicker
                  lat={latitude}
                  lng={longitude}
                  onLocationSelect={handleMapClick}
                />
              </div>

              {/* Manual lat/lng fallback */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="lat" className="text-xs font-medium text-slate-700">Latitude</Label>
                  <Input
                    id="lat"
                    aria-label="Latitude coordinates"
                    type="number"
                    step="any"
                    placeholder="e.g. 12.9716"
                    value={latitude ?? ''}
                    onChange={e => setLatitude(parseFloat(e.target.value) || null)}
                    className="mt-1 focus:ring-2 focus:ring-civic-accent focus:outline-none"
                  />
                </div>
                <div>
                  <Label htmlFor="lng" className="text-xs font-medium text-slate-700">Longitude</Label>
                  <Input
                    id="lng"
                    aria-label="Longitude coordinates"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.5946"
                    value={longitude ?? ''}
                    onChange={e => setLongitude(parseFloat(e.target.value) || null)}
                    className="mt-1 focus:ring-2 focus:ring-civic-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional landmark text */}
              <div>
                <Label htmlFor="landmark">Nearest landmark (optional)</Label>
                <Input
                  id="landmark"
                  placeholder="e.g. Near Central Bus Stand, opposite petrol bunk"
                  value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                  maxLength={200}
                  className="mt-1"
                />
              </div>

              {errors.location && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.location}
                </p>
              )}

              {latitude && longitude && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location set: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Submit ───────────────────────────────────────────────────── */}
          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full bg-civic-accent hover:bg-civic-accent-hover">
            {loading ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting…</>
            ) : (
              <><MapPin className="h-5 w-5 mr-2" /> Submit Report</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting you agree this is a genuine civic issue. No personal data is stored.
          </p>
        </form>
      </main>
    </div>
  )
}
