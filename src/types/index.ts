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

export interface RackMapping {
  [datahall: string]: string[];
}