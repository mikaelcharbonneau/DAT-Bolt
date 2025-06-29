import { useState } from 'react';
import { Search } from 'lucide-react';

const issueTypes = [
  { id: 'hardware', label: 'Hardware' },
  { id: 'cooling', label: 'Cooling' },
  { id: 'power', label: 'Power' },
  { id: 'network', label: 'Network' },
];

const locations = [
  { id: 'dc-a', label: 'Data Center A' },
  { id: 'dc-b', label: 'Data Center B' },
  { id: 'dc-c', label: 'Data Center C' },
];

interface ReportFiltersProps {
  onFilterChange: (filters: Record<string, unknown>) => void;
}

const ReportFilters = ({ onFilterChange }: ReportFiltersProps) => {
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    updateFilters({ searchText: e.target.value });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocation(e.target.value);
    updateFilters({ location: e.target.value });
  };

  const toggleIssueType = (typeId: string) => {
    const newSelection = selectedIssueTypes.includes(typeId)
      ? selectedIssueTypes.filter(id => id !== typeId)
      : [...selectedIssueTypes, typeId];
    
    setSelectedIssueTypes(newSelection);
    updateFilters({ issueTypes: newSelection });
  };

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeverity(e.target.value);
    updateFilters({ severity: e.target.value });
  };

  const updateFilters = (newFilters: Record<string, unknown>) => {
    onFilterChange({
      searchText,
      location: selectedLocation,
      issueTypes: selectedIssueTypes,
      severity,
      ...newFilters,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search reports"
            value={searchText}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hpe-green-300 focus:border-hpe-green-300 bg-white"
          />
        </div>

        {/* Location Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedLocation}
            onChange={handleLocationChange}
            className="block w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-hpe-green-300 focus:border-hpe-green-300 bg-white"
          >
            <option value="">All Locations</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="w-full md:w-48">
          <select
            value={severity}
            onChange={handleSeverityChange}
            className="block w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-hpe-green-300 focus:border-hpe-green-300 bg-white"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Issue Type Chips */}
      <div className="flex flex-wrap gap-2">
        {issueTypes.map(type => (
          <button
            key={type.id}
            onClick={() => toggleIssueType(type.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedIssueTypes.includes(type.id)
                ? 'bg-hpe-green-500 text-white'
                : 'bg-white text-hpe-blue-600 hover:bg-gray-50'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReportFilters;