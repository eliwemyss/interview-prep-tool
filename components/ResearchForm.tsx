'use client';

import { useState } from 'react';

interface ResearchFormProps {
  onSubmit: (data: {
    companyName: string;
    companyUrl?: string;
    role: string;
    deepMode: boolean;
  }) => void;
  isLoading: boolean;
}

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyUrl: '',
    role: '',
    deepMode: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.companyName.trim() && formData.role.trim()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) =>
            setFormData({ ...formData, companyName: e.target.value })
          }
          placeholder="e.g., Google, Stripe"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Company Website (Optional)
        </label>
        <input
          type="url"
          value={formData.companyUrl}
          onChange={(e) =>
            setFormData({ ...formData, companyUrl: e.target.value })
          }
          placeholder="https://google.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Role *
        </label>
        <input
          type="text"
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value })
          }
          placeholder="e.g., Senior Engineer, Product Manager"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isLoading}
        />
      </div>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.deepMode}
          onChange={(e) =>
            setFormData({ ...formData, deepMode: e.target.checked })
          }
          className="rounded border-gray-300"
          disabled={isLoading}
        />
        <span className="text-sm text-gray-700">Deep research mode (salary, reviews, interview Qs)</span>
      </label>

      <button
        type="submit"
        disabled={isLoading || !formData.companyName.trim() || !formData.role.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Researching...' : 'Research Company'}
      </button>
    </form>
  );
}
