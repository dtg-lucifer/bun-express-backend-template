import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Backend Template API" })
@route("/api/v1")
namespace BackendTemplate;

model ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

model HealthMetrics {
  status: string;
  timestamp: string;
  environment: string;
  uptime: string;
}

model User {
  id: string;
  email: string;
  role: string;
}

model RegisterRequest {
  email: string;
  password: string;
  role?: string;
}

model LoginRequest {
  email: string;
  password: string;
}

model AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@route("/healthcheck")
@get
op healthcheck(): {
  @statusCode statusCode: 200;
  @body body: ApiResponse<HealthMetrics>;
};

@route("/auth/register")
@post
op register(@body payload: RegisterRequest): {
  @statusCode statusCode: 201;
  @body body: ApiResponse<{ user: User }>;
};

@route("/auth/login")
@post
op login(@body payload: LoginRequest): {
  @statusCode statusCode: 200;
  @body body: ApiResponse<{ user: User; tokens: AuthTokens }>;
};

@route("/auth/me")
@get
op me(): {
  @statusCode statusCode: 200;
  @body body: ApiResponse<{ user: User }>;
};

@route("/auth/admin-only")
@get
op adminOnly(): {
  @statusCode statusCode: 200;
  @body body: ApiResponse<{ message: string }>;
};
