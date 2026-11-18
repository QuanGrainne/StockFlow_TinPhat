using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Infrastructure.Services;

/// <summary>
/// Lưu ảnh hàng hóa thành file trong thư mục Storage:UploadsPath
/// (Docker: /app/uploads gắn volume "uploads"; chạy dev: StockFlow.API/uploads).
/// File đặt tên GUID nên không bao giờ ghi đè; API phục vụ thư mục này ở /api/uploads (Program.cs).
/// </summary>
public sealed class LocalImageStorage : IImageStorage, IDisposable
{
    /// <summary>Dung lượng tối đa một ảnh (tải lên hoặc tải từ link).</summary>
    public const long MaxImageBytes = 5 * 1024 * 1024;
    private const string ProductsFolder = "products";

    private readonly string _rootPath;
    private readonly HttpClient _http;
    private readonly ILogger<LocalImageStorage> _logger;

    public LocalImageStorage(IConfiguration configuration, ILogger<LocalImageStorage> logger)
    {
        _logger = logger;
        var configured = configuration["Storage:UploadsPath"];
        _rootPath = Path.GetFullPath(string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(AppContext.BaseDirectory, "uploads")
            : configured);
        Directory.CreateDirectory(_rootPath);

        var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = true,
            MaxAutomaticRedirections = 3,
            ConnectTimeout = TimeSpan.FromSeconds(10),
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            AutomaticDecompression = DecompressionMethods.All,
            // Chỉ cho kết nối tới địa chỉ Internet công khai (kể cả sau chuyển hướng),
            // tránh link trong file Excel trỏ vào mạng nội bộ của VPS (db, 127.0.0.1...)
            ConnectCallback = ConnectToPublicAddressAsync
        };
        _http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(20) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("StockFlow-ImageImporter/1.0");
        _http.DefaultRequestHeaders.Accept.ParseAdd("image/*");
    }

    public async Task<ImageStoreResult> StoreAsync(string? value, CancellationToken cancellationToken = default)
    {
        if (value == null) return new ImageStoreResult(null);

        var trimmed = value.Trim();
        if (trimmed.Length == 0) return new ImageStoreResult(string.Empty);

        // Ảnh đã lưu trên máy chủ: giữ nguyên
        if (trimmed.StartsWith(IImageStorage.PublicPathPrefix + "/", StringComparison.OrdinalIgnoreCase))
        {
            return new ImageStoreResult(trimmed);
        }

        // Ảnh tải lên từ máy (FileReader.readAsDataURL)
        if (trimmed.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return await StoreDataUrlAsync(trimmed, cancellationToken);
        }

        // Link ảnh ngoài (KiotViet...): tải về để không phụ thuộc nguồn gốc
        var link = FirstHttpLink(trimmed);
        if (link != null)
        {
            return await DownloadAsync(link, cancellationToken);
        }

        // Giá trị khác (không phải ảnh nhận dạng được): giữ nguyên như trước đây
        return new ImageStoreResult(trimmed);
    }

    private async Task<ImageStoreResult> StoreDataUrlAsync(string dataUrl, CancellationToken cancellationToken)
    {
        var comma = dataUrl.IndexOf(',');
        if (comma < 0 || dataUrl.IndexOf(";base64", 0, comma, StringComparison.OrdinalIgnoreCase) < 0)
        {
            return Reject("Ảnh tải lên không đúng định dạng.");
        }

        var payload = dataUrl[(comma + 1)..];
        if ((long)payload.Length * 3 / 4 > MaxImageBytes)
        {
            return Reject($"Ảnh vượt quá {MaxImageBytes / 1024 / 1024} MB.");
        }

        var buffer = new byte[payload.Length * 3 / 4 + 3];
        if (!Convert.TryFromBase64String(payload, buffer, out var written))
        {
            return Reject("Dữ liệu ảnh bị lỗi, không đọc được.");
        }

        var bytes = buffer.AsMemory(0, written);
        var extension = DetectExtension(bytes.Span);
        if (extension == null)
        {
            return Reject("Chỉ hỗ trợ ảnh JPG, PNG, GIF hoặc WEBP.");
        }

        return new ImageStoreResult(await SaveAsync(bytes, extension, cancellationToken));
    }

    private async Task<ImageStoreResult> DownloadAsync(Uri uri, CancellationToken cancellationToken)
    {
        var original = uri.ToString();
        try
        {
            using var response = await _http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return DownloadFailed(original, $"máy chủ ảnh trả lỗi {(int)response.StatusCode}");
            }
            if (response.Content.Headers.ContentLength > MaxImageBytes)
            {
                return DownloadFailed(original, "ảnh lớn hơn 5 MB");
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var memory = new MemoryStream();
            var chunk = new byte[81920];
            int read;
            while ((read = await stream.ReadAsync(chunk, cancellationToken)) > 0)
            {
                if (memory.Length + read > MaxImageBytes)
                {
                    return DownloadFailed(original, "ảnh lớn hơn 5 MB");
                }
                memory.Write(chunk, 0, read);
            }

            var bytes = memory.GetBuffer().AsMemory(0, (int)memory.Length);
            var extension = DetectExtension(bytes.Span);
            if (extension == null)
            {
                return DownloadFailed(original, "link không phải ảnh JPG/PNG/GIF/WEBP");
            }

            return new ImageStoreResult(await SaveAsync(bytes, extension, cancellationToken));
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return DownloadFailed(original, "quá thời gian tải");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Không tải được ảnh {Url}", original);
            return DownloadFailed(original, "không kết nối được máy chủ ảnh");
        }
    }

    private async Task<string> SaveAsync(ReadOnlyMemory<byte> bytes, string extension, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var relativeFolder = Path.Combine(ProductsFolder, now.ToString("yyyy"), now.ToString("MM"));
        var folder = Path.Combine(_rootPath, relativeFolder);
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        await using (var file = new FileStream(Path.Combine(folder, fileName), FileMode.CreateNew, FileAccess.Write))
        {
            await file.WriteAsync(bytes, cancellationToken);
        }

        return $"{IImageStorage.PublicPathPrefix}/{ProductsFolder}/{now:yyyy}/{now:MM}/{fileName}";
    }

    /// <summary>Nhận dạng ảnh theo byte đầu file (không tin phần mở rộng hay Content-Type); không nhận SVG.</summary>
    private static string? DetectExtension(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return ".jpg";
        if (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
            && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return ".png";
        if (b.Length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
            && (b[4] == '7' || b[4] == '9') && b[5] == 'a') return ".gif";
        if (b.Length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return ".webp";
        return null;
    }

    /// <summary>Ô "Hình ảnh" của file KiotViet có thể chứa nhiều link cách nhau dấu phẩy: lấy link http(s) đầu tiên.</summary>
    private static Uri? FirstHttpLink(string value)
    {
        foreach (var part in value.Split([',', ';', ' ', '\n', '\r', '\t'], StringSplitOptions.RemoveEmptyEntries))
        {
            if (Uri.TryCreate(part, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                return uri;
            }
        }
        return null;
    }

    private static async ValueTask<Stream> ConnectToPublicAddressAsync(SocketsHttpConnectionContext context, CancellationToken cancellationToken)
    {
        var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, cancellationToken);
        var allowed = addresses.Where(IsPublicAddress).ToArray();
        if (allowed.Length == 0)
        {
            throw new HttpRequestException($"Địa chỉ '{context.DnsEndPoint.Host}' thuộc mạng nội bộ, không được tải ảnh.");
        }

        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            await socket.ConnectAsync(allowed, context.DnsEndPoint.Port, cancellationToken);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }

    private static bool IsPublicAddress(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (IPAddress.IsLoopback(ip)) return false;

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            return !(b[0] == 0 || b[0] == 10 || b[0] == 127
                || (b[0] == 100 && b[1] >= 64 && b[1] <= 127)   // CGNAT
                || (b[0] == 169 && b[1] == 254)                  // link-local
                || (b[0] == 172 && b[1] >= 16 && b[1] <= 31)     // mạng riêng (gồm mạng Docker)
                || (b[0] == 192 && b[1] == 168)
                || b[0] >= 224);                                  // multicast / dành riêng
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast || ip.Equals(IPAddress.IPv6Any))
            {
                return false;
            }
            return (ip.GetAddressBytes()[0] & 0xFE) != 0xFC;    // fc00::/7 (unique local)
        }

        return false;
    }

    private static ImageStoreResult Reject(string message) => new(null, message, Rejected: true);

    private static ImageStoreResult DownloadFailed(string url, string reason) =>
        new(url, $"Không tải được ảnh {(url.Length > 80 ? url[..80] + "…" : url)}: {reason}");

    public void Dispose() => _http.Dispose();
}
