import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  html: string
}

export interface IShare extends Document {
  shareId: string
  title: string
  sourceUrl: string
  messages: IMessage[]
  createdAt: Date
  expiresAt: Date | null
  viewCount: number
}

const MessageSchema = new Schema<IMessage>({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  html: { type: String, default: '' } // HTML rendering is done client-side
}, { _id: false })

const ShareSchema = new Schema<IShare>({
  shareId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, maxlength: 500 },
  sourceUrl: { type: String, required: true, maxlength: 2000 },
  messages: { type: [MessageSchema], required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  viewCount: { type: Number, default: 0 }
})

ShareSchema.index({ createdAt: 1 })
ShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Share = mongoose.model<IShare>('Share', ShareSchema)
