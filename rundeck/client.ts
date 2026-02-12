export interface RundeckConfig {
  rundeckUrl: string;
  apiToken: string;
  apiVersion: number;
}

export class RundeckClient {
  private baseUrl: string;
  private apiToken: string;
  private apiVersion: number;

  constructor(config: RundeckConfig) {
    this.baseUrl = config.rundeckUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiToken = config.apiToken;
    this.apiVersion = config.apiVersion;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" });
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${this.apiVersion}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Rundeck-Auth-Token": this.apiToken,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rundeck API error (${response.status}): ${errorText}`);
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }
}

export function createRundeckClient(config: RundeckConfig): RundeckClient {
  return new RundeckClient(config);
}
