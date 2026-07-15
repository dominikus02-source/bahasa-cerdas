import { NextResponse } from "next/server";

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  code?: string
  meta?: { page?: number; limit?: number; total?: number }
}

export function ok<T>(data: T, meta?: ApiResponse['meta']): NextResponse {
  return NextResponse.json({ success: true, data, meta })
}

export function err(error: string, code: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error, code }, { status })
}
