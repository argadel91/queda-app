import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Feed from './pages/Feed.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Verify from './pages/Verify.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Profile from './pages/Profile.jsx'
import CreatePlan from './pages/CreatePlan.jsx'
import PlanDetail from './pages/PlanDetail.jsx'
import MyPlans from './pages/MyPlans.jsx'
import Wallet from './pages/Wallet.jsx'
import Notifications from './pages/Notifications.jsx'
import Welcome from './pages/Welcome.jsx'

// Layout-free routes (no bottom nav / header): auth flow + onboarding.
// Everything else is wrapped in <Layout> and gated by <ProtectedRoute>.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/onboarding" element={
          <ProtectedRoute requireProfile={false}><Onboarding /></ProtectedRoute>
        } />
        <Route path="/welcome" element={
          <ProtectedRoute><Welcome /></ProtectedRoute>
        } />

        <Route path="/" element={<Layout><Feed /></Layout>} />
        <Route path="/create-plan" element={
          <ProtectedRoute><Layout><CreatePlan /></Layout></ProtectedRoute>
        } />
        <Route path="/my-plans" element={
          <ProtectedRoute><Layout><MyPlans /></Layout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute><Layout><Wallet /></Layout></ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>
        } />
        <Route path="/plan/:id" element={<Layout><PlanDetail /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
