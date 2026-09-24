/**
 * Safe response parsing for client-side `fetch()` calls.
 *
 * A raw `await res.json()` throws a cryptic browser parse error
 * ("Unexpected token '<'... is not valid JSON") whenever the response body
 * isn't actually JSON — which happens whenever something in front of the app
 * (a reverse proxy, a gateway timeout, an infra-level error page) returns its
 * own HTML instead of ever reaching our route handlers. Route handlers in
 * this app always return JSON on every path, so a non-JSON response means the
 * request never got there — surface that distinction to the user instead of
 * leaking the parse exception.
 */
export async function parseJsonSafely(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Máy chủ trả về phản hồi không hợp lệ (HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}) — ` +
        'có thể file quá lớn, kết nối bị gián đoạn, hoặc máy chủ đang gặp sự cố. Vui lòng thử lại.'
    );
  }
}
