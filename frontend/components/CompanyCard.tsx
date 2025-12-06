'use client';

import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Calendar, DollarSign, User } from 'lucide-react';
import clsx from 'clsx';

export interface Company {
  id: string;
  company_name: string;
  job_title?: string;
  stage: string;
  interview_date?: string;
  interviewer_name?: string;
  status?: string;
  salary_target_min?: number;
  salary_target_max?: number;
  research_data?: any;
}

interface CompanyCardProps {
  company: Company;
  onClick?: () => void;
}

export function CompanyCard({ company, onClick }: CompanyCardProps) {
  const getStatusBadge = () => {
    if (company.research_data) {
      return <Badge variant="success">Researched</Badge>;
    }
    return <Badge variant="default">New</Badge>;
  };

  const formatSalaryRange = () => {
    if (company.salary_target_min && company.salary_target_max) {
      return `$${(company.salary_target_min / 1000).toFixed(0)}K - $${(company.salary_target_max / 1000).toFixed(0)}K`;
    }
    return null;
  };

  return (
    <Card hover onClick={onClick} className="mb-3">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-white text-base mb-1">
              {company.company_name}
            </h3>
            {company.job_title && (
              <p className="text-sm text-[#9ca3af]">{company.job_title}</p>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          {company.interview_date && (
            <div className="flex items-center text-xs text-[#9ca3af]">
              <Calendar className="w-3.5 h-3.5 mr-2" />
              <span>
                {new Date(company.interview_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {company.interviewer_name && (
            <div className="flex items-center text-xs text-[#9ca3af]">
              <User className="w-3.5 h-3.5 mr-2" />
              <span>{company.interviewer_name}</span>
            </div>
          )}

          {formatSalaryRange() && (
            <div className="flex items-center text-xs text-[#9ca3af]">
              <DollarSign className="w-3.5 h-3.5 mr-2" />
              <span>{formatSalaryRange()}</span>
            </div>
          )}
        </div>

        {company.research_data?.techStack && company.research_data.techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {company.research_data.techStack.slice(0, 3).map((tech: string, idx: number) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-[#25272a] text-[#9ca3af] rounded-md"
              >
                {tech}
              </span>
            ))}
            {company.research_data.techStack.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-[#6b7280]">
                +{company.research_data.techStack.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
