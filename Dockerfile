FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

COPY StudentGradeManager.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:7.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "StudentGradeManager.dll"]
