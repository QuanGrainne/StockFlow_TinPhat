namespace StockFlow.Domain.Common;

/// <summary>
/// Extends BaseEntity with creator/modifier tracking.
/// </summary>
public abstract class AuditableEntity : BaseEntity
{
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
