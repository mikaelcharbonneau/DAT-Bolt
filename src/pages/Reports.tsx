import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface Report {
  id: string;
  title: string;
  generated_by: string;
  generated_at: string;
  date_range_start: string;
  date_range_end: string;
  datacenter: string;
  datahall: string;
  status: string;
  total_incidents: number;
  report_data: unknown;
}

interface Incident {
  id: string;
  location: string;
  datahall: string;
  rack_number: string;
  part_type: string;
  part_identifier: string;
  u_height?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  created_at: string;
  description: string;
  comments?: string;
}

const Reports = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportNotFound, setReportNotFound] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
    new Date()
  ]);
  const [selectedDatacenter, setSelectedDatacenter] = useState('');
  const [selectedDatahall, setSelectedDatahall] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');

  const datacenters = [
    'All Datacenters',
    'Canada - Quebec',
    'Norway - Enebakk',
    'Norway - Rjukan',
    'United States - Dallas',
    'United States - Houston'
  ];

  const datahalls = {
    'Canada - Quebec': ['All Data Halls', 'Island 1', 'Island 8', 'Island 9', 'Island 10', 'Island 11', 'Island 12', 'Green Nitrogen'],
    'Norway - Enebakk': ['All Data Halls', 'Flying Whale'],
    'Norway - Rjukan': ['All Data Halls', 'Flying Whale'],
    'United States - Dallas': ['All Data Halls', 'Island 1', 'Island 2', 'Island 3', 'Island 4'],
    'United States - Houston': ['All Data Halls', 'H20 Lab']
  };

  useEffect(() => {
    if (id) {
      fetchReportDetails(id);
    } else {
      fetchReports();
    }
  }, [id]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId: string) => {
    try {
      setLoading(true);
      setReportNotFound(false);
      
      // Fetch report details using maybeSingle() instead of single()
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

      if (reportError) throw reportError;

      if (!reportData) {
        setReportNotFound(true);
        setSelectedReport(null);
        return;
      }

      setSelectedReport(reportData);

      // Only fetch incidents if we found a report
      let query = supabase
        .from('incidents')
        .select('*')
        .gte('created_at', reportData.date_range_start)
        .lte('created_at', reportData.date_range_end);

      // Only apply location filters if specific values are selected
      if (reportData.datacenter !== 'All Datacenters') {
        query = query.eq('location', reportData.datacenter);
      }
      if (reportData.datahall !== 'All Data Halls') {
        query = query.eq('datahall', reportData.datahall);
      }

      const { data: incidentData, error: incidentError } = await query.order('created_at', { ascending: false });

      if (incidentError) throw incidentError;
      setIncidents(incidentData || []);
    } catch (error) {
      console.error('Error fetching report details:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!dateRange[0] || !dateRange[1] || !selectedDatacenter) {
      alert('Please select date range and datacenter');
      return;
    }

    try {
      setGenerating(true);

      // Build the base query
      let query = supabase
        .from('incidents')
        .select('*')
        .gte('created_at', dateRange[0].toISOString())
        .lte('created_at', dateRange[1].toISOString());

      // Only apply location filters if specific values are selected
      if (selectedDatacenter !== 'All Datacenters') {
        query = query.eq('location', selectedDatacenter);
      }
      if (selectedDatahall && selectedDatahall !== 'All Data Halls') {
        query = query.eq('datahall', selectedDatahall);
      }
      if (selectedSeverity) {
        query = query.eq('severity', selectedSeverity);
      }

      const { data: incidents, error: incidentsError } = await query;

      if (incidentsError) throw incidentsError;

      // Create title based on selected filters
      const locationPart = selectedDatacenter === 'All Datacenters' 
        ? 'All Locations' 
        : `${selectedDatacenter}${selectedDatahall && selectedDatahall !== 'All Data Halls' ? ` - ${selectedDatahall}` : ''}`;

      // Create new report
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert([{
          title: `Incident Report - ${locationPart}`,
          generated_by: user?.id,
          date_range_start: dateRange[0].toISOString(),
          date_range_end: dateRange[1].toISOString(),
          datacenter: selectedDatacenter,
          datahall: selectedDatahall,
          status: incidents?.length === 0 ? 'Healthy' : incidents?.some(i => i.severity === 'critical') ? 'Critical' : 'Warning',
          total_incidents: incidents?.length || 0,
          report_data: {
            filters: {
              severity: selectedSeverity,
              datacenter: selectedDatacenter,
              datahall: selectedDatahall
            },
            incidents: incidents
          }
        }])
        .select()
        .single();

      if (reportError) throw reportError;

      // Navigate to the new report
      navigate(`/reports/${report.id}`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (id && reportNotFound) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Reports
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Report Not Found</h2>
            <p className="text-gray-600 mb-6">The report you're looking for doesn't exist or has been deleted.</p>
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              View All Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (id && selectedReport) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Reports
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-semibold mb-2">{selectedReport.title}</h1>
                <p className="text-gray-600">
                  {format(new Date(selectedReport.generated_at), 'PPpp')}
                </p>
              </div>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download CSV
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Report Details</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Datacenter</dt>
                    <dd className="font-medium">{selectedReport.datacenter}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Data Hall</dt>
                    <dd className="font-medium">{selectedReport.datahall}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Date Range</dt>
                    <dd className="font-medium">
                      {format(new Date(selectedReport.date_range_start), 'PP')} - {format(new Date(selectedReport.date_range_end), 'PP')}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Statistics</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Total Incidents</dt>
                    <dd className="font-medium">{selectedReport.total_incidents}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="font-medium">{selectedReport.status}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <h3 className="text-lg font-medium mb-4">Incidents</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {incident.rack_number}
                        {incident.u_height && <span className="text-gray-500 ml-1">({incident.u_height})</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {incident.part_type} - {incident.part_identifier}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="max-w-md">
                          <p className="line-clamp-2">{incident.description}</p>
                          {incident.comments && (
                            <p className="text-gray-500 mt-1 line-clamp-1">{incident.comments}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          incident.severity === 'critical' 
                            ? 'bg-red-100 text-red-800'
                            : incident.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : incident.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          incident.status === 'open'
                            ? 'bg-red-100 text-red-800'
                            : incident.status === 'in-progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {incident.status.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(incident.created_at), 'PP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Reports</h1>
          <p className="text-gray-600">Generate and view incident reports</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-medium mb-6">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2">
              <DatePicker
                selected={dateRange[0]}
                onChange={(date) => setDateRange([date, dateRange[1]])}
                selectsStart
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholderText="Start Date"
              />
              <DatePicker
                selected={dateRange[1]}
                onChange={(date) => setDateRange([dateRange[0], date])}
                selectsEnd
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                minDate={dateRange[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholderText="End Date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datacenter</label>
            <select
              value={selectedDatacenter}
              onChange={(e) => {
                setSelectedDatacenter(e.target.value);
                setSelectedDatahall('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Datacenter</option>
              {datacenters.map(dc => (
                <option key={dc} value={dc}>{dc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Hall</label>
            <select
              value={selectedDatahall}
              onChange={(e) => setSelectedDatahall(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={!selectedDatacenter || selectedDatacenter === 'All Datacenters'}
            >
              <option value="">
                {selectedDatacenter === 'All Datacenters' ? 'All Data Halls' : 'Select Data Hall'}
              </option>
              {selectedDatacenter && selectedDatacenter !== 'All Datacenters' && 
                datahalls[selectedDatacenter as keyof typeof datahalls]?.map(hall => (
                  <option key={hall} value={hall}>{hall}</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={generating || !dateRange[0] || !dateRange[1] || !selectedDatacenter}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium mb-6">Recent Reports</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {reports && reports.length > 0 ? (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <div 
                  className="relative h-48 bg-cover bg-center"
                  style={{ 
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg)`,
                  }}
                >
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="text-xl font-medium text-white mb-2">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-200">{report.datacenter} - {report.datahall}</p>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Issues: {report.total_incidents}</span>
                    <span>{format(new Date(report.generated_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No reports found. Generate a new report to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;