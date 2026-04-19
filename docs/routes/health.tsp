import "@typespec/http";
import "../models/common.tsp";

using TypeSpec.Http;
using BackendTemplate.Models;

namespace BackendTemplate.Routes;

@route("/healthcheck")
@tag("Health")
interface Health {
  @get
  @summary("Health check")
  healthcheck(): ApiResponse<HealthMetrics> | ApiErrorResponse;
}
