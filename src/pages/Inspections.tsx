import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface Inspection {
  Id: string;
  GeneratedBy: string;
  Timestamp: string;
  datacenter: string;
  datahall: string;
  issues_reported: number;
  state: string;
  walkthrough_id: number;
  user_full_name: string;
  ReportData: {
    comments?: string;
    [key: string]: unknown;
  };
}

const Inspections = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedDatacenter, setSelectedDatacenter] = useState('');
  const [selectedDatahall, setSelectedDatahall] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const datacenters = [
    'Canada - Quebec',
    'Norway - Enebakk',
    'Norway - Rjukan',
    'United States - Dallas',
    'United States - Houston'
  ];

  const datahalls = {
    'Canada - Quebec': ['Island 1', 'Island 8', 'Island 9', 'Island 10', 'Island 11', 'Island 12', 'Green Nitrogen'],
    'Norway - Enebakk': ['Flying Whale'],
    'Norway - Rjukan': ['Flying Whale'],
    'United States - Dallas': ['Island 1', 'Island 2', 'Island 3', 'Island 4'],
    'United States - Houston': ['H20 Lab']
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('AuditReports')
        .select('*')
        .order('Timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (inspection: Inspection) => {
    // Search term filter
    if (searchTerm && !inspection.datacenter?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !inspection.datahall?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !inspection.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Date range filter
    if (dateRange[0] && dateRange[1]) {
      const inspectionDate = new Date(inspection.Timestamp);
      if (inspectionDate < dateRange[0] || inspectionDate > dateRange[1]) {
        return false;
      }
    }

    // Datacenter filter
    if (selectedDatacenter && inspection.datacenter !== selectedDatacenter) {
      return false;
    }

    // Data hall filter
    if (selectedDatahall && inspection.datahall !== selectedDatahall) {
      return false;
    }

    // Technician filter
    if (selectedTechnician && inspection.user_full_name !== selectedTechnician) {
      return false;
    }

    // State filter
    if (selectedState && inspection.state !== selectedState) {
      return false;
    }

    return true;
  };

  const filteredInspections = inspections.filter(applyFilters);

  const uniqueTechnicians = Array.from(new Set(inspections.map(i => i.user_full_name))).filter(Boolean);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Recent Audits</h1>
          <p className="text-gray-600">View and manage datacenter audits</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search audits"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2"
            >
              <option value="">All States</option>
              <option value="Healthy">Healthy</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>

            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
              >
                <Filter className="w-5 h-5" />
                More Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {showFilters && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg p-4 z-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <div className="flex gap-2">
                        <DatePicker
                          selected={dateRange[0]}
                          onChange={(date) => setDateRange([date, dateRange[1]])}
                          selectsStart
                          startDate={dateRange[0]}
                          endDate={dateRange[1]}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-md"
                          placeholderText="Start Date"
                        />
                        <DatePicker
                          selected={dateRange[1]}
                          onChange={(date) => setDateRange([dateRange[0], date])}
                          selectsEnd
                          startDate={dateRange[0]}
                          endDate={dateRange[1]}
                          minDate={dateRange[0]}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-md"
                          placeholderText="End Date"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Datacenter</label>
                      <select
                        value={selectedDatacenter}
                        onChange={(e) => {
                          setSelectedDatacenter(e.target.value);
                          setSelectedDatahall('');
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md"
                      >
                        <option value="">All Datacenters</option>
                        {datacenters.map(dc => (
                          <option key={dc} value={dc}>{dc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Hall</label>
                      <select
                        value={selectedDatahall}
                        onChange={(e) => setSelectedDatahall(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md"
                        disabled={!selectedDatacenter}
                      >
                        <option value="">All Data Halls</option>
                        {selectedDatacenter && datahalls[selectedDatacenter as keyof typeof datahalls].map(hall => (
                          <option key={hall} value={hall}>{hall}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                      <select
                        value={selectedTechnician}
                        onChange={(e) => setSelectedTechnician(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md"
                      >
                        <option value="">All Technicians</option>
                        {uniqueTechnicians.map(tech => (
                          <option key={tech} value={tech}>{tech}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setDateRange([null, null]);
                          setSelectedDatacenter('');
                          setSelectedDatahall('');
                          setSelectedTechnician('');
                          setSelectedState('');
                          setShowFilters(false);
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Datacenter</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data Hall</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Issues Reported</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Walkthrough ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading audits...
                  </td>
                </tr>
              ) : filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No audits found
                  </td>
                </tr>
              ) : (
                filteredInspections.map((inspection) => (
                  <tr 
                    key={inspection.Id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/inspections/${inspection.Id}`)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">{inspection.datacenter}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{inspection.datahall}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{inspection.issues_reported}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        inspection.issues_reported === 0 
                          ? 'bg-green-100 text-green-800'
                          : inspection.state === 'Critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inspection.issues_reported === 0 ? 'Healthy' : inspection.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">#{inspection.walkthrough_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{inspection.user_full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{format(new Date(inspection.Timestamp), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inspection.ReportData?.comments || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inspections;