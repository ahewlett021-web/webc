export interface CompanyRecord {
  company_name: string;
  company_number: string;
  company_status: string;
  company_type: string;
  company_subtype: string;
  dissolution_date: string;
  incorporation_date: string;
  removed_date: string;
  registered_date: string;
  nature_of_business: string;
  registered_office_address: string;
  [key: string]: string; // Allow additional fields
}

export interface CompanyResult extends CompanyRecord {
  website_found: 'Yes' | 'No';
  website_url: string;
  phone_number_found: 'Yes' | 'No';
  phone_numbers: string;
  search_status: string;
}

export interface ProcessorOptions {
  inputFile: string;
  outputFile: string;
  concurrency: number;
  timeout: number;
  maxRetries: number;
  delayBetweenRequests: number;
}
