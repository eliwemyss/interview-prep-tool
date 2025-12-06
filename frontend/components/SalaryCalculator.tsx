'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Copy, DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Company } from './CompanyCard';
import clsx from 'clsx';

interface SalaryCalculatorProps {
  company: Company;
}

interface SalaryData {
  conservative: { min: number; max: number };
  target: { min: number; max: number };
  stretch: { min: number; max: number };
  equity: { min: number; max: number };
}

const roleBaseRates: Record<string, number> = {
  'Technical Support Engineer': 110000,
  'Software Engineer': 140000,
  'Senior Software Engineer': 170000,
  'Product Support Engineer': 120000,
  'Developer Advocate': 150000,
  'Staff Engineer': 190000,
  'Engineering Manager': 180000,
};

const experienceMultipliers: Record<string, number> = {
  '0-2': 0.85,
  '2-4': 1.0,
  '4-6': 1.15,
  '6-8': 1.30,
  '8-10': 1.45,
  '10+': 1.60,
};

const locationMultipliers: Record<string, number> = {
  'San Francisco': 1.0,
  'New York': 1.05,
  'Seattle': 0.95,
  'Nashville': 0.85,
  'Remote': 0.90,
  'Austin': 0.88,
  'Denver': 0.87,
  'Boston': 0.98,
};

const companySizeMultipliers: Record<string, number> = {
  'Startup (<50)': 0.9,
  'Growth (50-500)': 1.0,
  'Enterprise (500+)': 1.1,
};

