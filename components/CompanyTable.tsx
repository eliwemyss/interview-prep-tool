'use client';

interface CompanyTableProps {
  companies: any[];
  onDelete: (id: number) => void;
}

export default function CompanyTable({ companies, onDelete }: CompanyTableProps) {
  if (companies.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No companies in your pipeline yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stage</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Next Interview</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {companies.map((company) => (
            <tr key={company.id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">{company.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{company.role || '—'}</td>
              <td className="px-6 py-4 text-sm">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  {company.stage || 'Applied'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {company.nextInterview ? new Date(company.nextInterview).toLocaleDateString() : '—'}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onDelete(company.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-semibold transition"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
