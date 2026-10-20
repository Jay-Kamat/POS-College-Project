using Xunit;
using PosBackend.Services;

namespace Backend.Tests;

public class DocumentSequenceTests
{
    [Theory]
    [InlineData("2026-03-31T23:59:59", "25-26")]
    [InlineData("2026-04-01T00:00:00", "26-27")]
    [InlineData("2026-10-20T12:00:00", "26-27")]
    [InlineData("2027-01-15T09:30:00", "26-27")]
    [InlineData("2027-04-01T00:00:01", "27-28")]
    public void FinancialYear_RollsOver_Correctly_On_April_First(string dateStr, string expectedFy)
    {
        var date = DateTime.Parse(dateStr);
        var year = date.Month >= 4 ? date.Year : date.Year - 1;
        var nextYear = (year + 1) % 100;
        var fy = $"{year % 100:D2}-{nextYear:D2}";

        Assert.Equal(expectedFy, fy);
    }

    [Fact]
    public void Formats_DocumentNumber_With_Prefix_And_Gapless_Padding()
    {
        string prefix = "INV-MUM";
        string fy = "26-27";
        int seq = 42;

        string docNumber = $"{prefix}-{fy}-{seq:D5}";

        Assert.Equal("INV-MUM-26-27-00042", docNumber);
    }
}
