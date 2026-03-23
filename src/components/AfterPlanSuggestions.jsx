import React from 'react'
import T from '../constants/translations.js'
import { affLink, uberLink, withUtm } from '../lib/affiliates.js'

export default function AfterPlanSuggestions({plan, c, lang}){
  const t=T[lang];
  const opt=plan.stops?.flatMap(s=>s.options||[s]).find(o=>o.lat&&o.lng)||{};
  const lat=opt.lat;const lng=opt.lng;
  const city=plan.city||'';
  const cityEnc=encodeURIComponent(city);
  const date=plan.confirmedDate||plan.dates?.[0]||'';
  const mapsSearch=(q)=>lat&&lng?withUtm(`https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lng},15z`):null;

  const Section=({emoji,title,children})=><div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'14px 16px',marginBottom:'8px'}}>
    <div style={{fontSize:'13px',fontWeight:'700',color:c.T,marginBottom:'8px'}}>{emoji} {title}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>{children}</div>
  </div>;

  const Link=({href,children})=>href?<a href={href} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',textDecoration:'none',fontSize:'12px',color:c.T,fontWeight:'500'}}>{children}</a>:null;

  return(<div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'2px'}}>
    {/* 1. Ideas */}
    <Section emoji="🔍" title={t.sugIdeas||'Need ideas?'}>
      <Link href={mapsSearch('restaurants')}> 🍽️ {t.nearbyRestaurants||'Restaurants'}</Link>
      <Link href={mapsSearch('bars')}> 🍸 {t.nearbyBars||'Bars'}</Link>
      <Link href={mapsSearch('cafes')}> ☕ {t.nearbyCafes||'Cafés'}</Link>
      <Link href={mapsSearch('things to do')}> 🎭 {t.nearbyActivities||'Activities'}</Link>
    </Section>

    {/* 2. Transport */}
    <Section emoji="🚕" title={t.sugTransport||'Need transport?'}>
      <Link href={uberLink()}>🚗 Uber</Link>
      <Link href="https://cabify.com/">🚕 Cabify</Link>
      <Link href={affLink('https://www.blablacar.com/','blablacar')}>🚙 BlaBlaCar</Link>
      <Link href={affLink('https://www.thetrainline.com/','trainline')}>🚆 Trainline</Link>
      <Link href={withUtm('https://www.google.com/travel/flights')}>✈️ {t.flights||'Flights'}</Link>
    </Section>

    {/* 3. Accommodation */}
    <Section emoji="🏨" title={t.sugAccom||'Need a place to stay?'}>
      <Link href={affLink(`https://www.booking.com/search.html?ss=${cityEnc}&checkin=${date}`,'booking')}>🔵 Booking</Link>
      <Link href={affLink(`https://www.airbnb.com/s/${cityEnc}/homes?checkin=${date}`,'airbnb')}>🏠 Airbnb</Link>
      <Link href={affLink(`https://www.hotels.com/search.do?destination=${cityEnc}&startDate=${date}`,'hotels')}>🏨 Hotels.com</Link>
    </Section>

    {/* 4. Hungry */}
    <Section emoji="🍳" title={t.sugHungry||'Hungry?'}>
      <Link href={mapsSearch('breakfast')}>🥐 {t.breakfast||'Breakfast'}</Link>
      <Link href={mapsSearch('brunch')}>🍳 Brunch</Link>
      <Link href={mapsSearch('fast food')}>🍔 {t.fastFood||'Fast food'}</Link>
      <Link href={mapsSearch('supermarket')}>🛒 {t.supermarket||'Supermarket'}</Link>
    </Section>

    {/* 5. Last-minute shopping */}
    <Section emoji="🛍️" title={t.sugShopping||'Last-minute shopping?'}>
      <Link href={mapsSearch('shopping mall')}>🏬 {t.shoppingMall||'Mall'}</Link>
      <Link href={mapsSearch('store')}>🏪 {t.stores||'Stores'}</Link>
      <Link href={mapsSearch('ATM')}>🏧 {t.atm||'ATM'}</Link>
    </Section>

    {/* 6. Emergency */}
    <Section emoji="🚨" title={t.sugEmergency||'Need help?'}>
      <Link href={mapsSearch('hospital')}>🏥 {t.hospital||'Hospital'}</Link>
      <Link href={mapsSearch('pharmacy')}>💊 {t.pharmacy||'Pharmacy'}</Link>
      <Link href={mapsSearch('police')}>🚔 {t.police||'Police'}</Link>
      <Link href={mapsSearch('fire station')}>🚒 {t.fireDept||'Fire dept.'}</Link>
    </Section>
  </div>);
}
