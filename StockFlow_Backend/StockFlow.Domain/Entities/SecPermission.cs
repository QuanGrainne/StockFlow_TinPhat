using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class SecPermission
{
    public int PermissionId { get; set; }

    public string? PermissionCode { get; set; }

    public string? PermissionName { get; set; }

    public string? Module { get; set; }

    public string? Description { get; set; }

    public virtual ICollection<SecRole> Roles { get; set; } = new List<SecRole>();
}

