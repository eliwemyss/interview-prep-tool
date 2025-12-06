'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Lightbulb,
  DollarSign,
  MessageSquare,
  Building,
  Calendar,
  User,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { Company } from './CompanyCard';
import { SalaryCalculator } from './SalaryCalculator';
import clsx from 'clsx';

type Tab = 'research' | 'prep' | 'salary' | 'feedback';

interface CompanyModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyModal({ company, isOpen, onClose }: CompanyModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('research');
  const [researchData, setResearchData] = useState<any>(null);

  useEffect(() => {
    if (company?.research_data) {
      setResearchData(company.research_data);
    }
  }, [company]);

  if (!company) return null;

  const tabs = [
    { id: 'research' as Tab, name: 'Research', icon: FileText },
    { id: 'prep' as Tab, name: 'Prep', icon: Lightbulb },
    { id: 'salary' as Tab, name: 'Salary', icon: DollarSign },
    { id: 'feedback' as Tab, name: 'Feedback', icon: MessageSquare },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-[#15171a] shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#1c1e21] border-b border-[rgba(255,255,255,0.1)] z-10">
              <div className="flex items-center justify-between p-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{company.company_name}</h2>
                  {company.job_title && (
                    <p className="text-sm text-[#9ca3af] mt-1">{company.job_title}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[#25272a] transition-colors"
                >
                  <X className="w-6 h-6 text-[#9ca3af]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[rgba(255,255,255,0.1)]">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        'flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-all relative',
                        activeTab === tab.id
                          ? 'text-[#FF9B42]'
                          : 'text-[#9ca3af] hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.name}</span>
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF9B42]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'research' && (
                <ResearchTab company={company} researchData={researchData} />
              )}
              {activeTab === 'prep' && (
                <PrepTab company={company} researchData={researchData} />
              )}
              {activeTab === 'salary' && <SalaryTab company={company} />}
              {activeTab === 'feedback' && <FeedbackTab company={company} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ResearchTab({ company, researchData }: { company: Company; researchData: any }) {
  if (!researchData) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-[#6b7280] mx-auto mb-4" />
        <p className="text-[#9ca3af]">No research data available yet</p>
        <Button variant="primary" className="mt-4">
          Start Research
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      {researchData.overview && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-3">
              <Building className="w-5 h-5 text-[#FF9B42]" />
              <h3 className="text-lg font-semibold text-white">Overview</h3>
            </div>
            <p className="text-[#9ca3af] leading-relaxed">{researchData.overview}</p>
          </CardContent>
        </Card>
      )}

      {/* Financials */}
      {researchData.financials && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#FF9B42]" />
              <h3 className="text-lg font-semibold text-white">Financials</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {researchData.financials.funding && (
                <div>
                  <p className="text-xs text-[#6b7280] mb-1">Funding</p>
                  <p className="text-sm text-white">{researchData.financials.funding}</p>
                </div>
              )}
              {researchData.financials.valuation && (
                <div>
                  <p className="text-xs text-[#6b7280] mb-1">Valuation</p>
                  <p className="text-sm text-white">{researchData.financials.valuation}</p>
                </div>
              )}
              {researchData.financials.revenue && (
                <div>
                  <p className="text-xs text-[#6b7280] mb-1">Revenue</p>
                  <p className="text-sm text-white">{researchData.financials.revenue}</p>
                </div>
              )}
            </div>
            {researchData.financials.investors && researchData.financials.investors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-[#6b7280] mb-2">Investors</p>
                <div className="flex flex-wrap gap-2">
                  {researchData.financials.investors.map((investor: string, idx: number) => (
                    <Badge key={idx} variant="blue">
                      {investor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Culture */}
      {researchData.culture && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-5 h-5 text-[#FF9B42]" />
              <h3 className="text-lg font-semibold text-white">Culture</h3>
            </div>
            {researchData.culture.rating && (
              <div className="mb-4">
                <p className="text-xs text-[#6b7280] mb-1">Glassdoor Rating</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-white mr-2">
                    {researchData.culture.rating}
                  </span>
                  <span className="text-[#9ca3af]">/ 5.0</span>
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {researchData.culture.pros && researchData.culture.pros.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-white mb-2">Pros</p>
                  <ul className="space-y-1">
                    {researchData.culture.pros.map((pro: string, idx: number) => (
                      <li key={idx} className="text-sm text-[#9ca3af] flex items-start">
                        <span className="text-green-400 mr-2">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {researchData.culture.cons && researchData.culture.cons.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-white mb-2">Cons</p>
                  <ul className="space-y-1">
                    {researchData.culture.cons.map((con: string, idx: number) => (
                      <li key={idx} className="text-sm text-[#9ca3af] flex items-start">
                        <span className="text-red-400 mr-2">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tech Stack */}
      {researchData.techStack && researchData.techStack.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {researchData.techStack.map((tech: string, idx: number) => (
                <Badge key={idx} variant="orange">
                  {tech}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitors */}
      {researchData.competitors && researchData.competitors.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Competitors</h3>
            <div className="flex flex-wrap gap-2">
              {researchData.competitors.map((competitor: string, idx: number) => (
                <Badge key={idx} variant="default">
                  {competitor}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PrepTab({ company, researchData }: { company: Company; researchData: any }) {
  if (!researchData) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 text-[#6b7280] mx-auto mb-4" />
        <p className="text-[#9ca3af]">Complete research first to generate prep materials</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Interview Questions */}
      {researchData.interviewQuestions && researchData.interviewQuestions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Likely Interview Questions</h3>
            <div className="space-y-3">
              {researchData.interviewQuestions.map((question: string, idx: number) => (
                <div key={idx} className="p-3 bg-[#25272a] rounded-lg border border-[rgba(255,255,255,0.1)]">
                  <p className="text-sm text-white">{question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prep Tips */}
      {researchData.prepTips && researchData.prepTips.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preparation Tips</h3>
            <div className="space-y-2">
              {researchData.prepTips.map((tip: string, idx: number) => (
                <div key={idx} className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-[#FF9B42]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-[#FF9B42] font-bold">{idx + 1}</span>
                  </div>
                  <p className="ml-3 text-sm text-[#9ca3af]">{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SalaryTab({ company }: { company: Company }) {
  return (
    <div>
      <SalaryCalculator company={company} />
    </div>
  );
}

function FeedbackTab({ company }: { company: Company }) {
  const [feedback, setFeedback] = useState('');

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Post-Interview Feedback</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="How did the interview go? What questions were asked? What went well or could be improved?"
          className="w-full h-48 px-4 py-3 bg-[#25272a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#FF9B42] resize-none"
        />
        <Button variant="primary" className="mt-4">
          Save Feedback
        </Button>
      </CardContent>
    </Card>
  );
}
