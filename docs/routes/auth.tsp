import "@typespec/http";
import "../models/common.tsp";

using TypeSpec.Http;
using BackendTemplate.Models;

namespace BackendTemplate.Routes;

@route("/auth")
@tag("Authentication")
interface Auth {
  @post
  @route("/register")
  @summary("Register user")
  register(@body payload: RegisterRequest):
    ApiResponse<{ user: User }> |
    ApiErrorResponse;

  @post
  @route("/login")
  @summary("Login user")
  login(@body payload: LoginRequest):
    ApiResponse<{ user: User; accessToken: string; refreshToken: string }> |
    ApiErrorResponse;

  @get
  @route("/me")
  @summary("Get current user")
  me(): ApiResponse<{ user: User }> | ApiErrorResponse;
}
