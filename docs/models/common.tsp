import "@typespec/http";

using TypeSpec.Http;

namespace BackendTemplate.Models;

model ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: int32;
  requestId?: string;
}

model ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  statusCode: int32;
  requestId?: string;
}

model HealthMetrics {
  status: "healthy" | "unhealthy";
  timestamp: string;
  environment: string;
  uptime?: {
    milliseconds: int64;
    formatted: string;
    startedAt: string;
  };
  memory?: {
    used: int32;
    total: int32;
    unit: "MB";
  };
  services?: {
    database: "connected" | "error" | "unknown";
  };
  ping?: {
    database: int32 | "error" | "unknown";
    server: int32;
    unit: "ms";
  };
}

model User {
  id: string;
  email: string;
}

model RegisterRequest {
  email: string;
  password: string;
}

model LoginRequest {
  email: string;
  password: string;
}

model AuthTokens {
  accessToken: string;
  refreshToken: string;
}
