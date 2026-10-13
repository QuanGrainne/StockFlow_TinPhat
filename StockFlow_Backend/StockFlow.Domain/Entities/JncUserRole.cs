using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class JncUserRole
{
    public int UserId { get; set; }

    public int RoleId { get; set; }

    public DateTime? AssignedAt { get; set; }

    public virtual SecRole Role { get; set; } = null!;

    public virtual SecUser User { get; set; } = null!;
}

