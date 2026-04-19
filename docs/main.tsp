import "@typespec/http";
import "@typespec/openapi3";
import "./models/common.tsp";
import "./routes/health.tsp";
import "./routes/auth.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Backend Template API" })
@server("http://localhost:8989/api/v1", "Development server")
namespace BackendTemplate;
