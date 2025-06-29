import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { supabase } from "../db";

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  // Set CORS headers
  context.res = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    }
  };
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    context.res.status = 200;
    context.res.body = {};
    return;
  }

  try {
    const { data, error } = await supabase
      .from('AuditReports')
      .select('*')
      .order('Timestamp', { ascending: false })
      .limit(50);
    
    if (error) {
      context.res.status = 500;
      context.res.body = { 
        success: false, 
        message: error.message 
      };
      return;
    }
    
    context.res.status = 200;
    context.res.body = data || [];
  } catch (error: any) {
    context.log.error('Error fetching inspections:', error);
    context.res.status = 500;
    context.res.body = { 
      success: false, 
      message: error?.message || 'An unexpected error occurred while fetching inspections'
    };
  }
};

export default httpTrigger;