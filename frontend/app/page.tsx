'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CompanyCard, Company } from '../components/CompanyCard';
import { CompanyModal } from '../components/CompanyModal';
import { Plus, Briefcase, Calendar, TrendingUp, Mail, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const stages = [
  { id: 'screening', name: 'Screening', color: '#6b7280' },
  { id: 'technical', name: 'Technical', color: '#1D4AFF' },
  { id: 'final', name: 'Final Round', color: '#FF9B42' },
  { id: 'offer', name: 'Offer', color: '#10b981' },
];

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_URL}/api/pipeline`);
      const fetchedCompanies = response.data.companies || response.data || [];
      setCompanies(fetchedCompanies);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      setError(err?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const syncCalendar = async () => {
    setSyncing(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/api/calendar/sync`);
      await loadCompanies();
    } catch (err: any) {
      console.error('Failed to sync calendar:', err);
      setError('Calendar sync failed - check Google Calendar connection');
    } finally {
      setSyncing(false);
    }
  };

  const syncGmail = async () => {
    setSyncing(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/api/gmail/sync`);
      await loadCompanies();
    } catch (err: any) {
      console.error('Failed to sync Gmail:', err);
      setError('Gmail sync failed - check Gmail connection');
    } finally {
      setSyncing(false);
    }
  };

  const openCompanyModal = (company: Company) => {
    setSelectedCompany(company);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedCompany(null), 300);
  };

  const getCompaniesByStage = (stageId: string) => {
    return companies.filter((c) => c.stage === stageId);
  };

  const stats = {
    total: companies.length,
    active: companies.filter((c) => ['screening', 'technical', 'final'].includes(c.stage)).length,
    offers: companies.filter((c) => c.stage === 'offer').length,
    successRate: companies.length > 0
      ? Math.round((companies.filter((c) => c.stage === 'offer').length / companies.length) * 100)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#FF9B42] animate-spin mx-auto mb-4" />
          <p className="text-[#9ca3af]">Loading your pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] bg-clip-text text-transparent">
            Interview Pipeline
          </h1>
          <p className="text-[#9ca3af] mt-2">
            Track your interviews, research companies, and negotiate offers
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={syncGmail}
            disabled={syncing}
            icon={<Mail className="w-4 h-4" />}
          >
            {syncing ? 'Syncing...' : 'Sync Gmail'}
          </Button>
          <Button
            variant="ghost"
            onClick={syncCalendar}
            disabled={syncing}
            icon={<Calendar className="w-4 h-4" />}
          >
            {syncing ? 'Syncing...' : 'Sync Calendar'}
          </Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Company
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9ca3af] mb-1">Total Companies</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-[#25272a] rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-[#FF9B42]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9ca3af] mb-1">Active Interviews</p>
                <p className="text-3xl font-bold text-white">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-[#25272a] rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#1D4AFF]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9ca3af] mb-1">Offers</p>
                <p className="text-3xl font-bold text-white">{stats.offers}</p>
              </div>
              <div className="w-12 h-12 bg-[#25272a] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#10b981]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9ca3af] mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-white">{stats.successRate}%</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stages.map((stage) => {
          const stageCompanies = getCompaniesByStage(stage.id);
          return (
            <div key={stage.id}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{stage.name}</h3>
                  <span className="px-2 py-0.5 text-xs bg-[#25272a] text-[#9ca3af] rounded-full">
                    {stageCompanies.length}
                  </span>
                </div>
                <div
                  className="h-1 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
              </div>

              <div className="space-y-3 min-h-[400px]">
                {stageCompanies.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 pb-6">
                      <p className="text-sm text-[#6b7280] text-center">No companies yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  stageCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onClick={() => openCompanyModal(company)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Company Modal */}
      <CompanyModal company={selectedCompany} isOpen={modalOpen} onClose={closeModal} />
    </div>
  );
}
