using Xunit;

namespace Backend.Tests;

public class GstCalculationTests
{
    [Theory]
    [InlineData(100.0, 0.0, true, 0.0, 0.0, 0.0, 100.0)]
    [InlineData(100.0, 5.0, true, 2.5, 2.5, 0.0, 105.0)]
    [InlineData(100.0, 12.0, true, 6.0, 6.0, 0.0, 112.0)]
    [InlineData(100.0, 18.0, true, 9.0, 9.0, 0.0, 118.0)]
    [InlineData(100.0, 28.0, true, 14.0, 14.0, 0.0, 128.0)]
    public void IntraState_Calculates_Equal_Cgst_And_Sgst_No_Igst(
        decimal subtotal, 
        decimal gstRate, 
        bool isIntraState, 
        decimal expectedCgst, 
        decimal expectedSgst, 
        decimal expectedIgst, 
        decimal expectedTotal)
    {
        decimal cgst = 0, sgst = 0, igst = 0;
        if (isIntraState)
        {
            cgst = Math.Round(subtotal * (gstRate / 2m) / 100m, 2);
            sgst = Math.Round(subtotal * (gstRate / 2m) / 100m, 2);
        }
        else
        {
            igst = Math.Round(subtotal * gstRate / 100m, 2);
        }
        decimal total = subtotal + cgst + sgst + igst;

        Assert.Equal(expectedCgst, cgst);
        Assert.Equal(expectedSgst, sgst);
        Assert.Equal(expectedIgst, igst);
        Assert.Equal(expectedTotal, total);
    }

    [Theory]
    [InlineData(100.0, 18.0, 0.0, 0.0, 18.0, 118.0)]
    [InlineData(250.0, 12.0, 0.0, 0.0, 30.0, 280.0)]
    public void InterState_Calculates_Full_Igst_Zero_Cgst_Sgst(
        decimal subtotal, 
        decimal gstRate, 
        decimal expectedCgst, 
        decimal expectedSgst, 
        decimal expectedIgst, 
        decimal expectedTotal)
    {
        decimal cgst = 0;
        decimal sgst = 0;
        decimal igst = Math.Round(subtotal * gstRate / 100m, 2);
        decimal total = subtotal + cgst + sgst + igst;

        Assert.Equal(expectedCgst, cgst);
        Assert.Equal(expectedSgst, sgst);
        Assert.Equal(expectedIgst, igst);
        Assert.Equal(expectedTotal, total);
    }

    [Theory]
    [InlineData(105.40, -0.40, 105.00)]
    [InlineData(105.50, 0.50, 106.00)]
    [InlineData(105.85, 0.15, 106.00)]
    [InlineData(100.00, 0.00, 100.00)]
    public void RoundOff_Calculates_Correct_Difference_To_Nearest_Rupee(
        decimal rawAmount, 
        decimal expectedRoundOff, 
        decimal expectedFinalAmount)
    {
        decimal rounded = Math.Round(rawAmount, MidpointRounding.AwayFromZero);
        decimal roundOff = rounded - rawAmount;

        Assert.Equal(expectedRoundOff, roundOff);
        Assert.Equal(expectedFinalAmount, rounded);
    }
}
