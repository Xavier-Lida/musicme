import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { detail: 'Missing audio file in "file" field.' },
      { status: 400 },
    );
  }

  const upstream = new FormData();
  upstream.append('file', file, file instanceof File ? file.name : 'recording.wav');

  const options = form.get('options');
  if (typeof options === 'string') {
    upstream.append('options', options);
  }

  const res = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: upstream,
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
