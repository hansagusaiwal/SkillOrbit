import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/layout/ScrollToTop";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CreateJobPage from "./pages/CreateJobPage";
import JobIntelligencePage from "./pages/JobIntelligencePage";
import CandidateDiscoveryPage from "./pages/CandidateDiscoveryPage";
import CandidateProfilePage from "./pages/CandidateProfilePage";
import HiddenGemsPage from "./pages/HiddenGemsPage";
import TalentTwinPage from "./pages/TalentTwinPage";
import ShortlistExportPage from "./pages/ShortlistExportPage";
import MarketInsightPage from "./pages/MarketInsightPage";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create-job" element={<CreateJobPage />} />
        <Route path="/job-intelligence" element={<JobIntelligencePage />} />
        <Route path="/candidate-discovery" element={<CandidateDiscoveryPage />} />
        <Route path="/candidate-profile/:candidateId" element={<CandidateProfilePage />} />
        <Route path="/candidate-profile" element={<CandidateProfilePage />} />
        <Route path="/hidden-gems" element={<HiddenGemsPage />} />
        <Route path="/talent-twin" element={<TalentTwinPage />} />
        <Route path="/shortlist-export" element={<ShortlistExportPage />} />
        <Route path="/market-insight" element={<MarketInsightPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}