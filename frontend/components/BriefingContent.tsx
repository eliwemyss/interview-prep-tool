'use client';

import { useState } from 'react';

interface Briefing {
  executiveSummary?: string;
  keyTalkingPoints?: string[];
  topChallenges?: string[];
  cultureInsights?: string;
  smartQuestions?: string[];
  salaryExpectations?: any;
  redFlags?: string[];
  prepChecklist?: string[];
}

interface BriefingContentProps {
  briefing: Briefing;
}

export default function BriefingContent({ briefing }: BriefingContentProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleCheck = (idx: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(idx)) {
      newChecked.delete(idx);
    } else {
      newChecked.add(idx);
    }
    setCheckedItems(newChecked);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {briefing.executiveSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">📋 Executive Summary</h2>
          <p className="text-gray-700 leading-relaxed">{briefing.executiveSummary}</p>
        </div>
      )}

      {/* Key Talking Points */}
      {briefing.keyTalkingPoints && briefing.keyTalkingPoints.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">💬 Key Talking Points</h2>
          <ul className="space-y-2">
            {briefing.keyTalkingPoints.map((point, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Challenges */}
      {briefing.topChallenges && briefing.topChallenges.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Top Challenges</h2>
          <ul className="space-y-2">
            {briefing.topChallenges.map((challenge, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <span className="text-orange-600 font-bold">•</span>
                <span className="text-gray-700">{challenge}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Culture Insights */}
      {briefing.cultureInsights && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🏢 Culture Insights</h2>
          <p className="text-gray-700 leading-relaxed">{briefing.cultureInsights}</p>
        </div>
      )}

      {/* Smart Questions */}
      {briefing.smartQuestions && briefing.smartQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">❓ Smart Questions to Ask</h2>
          <ul className="space-y-3">
            {briefing.smartQuestions.map((question, idx) => (
              <li key={idx} className="text-gray-700 italic">
                "{question}"
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Salary Expectations */}
      {briefing.salaryExpectations && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Salary Expectations</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {briefing.salaryExpectations.averageSalary && (
              <div>
                <p className="text-sm text-gray-600">Average Salary</p>
                <p className="text-2xl font-bold text-green-700">
                  ${briefing.salaryExpectations.averageSalary.toLocaleString()}
                </p>
              </div>
            )}
            {briefing.salaryExpectations.min && briefing.salaryExpectations.max && (
              <div>
                <p className="text-sm text-gray-600">Range</p>
                <p className="text-lg font-bold text-green-700">
                  ${briefing.salaryExpectations.min.toLocaleString()} - ${briefing.salaryExpectations.max.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Red Flags */}
      {briefing.redFlags && briefing.redFlags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🚩 Red Flags to Watch</h2>
          <ul className="space-y-2">
            {briefing.redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <span className="text-red-600 font-bold">!</span>
                <span className="text-gray-700">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prep Checklist */}
      {briefing.prepChecklist && briefing.prepChecklist.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">✅ Pre-Interview Checklist</h2>
          <div className="space-y-3">
            {briefing.prepChecklist.map((item, idx) => (
              <label key={idx} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={checkedItems.has(idx)}
                  onChange={() => toggleCheck(idx)}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span
                  className={`flex-1 ${
                    checkedItems.has(idx)
                      ? 'line-through text-gray-400'
                      : 'text-gray-700'
                  }`}
                >
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
        >
          🖨️ Print Briefing
        </button>
      </div>
    </div>
  );
}
