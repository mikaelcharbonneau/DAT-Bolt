export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Inspection {
  Id: string;
  UserEmail: string;
  Timestamp: string;
  ReportData: InspectionData;
}

// Alias for backward compatibility and Azure migration
export interface AuditReport extends Inspection {}

export interface InspectionData {
  datahall: string;
  status: string;
  isUrgent: boolean;
  temperatureReading: string;
  humidityReading: string;
  comments?: string;
  securityPassed: boolean;
  coolingSystemCheck: boolean;
  [key: string]: unknown;
}

export interface Report {
  Id: string;
  UserEmail: string;
  Timestamp: string;
  ReportData: InspectionData;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  location: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  resolved_at?: string;
}

export interface RackMapping {
  [datahall: string]: string[];
}