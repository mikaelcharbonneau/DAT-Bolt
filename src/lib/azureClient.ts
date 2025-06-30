import { AuditReport, Incident, Report, User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

class AzureClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_AZURE_FUNCTIONS_URL as string || 'https://func-dat-bolt-v2-dev-xxx.azurewebsites.net';
    this.token = localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Authentication methods
  async signIn(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
    }

    return response;
  }

  async signUp(email: string, password: string, fullName: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
  }

  async signOut(): Promise<void> {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // Inspection methods
  async getInspections(filters?: {
    status?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ inspections: AuditReport[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/GetInspections${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{ inspections: AuditReport[]; total: number }>(endpoint);
  }

  async getInspectionById(id: string): Promise<ApiResponse<AuditReport>> {
    return this.request<AuditReport>(`/GetInspections/${id}`);
  }

  async submitInspection(inspection: Omit<AuditReport, 'id' | 'created_at'>): Promise<ApiResponse<AuditReport>> {
    return this.request<AuditReport>('/SubmitInspection', {
      method: 'POST',
      body: JSON.stringify(inspection),
    });
  }

  async updateInspection(id: string, updates: Partial<AuditReport>): Promise<ApiResponse<AuditReport>> {
    return this.request<AuditReport>(`/SubmitInspection/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Reports methods
  async generateReport(params: {
    type: 'summary' | 'detailed' | 'compliance';
    dateFrom?: string;
    dateTo?: string;
    locations?: string[];
    status?: string[];
  }): Promise<ApiResponse<Report>> {
    return this.request<Report>('/GenerateReport', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getReports(filters?: {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ reports: Report[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/GetReports${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{ reports: Report[]; total: number }>(endpoint);
  }

  // Incidents methods
  async getIncidents(filters?: {
    severity?: string;
    status?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ incidents: Incident[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/GetIncidents${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{ incidents: Incident[]; total: number }>(endpoint);
  }

  async createIncident(incident: Omit<Incident, 'id' | 'created_at'>): Promise<ApiResponse<Incident>> {
    return this.request<Incident>('/CreateIncident', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async updateIncident(id: string, updates: Partial<Incident>): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/UpdateIncident/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Health check
  async testConnection(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/TestConnection');
  }
}

export const azureClient = new AzureClient();
export default azureClient;