import type { ShareRequest, ShareResponse } from "~src/types"

const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'https://api.selectchatgpt.jiun.dev'

export async function createShare(data: ShareRequest): Promise<ShareResponse> {
  const response = await fetch(`${API_BASE_URL}/api/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create share' }))
    throw new Error(error.message || 'Failed to create share')
  }

  return response.json()
}

export async function getShare(id: string): Promise<ShareResponse> {
  const response = await fetch(`${API_BASE_URL}/api/shares/${id}`)

  if (!response.ok) {
    throw new Error('Share not found')
  }

  return response.json()
}
