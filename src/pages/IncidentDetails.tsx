import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, MapPin, Server, PenTool as Tool } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

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
  updated_at: string;
  description: string;
  comments?: string;
  user_id: string;
  walkthrough_id: number;
}

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidentDetails();
  }, [id]);

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setIncident(data);
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching incident details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatIncidentId = (incident: Incident) => {
    const walkthrough = `A${incident.walkthrough_id}`;
    const rack = incident.rack_number.replace(/[^0-9]/g, '');
    const partId = incident.part_identifier.replace(/\s+/g, '').toUpperCase();
    return `${walkthrough}-${rack}-${partId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Failed to load incident details'}
          </p>
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center text-emerald-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Incidents
        </button>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className={`w-6 h-6 ${
                    incident.severity === 'critical' ? 'text-red-500' :
                    incident.severity === 'high' ? 'text-orange-500' :
                    incident.severity === 'medium' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  <h1 className="text-2xl font-semibold">Incident {formatIncidentId(incident)}</h1>
                </div>
                <div className="flex items-center text-gray-600 gap-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {format(new Date(incident.created_at), 'PPpp')}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {incident.location}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(incident.severity)}`}>
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(incident.status)}`}>
                  {incident.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-lg font-medium mb-4">Location Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Data Hall</label>
                    <p className="font-medium">{incident.datahall}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Rack Number</label>
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-gray-400" />
                      <p className="font-medium">{incident.rack_number}</p>
                    </div>
                  </div>
                  {incident.u_height && (
                    <div>
                      <label className="text-sm text-gray-500">U-Height</label>
                      <p className="font-medium">{incident.u_height}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-4">Component Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Part Type</label>
                    <div className="flex items-center gap-2">
                      <Tool className="w-5 h-5 text-gray-400" />
                      <p className="font-medium">{incident.part_type}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Part Identifier</label>
                    <p className="font-medium">{incident.part_identifier}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
              </div>

              {incident.comments && (
                <div>
                  <h2 className="text-lg font-medium mb-4">Additional Comments</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{incident.comments}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;