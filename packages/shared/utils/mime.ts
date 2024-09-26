// SPDX-License-Identifier: MIT

export async function getMimeType(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    return contentType;
  } catch (error) {
    return null;
  }
}
