import "@typespec/http";
import "../models/common.tsp";

using TypeSpec.Http;
using BackendTemplate.Models;

namespace BackendTemplate.Routes;

@route("/health")
@tag("Health")
interface Health {
  @get
  @summary("Health check")
  health(): ApiResponse<HealthMetrics> | ApiErrorResponse;
}
