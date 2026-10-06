using Microsoft.AspNetCore.Mvc;

namespace PosBackend.Controllers;

public class WhatsAppSendRequest
{
    public string? MobileNumber { get; set; }
    public string? InvoiceId { get; set; }
    public string? Message { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class WhatsAppController : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            status = "connected",
            phone = "+91 98765 43210",
            session = "pos_terminal_session",
            battery = "100%",
            isConnected = true
        });
    }

    [HttpPost("send-receipt")]
    [HttpPost("send")]
    public IActionResult SendReceipt([FromBody] WhatsAppSendRequest req)
    {
        return Ok(new
        {
            status = "success",
            message = "Digital tax invoice receipt sent successfully via WhatsApp",
            recipient = req.MobileNumber ?? "9876543210"
        });
    }
}
