export interface RundeckProject {
  url: string;
  name: string;
  description: string;
  label: string;
}

export interface RundeckJob {
  id: string;
  name: string;
  group: string;
  project: string;
  description: string;
  href: string;
  permalink: string;
  scheduled: boolean;
  scheduleEnabled: boolean;
  enabled: boolean;
  averageDuration: number;
  serverNodeUUID?: string;
  serverOwner?: boolean;
}

export interface RundeckExecution {
  id: number;
  href: string;
  permalink: string;
  status: string;
  customStatus?: string;
  project: string;
  user: string;
  serverUUID?: string;
  "date-started": { unixtime: number; date: string };
  "date-ended"?: { unixtime: number; date: string };
  job: {
    id: string;
    name: string;
    group: string;
    project: string;
    description?: string;
    href?: string;
    permalink?: string;
    averageDuration?: number;
  };
  description: string;
  argstring?: string;
  successfulNodes?: string[];
  failedNodes?: string[];
}

export interface ExecutionsResponse {
  paging: {
    count: number;
    total: number;
    offset: number;
    max: number;
  };
  executions: RundeckExecution[];
}
