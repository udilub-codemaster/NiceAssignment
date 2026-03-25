export function getCurlExecutable(): string {
  // Windows provides `curl.exe` while Linux/macOS typically expose `curl` on PATH.
  return process.platform === 'win32' ? 'curl.exe' : 'curl';
}

export function buildCurlErrorBody(body: string): string {
  const head = body.slice(0, 600);
  const tail = body.length > 600 ? body.slice(-400) : '';
  return tail ? `${head}\n...[tail]...\n${tail}` : head;
}

export function parseCurlStdoutForHttpStatus(stdout: string): { statusCode: number; body: string } {
  // The accounts API curl helpers append the HTTP status code as the last line:
  //   <response-body>\n%{http_code}
  const match = stdout.match(/(\d{3})\s*$/);
  if (!match || match.index === undefined) {
    throw new Error(`curl did not return an HTTP status code. Tail: "${stdout.slice(-80)}"`);
  }

  const statusCode = Number(match[1]);
  const body = stdout.slice(0, match.index).trim();
  return { statusCode, body };
}

