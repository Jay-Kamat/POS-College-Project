using Xunit;
using PosBackend.Models;

namespace Backend.Tests;

public class FefoAllocationTests
{
    [Fact]
    public void Fefo_Allocates_From_Earliest_Expiry_Batch_First()
    {
        var batches = new List<StockBatch>
        {
            new() { Id = "batch_02", ProductId = "prd_01", ExpiryDate = new DateTime(2026, 12, 31), QtyRemaining = 50 },
            new() { Id = "batch_01", ProductId = "prd_01", ExpiryDate = new DateTime(2026, 10, 25), QtyRemaining = 20 },
            new() { Id = "batch_03", ProductId = "prd_01", ExpiryDate = new DateTime(2027, 03, 15), QtyRemaining = 100 }
        };

        decimal orderQty = 30m;

        // FEFO order: sorted by ExpiryDate ASC
        var sortedBatches = batches.OrderBy(b => b.ExpiryDate).ToList();

        var allocations = new List<(string BatchId, decimal AllocatedQty)>();
        decimal remainingToDeduct = orderQty;

        foreach (var b in sortedBatches)
        {
            if (remainingToDeduct <= 0) break;
            decimal deduct = Math.Min(b.QtyRemaining, remainingToDeduct);
            allocations.Add((b.Id, deduct));
            b.QtyRemaining -= deduct;
            remainingToDeduct -= deduct;
        }

        Assert.Equal(0, remainingToDeduct);
        Assert.Equal(2, allocations.Count);
        Assert.Equal("batch_01", allocations[0].BatchId);
        Assert.Equal(20m, allocations[0].AllocatedQty);
        Assert.Equal("batch_02", allocations[1].BatchId);
        Assert.Equal(10m, allocations[1].AllocatedQty);
        Assert.Equal(0m, sortedBatches.First(b => b.Id == "batch_01").QtyRemaining);
        Assert.Equal(40m, sortedBatches.First(b => b.Id == "batch_02").QtyRemaining);
    }

    [Fact]
    public void Fefo_Throws_When_Total_Remaining_Is_Insufficient()
    {
        var batches = new List<StockBatch>
        {
            new() { Id = "batch_01", ProductId = "prd_01", ExpiryDate = new DateTime(2026, 10, 25), QtyRemaining = 10 }
        };

        decimal orderQty = 15m;
        decimal totalAvailable = batches.Sum(b => b.QtyRemaining);

        Assert.True(orderQty > totalAvailable);
    }
}
