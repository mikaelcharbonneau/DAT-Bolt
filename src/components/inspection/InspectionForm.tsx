/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Server } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { rackLocations } from '../../utils/rackLocations';

interface InspectionFormProps {
  selectedLocation: string;
  selectedDataHall: string;
}

interface RackForm {
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
}

const psuStatusOptions = ['Healthy', 'Amber LED', 'Powered-Off', 'Other'];
const psuIdOptions = ['PSU 1', 'PSU 2', 'PSU 3', 'PSU 4', 'PSU 5', 'PSU 6'];
const uHeightOptions = Array.from({ length: 49 }, (_, i) => `U${i}`);

export const InspectionForm = ({ selectedLocation, selectedDataHall }: InspectionFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasIssues, setHasIssues] = useState<boolean | null>(null);
  const [racks, setRacks] = useState<RackForm[]>([]);
  const [expandedRacks, setExpandedRacks] = useState<string[]>([]);

  const availableRacks = selectedDataHall ? rackLocations[selectedDataHall] || [] : [];

  const toggleRackExpansion = (rackId: string) => {
    setExpandedRacks(prev => 
      prev.includes(rackId) 
        ? prev.filter(id => id !== rackId)
        : [...prev, rackId]
    );
  };

  const handleYesIssuesClick = () => {
    setHasIssues(true);
    const newRack: RackForm = {
      id: `rack-${Date.now()}`,
      location: '',
      devices: {
        powerSupplyUnit: false,
        powerDistributionUnit: false,
        rearDoorHeatExchanger: false
      }
    };
    setRacks([newRack]);
    setExpandedRacks([newRack.id]);
  };

  const updateRack = (rackId: string, updates: Partial<RackForm>) => {
    setRacks(racks.map(rack => 
      rack.id === rackId ? { ...rack, ...updates } : rack
    ));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('AuditReports')
        .insert([{
          UserEmail: 'user@example.com',
          ReportData: {
            location: selectedLocation,
            datahall: selectedDataHall,
            hasIssues,
            racks,
            timestamp: new Date().toISOString()
          }
        }])
        .select();

      if (error) throw error;
      
      navigate('/confirmation', { 
        state: { 
          inspectionId: data?.[0]?.Id,
          success: true 
        } 
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error submitting inspection:', err);
      navigate('/confirmation', {
        state: {
          success: false,
          error: err.message
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium mb-4">
        Have you discovered any issues during the walkthrough?
      </h2>
      <div className="flex gap-4">
        <button
          onClick={handleYesIssuesClick}
          className="px-6 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Yes, I found issues
        </button>
        <button
          onClick={() => setHasIssues(false)}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
        >
          No issues found
        </button>
      </div>

      {hasIssues === true && (
        <>
          {racks.map((rack, index) => (
            <div
              key={rack.id}
              className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden"
            >
              <button
                onClick={() => toggleRackExpansion(rack.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Server size={20} className="text-gray-500" />
                  <span className="font-medium">Issue #{index + 1}</span>
                </div>
                {expandedRacks.includes(rack.id) ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>

              {expandedRacks.includes(rack.id) && (
                <div className="p-6 border-t border-gray-100">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tile Location
                      </label>
                      <select
                        value={rack.location}
                        onChange={(e) => updateRack(rack.id, { location: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select tile location</option>
                        {availableRacks.map(rackId => (
                          <option key={rackId} value={rackId}>{rackId}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Impacted Device(s)
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={rack.devices.powerSupplyUnit}
                            onChange={(e) => updateRack(rack.id, {
                              devices: { ...rack.devices, powerSupplyUnit: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="group-hover:text-emerald-600">Power Supply Unit</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={rack.devices.powerDistributionUnit}
                            onChange={(e) => updateRack(rack.id, {
                              devices: { ...rack.devices, powerDistributionUnit: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="group-hover:text-emerald-600">Power Distribution Unit</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={rack.devices.rearDoorHeatExchanger}
                            onChange={(e) => updateRack(rack.id, {
                              devices: { ...rack.devices, rearDoorHeatExchanger: e.target.checked }
                            })}
                            className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="group-hover:text-emerald-600">Rear Door Heat Exchanger</span>
                        </label>
                      </div>
                    </div>

                    {rack.devices.powerSupplyUnit && (
                      <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-lg font-medium mb-4">Power Supply Unit</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Issue Description
                            </label>
                            <select
                              value={rack.psuDetails?.status || ''}
                              onChange={(e) => updateRack(rack.id, {
                                psuDetails: { ...rack.psuDetails, status: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              <option value="">Select PSU status</option>
                              {psuStatusOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              PSU ID
                            </label>
                            <select
                              value={rack.psuDetails?.psuId || ''}
                              onChange={(e) => updateRack(rack.id, {
                                psuDetails: { ...rack.psuDetails, psuId: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              <option value="">Select PSU</option>
                              {psuIdOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Device U-Height
                            </label>
                            <select
                              value={rack.psuDetails?.uHeight || ''}
                              onChange={(e) => updateRack(rack.id, {
                                psuDetails: { ...rack.psuDetails, uHeight: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              <option value="">Select U-Height</option>
                              {uHeightOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Additional Comments (Optional)
                            </label>
                            <textarea
                              value={rack.psuDetails?.comments || ''}
                              onChange={(e) => updateRack(rack.id, {
                                psuDetails: { ...rack.psuDetails, comments: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px] resize-none"
                              placeholder="Add any additional comments"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => {
              const newRack: RackForm = {
                id: `rack-${Date.now()}`,
                location: '',
                devices: {
                  powerSupplyUnit: false,
                  powerDistributionUnit: false,
                  rearDoorHeatExchanger: false
                }
              };
              setRacks([...racks, newRack]);
              setExpandedRacks([...expandedRacks, newRack.id]);
            }}
            className="w-full py-3 text-emerald-600 border border-emerald-200 rounded-md hover:bg-emerald-50 hover:border-emerald-300 transition-colors mb-8"
          >
            Add Incident
          </button>

          <div className="flex items-center justify-end gap-4 sticky bottom-0 bg-white p-4 border-t border-gray-100 -mx-6">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || racks.length === 0}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Complete Walkthrough'}
            </button>
          </div>
        </>
      )}

      {hasIssues === false && (
        <div className="flex items-center justify-end gap-4 sticky bottom-0 bg-white p-4 border-t border-gray-100 -mx-6">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Complete Walkthrough'}
          </button>
        </div>
      )}
    </div>
  );
};