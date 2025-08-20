export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface DocumentSet {
  id: string
  name: string
  description: string
  createdAt: string
  userId: string
  documentCount: number
}

export interface Document {
  id: string
  setId: string
  filename: string
  mime: string
  sizeBytes: number
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
