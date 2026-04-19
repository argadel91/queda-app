import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

const Feed = lazy(() => import('./pages/Feed.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const Verify = lazy(() => import('./pages/Verify.jsx'))
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const CreatePlan = lazy(() => import('./pages/CreatePlan.jsx'))
const PlanDetail = lazy(() => import('./pages/PlanDetail.jsx'))
const MyPlans = lazy(() => import('./pages/MyPlans.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))
const Welcome = lazy(() => import('./pages/Welcome.jsx'))

// Layout-free routes (no bottom nav / header): auth flow + onboarding.
// Everything else is wrapped in <Layout> and gated by <ProtectedRoute>.
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
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
          <Route path="/notifications" element={
            <ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>
          } />
          <Route path="/plan/:id" element={<Layout><PlanDetail /></Layout>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
