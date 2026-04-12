import React, { useState, useEffect, useCallback } from 'react'
import T from '../constants/translations.js'
import { fetchPlans } from '../lib/supabase.js'
import PlanCard from '../components/PlanCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import useGeolocation, { haversine } from '../hooks/useGeolocation.js'

export default function Feed({ c, lang, onPlanClick, userLocation }) {
  const t = T[lang]
  const [plans, setPlans] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', dateRange: '', radiusKm: '' })
  const geo = useGeolocation()

  const myLat = userLocation?.lat || geo.location?.lat
  const myLng = userLocation?.lng || geo.location?.lng

  const load = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (filters.category) params.category = filters.category

    // Date range
    const today = new Date().toISOString().slice(0, 10)
    if (filters.dateRange === 'today') {
      params.dateFrom = today; params.dateTo = today
    } else if (filters.dateRange === 'week') {
      const d = new Date(); d.setDate(d.getDate() + 7)
      params.dateFrom = today; params.dateTo = d.toISOString().slice(0, 10)
    } else if (filters.dateRange === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() + 1)
      params.dateFrom = today; params.dateTo = d.toISOString().slice(0, 10)
    }

    // Distance
    if (filters.radiusKm && myLat && myLng) {
      params.lat = myLat; params.lng = myLng; params.radiusKm = Number(filters.radiusKm)
    }

    const result = await fetchPlans(params)
    setPlans(result.plans)
    setTotal(result.total)
    setLoading(false)
  }, [filters, myLat, myLng])

  useEffect(() => { load() }, [load])

  const handleFilterChange = newFilters => {
    // If distance filter selected but no location, request it
    if (newFilters.radiusKm && !myLat && !geo.loading) {
      geo.request()
    }
    setFilters(newFilters)
  }

  return (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ fontFamily: "'Syne',serif", fontSize: '24px', fontWeight: '800', color: c.T, marginBottom: '16px' }}>
        {t.discoverPlans || 'Discover plans'}
      </h2>

      <FilterBar filters={filters} onChange={handleFilterChange} lang={lang} c={c} />

      {/* Location prompt */}
      {!myLat && !geo.loading && geo.error !== 'denied' && (
        <button onClick={geo.request} style={{
          width: '100%', padding: '10px', marginBottom: '12px',
          background: `${c.A}10`, border: `1px solid ${c.A}30`, borderRadius: '10px',
          color: c.A, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
        }}>
          📍 {t.enableLocation || 'Enable location to see nearby plans'}
        </button>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: c.M }}>
          <div style={{ width: '24px', height: '24px', border: `3px solid ${c.BD}`, borderTop: `3px solid ${c.A}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          {t.loading || 'Loading...'}
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔭</div>
          <p style={{ color: c.M, fontSize: '14px' }}>{t.noPlansFound || 'No plans found. Be the first to create one!'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              lang={lang}
              c={c}
              distance={myLat && myLng ? haversine(myLat, myLng, plan.lat, plan.lng) : null}
              onClick={() => onPlanClick(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
