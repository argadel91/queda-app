import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import FeedSkeleton from './components/skeletons/FeedSkeleton.jsx'
import PlanDetailSkeleton from './components/skeletons/PlanDetailSkeleton.jsx'
import ProfileSkeleton from './components/skeletons/ProfileSkeleton.jsx'
import NotificationsSkeleton from './components/skeletons/NotificationsSkeleton.jsx'
import OnboardingTour from './components/OnboardingTour.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import { useAuth } from './hooks/useAuth.js'

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

function BlankFallback() { return <div style={{ padding: 24 }} /> }

// Needs to be inside BrowserRouter to use useAuth (which calls db.auth.getSession inside effects)
function AppInner() {
  const { user } = useAuth()
  return (
    <>
      <OnboardingTour isAuthed={!!user} />
      <InstallPrompt isAuthed={!!user} />
      <Routes>
        <Route path="/login" element={
          <ErrorBoundary><Suspense fallback={<BlankFallback />}><Login /></Suspense></ErrorBoundary>
        } />
        <Route path="/signup" element={
          <ErrorBoundary><Suspense fallback={<BlankFallback />}><Signup /></Suspense></ErrorBoundary>
        } />
        <Route path="/verify" element={
          <ErrorBoundary><Suspense fallback={<BlankFallback />}><Verify /></Suspense></ErrorBoundary>
        } />
        <Route path="/onboarding" element={
          <ErrorBoundary>
            <Suspense fallback={<BlankFallback />}>
              <ProtectedRoute requireProfile={false}><Onboarding /></ProtectedRoute>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/welcome" element={
          <ErrorBoundary>
            <Suspense fallback={<BlankFallback />}>
              <ProtectedRoute><Welcome /></ProtectedRoute>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/" element={
          <ErrorBoundary>
            <Suspense fallback={<Layout><FeedSkeleton /></Layout>}>
              <Layout><Feed /></Layout>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/create-plan" element={
          <ErrorBoundary>
            <Suspense fallback={<Layout><BlankFallback /></Layout>}>
              <ProtectedRoute><Layout><CreatePlan /></Layout></ProtectedRoute>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/my-plans" element={
          <ErrorBoundary>
            <Suspense fallback={<Layout><FeedSkeleton /></Layout>}>
              <ProtectedRoute><Layout><MyPlans /></Layout></ProtectedRoute>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/profile" element={
          <ErrorBoundary>
            <Suspense fallback={<Layout><ProfileSkeleton /></Layout>}>
              <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/notifications" element={
          <ErrorBoundary>
            <Suspense fallback={<Layout><NotificationsSkeleton /></Layout>}>
              <ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/plan/:id" element={
          <ErrorBoundary>
            <Suspense fallback={<Layout><PlanDetailSkeleton /></Layout>}>
              <Layout><PlanDetail /></Layout>
            </Suspense>
          </ErrorBoundary>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
