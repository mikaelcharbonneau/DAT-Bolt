import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, User, MapPin, Building, Download } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

interface AuditReport {
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
    racks?: {
      id: string;
      location: string;
      devices: {
        powerSupplyUnit: boolean;
        powerDistributionUnit: boolean;
        rearDoorHeatExchanger: boolean;
      };
      psuDetails?: {
        status: string;
        psuId: string;
        uHeight: string;
        comments?: string;
      };
      pduDetails?: {
        status: string;
        pduId: string;
        comments?: string;
      };
      rdhxDetails?: {
        status: string;
        comments?: string;
      };
    }[];
    hasIssues: boolean;
    comments?: string;
  };
}

const AuditDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('AuditReports')
        .select('*')
        .eq('Id', id)
        .single();

      if (error) throw error;
      setAudit(data);
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching audit details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuditDetails();
  }, [fetchAuditDetails]);

  const downloadCSV = () => {
    if (!audit?.ReportData?.racks) return;

    const headers = [
      'Rack Location',
      'Device Type',
      'Status',
      'Device ID',
      'U-Height',
      'Comments'
    ];

    const rows = audit.ReportData.racks.flatMap(rack => {
      const rows = [];

      if (rack.devices.powerSupplyUnit && rack.psuDetails) {
        rows.push([
          rack.location,
          'Power Supply Unit',
          rack.psuDetails.status,
          rack.psuDetails.psuId,
          rack.psuDetails.uHeight,
          rack.psuDetails.comments || ''
        ]);
      }

      if (rack.devices.powerDistributionUnit && rack.pduDetails) {
        rows.push([
          rack.location,
          'Power Distribution Unit',
          rack.pduDetails.status,
          rack.pduDetails.pduId,
          'N/A',
          rack.pduDetails.comments || ''
        ]);
      }

      if (rack.devices.rearDoorHeatExchanger && rack.rdhxDetails) {
        rows.push([
          rack.location,
          'Rear Door Heat Exchanger',
          rack.rdhxDetails.status,
          'RDHX',
          'N/A',
          rack.rdhxDetails.comments || ''
        ]);
      }

      return rows;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_${audit.walkthrough_id}_details.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Failed to load audit details'}
          </p>
          <button
            onClick={() => navigate('/inspections')}
            className="flex items-center text-emerald-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Audits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/inspections')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Audits
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-2">
                Audit #{audit.walkthrough_id}
              </h1>
              <div className="flex items-center text-gray-600 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                {format(new Date(audit.Timestamp), 'PPpp')}
              </div>
              <div className="flex items-center text-gray-600">
                <User className="w-4 h-4 mr-2" />
                {audit.user_full_name}
              </div>
            </div>
            <div className="flex gap-4">
              {audit.ReportData.racks && audit.ReportData.racks.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                >
                  <Download className="w-5 h-5" />
                  Download CSV
                </button>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                audit.issues_reported === 0 
                  ? 'bg-green-100 text-green-800'
                  : audit.state === 'Critical'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}>
                {audit.issues_reported === 0 ? 'Healthy' : audit.state}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center mb-4">
                  <Building className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Datacenter</p>
                    <p className="font-medium">{audit.datacenter}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Data Hall</p>
                    <p className="font-medium">{audit.datahall}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Issues Reported</p>
                    <p className="font-medium">{audit.issues_reported}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">{audit.ReportData.hasIssues ? 'Issues Found' : 'No Issues'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issues Section */}
        {audit.ReportData.hasIssues && audit.ReportData.racks && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Reported Issues</h2>
            <div className="space-y-6">
              {audit.ReportData.racks.map((rack) => (
                <div key={rack.id} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">
                    Rack Location: {rack.location}
                  </h3>

                  {rack.devices.powerSupplyUnit && rack.psuDetails && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Power Supply Unit Issue</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium">{rack.psuDetails.status}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">PSU ID</p>
                          <p className="font-medium">{rack.psuDetails.psuId}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">U-Height</p>
                          <p className="font-medium">{rack.psuDetails.uHeight}</p>
                        </div>
                        {rack.psuDetails.comments && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Comments</p>
                            <p className="font-medium">{rack.psuDetails.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {rack.devices.powerDistributionUnit && rack.pduDetails && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Power Distribution Unit Issue</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium">{rack.pduDetails.status}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">PDU ID</p>
                          <p className="font-medium">{rack.pduDetails.pduId}</p>
                        </div>
                        {rack.pduDetails.comments && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Comments</p>
                            <p className="font-medium">{rack.pduDetails.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {rack.devices.rearDoorHeatExchanger && rack.rdhxDetails && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Rear Door Heat Exchanger Issue</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium">{rack.rdhxDetails.status}</p>
                        </div>
                        {rack.rdhxDetails.comments && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Comments</p>
                            <p className="font-medium">{rack.rdhxDetails.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Comments */}
        {audit.ReportData.comments && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Additional Comments</h2>
            <p className="text-gray-600">{audit.ReportData.comments}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditDetails;