$ErrorActionPreference = 'Stop'
$reviewRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $reviewRoot '../../../..')).Path
$mavenCache = Join-Path $env:USERPROFILE '.m2/repository'
$reviewJava = 'C:/Program Files/Java/jdk-21/bin'
$coordinates = @(
  'org/projectlombok/lombok/1.18.36/lombok-1.18.36.jar',
  'org/apache/tomcat/embed/tomcat-embed-core/10.1.34/tomcat-embed-core-10.1.34.jar',
  'org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar'
)
foreach ($module in @('aop','beans','context','core','expression','jcl','web','webmvc','test')) {
  $coordinates += "org/springframework/spring-$module/6.2.1/spring-$module-6.2.1.jar"
}
foreach ($module in @('config','core','crypto','web')) {
  $coordinates += "org/springframework/security/spring-security-$module/6.4.2/spring-security-$module-6.4.2.jar"
}
foreach ($module in @('observation','commons')) {
  $coordinates += "io/micrometer/micrometer-$module/1.14.2/micrometer-$module-1.14.2.jar"
}
foreach ($module in @('api','impl','jackson')) {
  $coordinates += "io/jsonwebtoken/jjwt-$module/0.12.6/jjwt-$module-0.12.6.jar"
}
foreach ($module in @('core','annotations','databind')) {
  $coordinates += "com/fasterxml/jackson/core/jackson-$module/2.18.2/jackson-$module-2.18.2.jar"
}
$reviewClasspath = ($coordinates | ForEach-Object { (Resolve-Path -LiteralPath (Join-Path $mavenCache $_)).Path }) -join ';'
$sourceDir = Join-Path $reviewRoot 'partner-source'
$classesDir = Join-Path $reviewRoot 'partner-classes'
New-Item -ItemType Directory -Force -Path $sourceDir,$classesDir | Out-Null
$files = @('config/SecurityConfig.java','security/JwtAuthenticationFilter.java','security/JwtService.java','security/UserPrincipal.java')
$snapshots = foreach ($file in $files) {
  $source = Join-Path $repoRoot "Backend/Partner-Service/src/main/java/br/com/easypet/partner/$file"
  $dest = Join-Path $sourceDir ([IO.Path]::GetFileName($file))
  Copy-Item -LiteralPath $source -Destination $dest
  [PSCustomObject]@{path=$source;sha256=(Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash}
}
$snapshots | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reviewRoot 'partner-security-snapshot.json')
$reviewSources = @(Get-ChildItem -LiteralPath $sourceDir -Filter *.java | Select-Object -ExpandProperty FullName)
$reviewSources += Join-Path $reviewRoot 'PartnerSecurityProbe.java'
& (Join-Path $reviewJava 'javac.exe') -encoding UTF-8 -parameters -cp $reviewClasspath -d $classesDir $reviewSources
if ($LASTEXITCODE -ne 0) { throw 'Isolated compilation failed' }
& (Join-Path $reviewJava 'java.exe') -cp "$classesDir;$reviewClasspath" PartnerSecurityProbe 2>&1 | Tee-Object -FilePath (Join-Path $reviewRoot 'partner-security-result.txt')
if ($LASTEXITCODE -ne 0) { throw 'Isolated security probe failed' }
