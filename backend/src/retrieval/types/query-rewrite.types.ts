export interface QueryRewriteOutput {
  semanticQuery: string;
  lexicalQuery: string;
  corrections?: string[];
  aliases?: string[];
}

export interface RewrittenQuery {
  originalQuery: string;
  semanticQuery: string;
  lexicalQuery: string;
  semanticQueries: string[];
  lexicalQueries: string[];
  corrections: string[];
  aliases: string[];
}
