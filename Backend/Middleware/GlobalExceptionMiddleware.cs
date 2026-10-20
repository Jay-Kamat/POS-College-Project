using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;

namespace PosBackend.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred during request execution: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/problem+json";

        var (statusCode, title, detail) = ex switch
        {
            InsufficientStockException stockEx => (
                (int)HttpStatusCode.Conflict,
                "Insufficient Stock",
                stockEx.Message
            ),
            UnauthorizedAccessException => (
                (int)HttpStatusCode.Forbidden,
                "Forbidden",
                "You do not possess the required permissions to perform this operation."
            ),
            KeyNotFoundException notFoundEx => (
                (int)HttpStatusCode.NotFound,
                "Resource Not Found",
                notFoundEx.Message
            ),
            InvalidOperationException invalidOp => (
                (int)HttpStatusCode.BadRequest,
                "Invalid Business Operation",
                invalidOp.Message
            ),
            ArgumentException argEx => (
                (int)HttpStatusCode.BadRequest,
                "Invalid Parameter",
                argEx.Message
            ),
            _ => (
                (int)HttpStatusCode.InternalServerError,
                "Internal Server Error",
                _env.IsDevelopment() ? ex.ToString() : "An unexpected internal server error occurred. Please contact system support."
            )
        };

        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path,
            Extensions =
            {
                ["traceId"] = context.TraceIdentifier,
                ["timestamp"] = DateTime.UtcNow
            }
        };

        var json = JsonSerializer.Serialize(problemDetails);
        await context.Response.WriteAsync(json);
    }
}
