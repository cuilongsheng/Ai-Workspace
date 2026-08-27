export interface RerankDocument {
  id: string;
  content: string;
}

export interface RerankRequest {
  query: string;
  documents: RerankDocument[];
  top_k: number;
}

export interface RerankApiResult {
  id: string;
  score: number;
}

export interface RerankApiResponse {
  results: RerankApiResult[];
}
