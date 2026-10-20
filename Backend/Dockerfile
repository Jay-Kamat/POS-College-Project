# Multi-stage Dockerfile for POS & Billing System Backend (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY ["Backend/PosBackend.csproj", "Backend/"]
RUN dotnet restore "Backend/PosBackend.csproj"

# Copy source code and publish
COPY Backend/ Backend/
WORKDIR "/src/Backend"
RUN dotnet build "PosBackend.csproj" -c Release -o /app/build
RUN dotnet publish "PosBackend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5000

ENTRYPOINT ["dotnet", "PosBackend.dll"]
