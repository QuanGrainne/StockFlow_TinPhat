using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class SecRole
{
    public int RoleId { get; set; }

    public string? RoleName { get; set; }

    public string? Description { get; set; }

    public virtual ICollection<JncUserRole> JncUserRoles { get; set; } = new List<JncUserRole>();

    public virtual ICollection<SecPermission> Permissions { get; set; } = new List<SecPermission>();
}