export function SalaryCalculator({ company }: SalaryCalculatorProps) {
  const [role, setRole] = useState('Software Engineer');
  const [experience, setExperience] = useState(4);
  const [location, setLocation] = useState('Nashville');
  const [companySize, setCompanySize] = useState('Growth (50-500)');
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [script, setScript] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);

  const getExperienceRange = (years: number): string => {
    if (years <= 2) return '0-2';
    if (years <= 4) return '2-4';
    if (years <= 6) return '4-6';
    if (years <= 8) return '6-8';
    if (years <= 10) return '8-10';
    return '10+';
  };

  const calculateSalary = () => {
    const baseRate = roleBaseRates[role] || 140000;
    const expMultiplier = experienceMultipliers[getExperienceRange(experience)];
    const locMultiplier = locationMultipliers[location];
    const sizeMultiplier = companySizeMultipliers[companySize];

    const targetBase = Math.round(baseRate * expMultiplier * locMultiplier * sizeMultiplier);

    const conservative = {
      min: Math.round(targetBase * 0.85),
      max: Math.round(targetBase * 0.95),
    };

    const target = {
      min: Math.round(targetBase * 1.0),
      max: Math.round(targetBase * 1.15),
    };

    const stretch = {
      min: Math.round(targetBase * 1.15),
      max: Math.round(targetBase * 1.35),
    };

    const equity = {
      min: Math.round(targetBase * 0.18),
      max: Math.round(targetBase * 0.35),
    };

    setSalaryData({ conservative, target, stretch, equity });
  };

  useEffect(() => {
    calculateSalary();
  }, [role, experience, location, companySize]);

  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const chartData = salaryData
    ? [
        {
          name: 'Conservative',
          value: salaryData.conservative.max,
          color: '#6b7280',
          range: `${formatCurrency(salaryData.conservative.min)} - ${formatCurrency(salaryData.conservative.max)}`,
        },
        {
          name: 'Target',
          value: salaryData.target.max,
          color: '#FF9B42',
          range: `${formatCurrency(salaryData.target.min)} - ${formatCurrency(salaryData.target.max)}`,
        },
        {
          name: 'Stretch',
          value: salaryData.stretch.max,
          color: '#1D4AFF',
          range: `${formatCurrency(salaryData.stretch.min)} - ${formatCurrency(salaryData.stretch.max)}`,
        },
      ]
    : [];

  const generateScript = async () => {
    setLoadingScript(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/salary/script/${company.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetBase: salaryData?.target.min,
          userBackground: `${experience}+ years in technical support and engineering`,
          companyContext: company.research_data?.overview || '',
        }),
      });

      const data = await response.json();
      setScript(data.script || 'Script generation failed. Please try again.');
    } catch (error) {
      setScript('Failed to generate script. Please try again later.');
    } finally {
      setLoadingScript(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Salary Calculator</h3>
              <p className="text-sm text-[#9ca3af]">PostHog-style compensation estimator</p>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 bg-[#25272a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF9B42]"
              >
                {Object.keys(roleBaseRates).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 bg-[#25272a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF9B42]"
              >
                {Object.keys(locationMultipliers).map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Company Size</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-4 py-2 bg-[#25272a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF9B42]"
              >
                {Object.keys(companySizeMultipliers).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Years of Experience: {experience}
              </label>
              <input
                type="range"
                min="0"
                max="15"
                value={experience}
                onChange={(e) => setExperience(parseInt(e.target.value))}
                className="w-full h-2 bg-[#25272a] rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                <span>0 yrs</span>
                <span>15+ yrs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {salaryData && (
        <>
          {/* Chart */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-lg font-semibold text-white mb-4">Salary Ranges</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1e21',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h4>
              <div className="space-y-4">
                {/* Conservative */}
                <div className="p-4 bg-[#25272a] rounded-lg border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="default">Conservative</Badge>
                    <span className="text-sm text-[#9ca3af]">25-40th percentile</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(salaryData.conservative.min)} - {formatCurrency(salaryData.conservative.max)}
                  </div>
                  <p className="text-xs text-[#6b7280]">Only if desperate</p>
                </div>

                {/* Target */}
                <div className="p-4 bg-gradient-to-r from-[#FF9B42]/10 to-[#F9BD2B]/10 rounded-lg border border-[#FF9B42]/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="orange">Target ← YOU</Badge>
                    <span className="text-sm text-[#9ca3af]">50-75th percentile</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(salaryData.target.min)} - {formatCurrency(salaryData.target.max)}
                  </div>
                  <p className="text-xs text-[#9ca3af]">Aim here</p>
                </div>

                {/* Stretch */}
                <div className="p-4 bg-[#25272a] rounded-lg border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="blue">Stretch</Badge>
                    <span className="text-sm text-[#9ca3af]">75-90th percentile</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(salaryData.stretch.min)} - {formatCurrency(salaryData.stretch.max)}
                  </div>
                  <p className="text-xs text-[#6b7280]">If you have leverage</p>
                </div>

                {/* Equity */}
                <div className="p-4 bg-[#25272a] rounded-lg border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="info">Equity (per year)</Badge>
                    <span className="text-sm text-[#9ca3af]">4-year vest</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(salaryData.equity.min)} - {formatCurrency(salaryData.equity.max)}
                  </div>
                </div>
              </div>

              {/* Total Comp */}
              <div className="mt-6 p-4 bg-gradient-to-r from-[#FF9B42] to-[#F9BD2B] rounded-lg">
                <p className="text-sm text-white/80 mb-1">Total Compensation (Base + Equity)</p>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(salaryData.target.min + salaryData.equity.min)} - {formatCurrency(salaryData.target.max + salaryData.equity.max)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Negotiation Script */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">Negotiation Script</h4>
                {!script && (
                  <Button
                    variant="primary"
                    onClick={generateScript}
                    loading={loadingScript}
                    icon={<TrendingUp className="w-4 h-4" />}
                  >
                    Generate Script
                  </Button>
                )}
                {script && (
                  <Button
                    variant="ghost"
                    onClick={copyScript}
                    icon={<Copy className="w-4 h-4" />}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                )}
              </div>

              {script && (
                <div className="p-4 bg-[#25272a] rounded-lg border border-[rgba(255,255,255,0.1)]">
                  <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{script}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #FF9B42 0%, #F9BD2B 100%);
          cursor: pointer;
          border-radius: 50%;
        }

        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #FF9B42 0%, #F9BD2B 100%);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
}
