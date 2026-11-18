# syntax=docker/dockerfile:1
# StockFlow API (ASP.NET Core 9) — image chạy trong Docker Compose (deploy/compose.yml).
# Cấu hình (chuỗi kết nối, khoá JWT) truyền qua biến môi trường, không đóng gói appsettings.Development.json.

# Build: restore theo các file .csproj trước để sửa code không phải tải lại package.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY StockFlow.sln ./
COPY StockFlow.Domain/StockFlow.Domain.csproj StockFlow.Domain/
COPY StockFlow.Application/StockFlow.Application.csproj StockFlow.Application/
COPY StockFlow.Infrastructure/StockFlow.Infrastructure.csproj StockFlow.Infrastructure/
COPY StockFlow.API/StockFlow.API.csproj StockFlow.API/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore StockFlow.API/StockFlow.API.csproj
COPY . .
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish StockFlow.API/StockFlow.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

# Runtime: chỉ ASP.NET runtime, chạy bằng user không phải root (user "app" có sẵn trong image).
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Docker \
    DOTNET_RUNNING_IN_CONTAINER=true
COPY --from=build --chown=app:app /app/publish ./
# Thư mục ảnh hàng hóa (gắn volume "uploads" trong compose). Tạo sẵn và giao cho user app
# để volume mới tạo nhận đúng quyền ghi.
RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "StockFlow.API.dll"]
